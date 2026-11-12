/**
 * `invitation.email_campaign` job: sends the invitation or RSVP reminder emails of one `Campaign`.
 *
 * The API decided who is in the campaign (`audienceFilterJson.recipients`). For each recipient
 * this job re-checks that the guest can still be emailed (not deleted, link not revoked, address
 * not unsubscribed), sends through Resend with `Idempotency-Key: cmp:{campaignId}:{guestId}`, and
 * records the outcome as a `Message` row. `Message.to` is `sha256(address)`, never the address.
 *
 * Safe to run again at any point: a recipient with a `SENT` row for this campaign is not emailed
 * twice, and Resend drops a repeated idempotency key.
 *
 * Nothing is reported as sent that was not: without an email provider, or for a reminder that
 * would go out in quiet hours (before 8am or after 8pm at the event), the campaign is marked
 * `FAILED` with no `Message` rows and the host can send it again.
 *
 * A campaign is never left `SENDING` by a run that died: if the send loop throws, the status
 * goes back to `QUEUED` before the error reaches pg-boss, so the retry (or, once the retries are
 * used up, `invitation.email_campaign_sweep`) runs it again and in the end settles it.
 */
import { db, type ExtendedDbClient, generateId } from "@managevent/db";
import { t, type TranslationKey } from "@managevent/i18n";
import { CampaignIdSchema } from "@managevent/validators";
import { z } from "zod";
import { formatEventDateTime, localHour } from "../lib/format.js";
import {
  createResendAdapterFromEnv,
  invitationsFromAddress,
  ResendDeliveryError,
  type ResendEmailAdapter,
} from "../lib/resend.js";
import { createUnsubscribeToken, hashEmailAddress } from "../lib/unsubscribe-token.js";
import type { JobDefinition } from "../registry.js";

export const EmailCampaignJobSchema = z.object({
  campaignId: CampaignIdSchema,
});

export type EmailCampaignJobData = z.infer<typeof EmailCampaignJobSchema>;

export interface EmailCampaignJobResult {
  status:
    | "SENT"
    | "PARTIAL"
    | "FAILED"
    | "ALREADY_PROCESSED"
    | "NOT_FOUND"
    | "NOT_CONFIGURED"
    | "NOT_SENDABLE"
    | "QUIET_HOURS";
  sent: number;
  failed: number;
  /** Recipients passed over at send time (deleted, link revoked, no address, unsubscribed). */
  skipped: number;
}

/** The part of `Campaign.audienceFilterJson` the worker needs (written by the API). */
const AudienceSchema = z.object({
  kind: z.enum(["INVITE", "REMINDER"]),
  recipients: z.array(z.object({ partyId: z.string(), guestId: z.string() })),
});

const TEMPLATE_KEYS = { INVITE: "invitation.send", REMINDER: "rsvp.reminder" } as const;
const FINISHED_STATUSES: ReadonlySet<string> = new Set(["SENT", "PARTIAL", "FAILED"]);
const LOCAL_INVITATION_URL = "http://localhost:3001";
/** Resend allows two requests a second by default; stay under it. */
const DEFAULT_SEND_INTERVAL_MS = 600;
const QUIET_HOURS_END = 8;
const QUIET_HOURS_START = 20;

const COPY: Record<
  "INVITE" | "REMINDER",
  Record<"CELEBRATION" | "MEMORIAL", { subject: TranslationKey; body: TranslationKey }>
> = {
  INVITE: {
    CELEBRATION: { subject: "emails.invitationSubject", body: "emails.invitationBody" },
    MEMORIAL: {
      subject: "emails.invitationMemorialSubject",
      body: "emails.invitationMemorialBody",
    },
  },
  REMINDER: {
    CELEBRATION: { subject: "emails.rsvpReminderSubject", body: "emails.rsvpReminderBody" },
    MEMORIAL: {
      subject: "emails.rsvpReminderMemorialSubject",
      body: "emails.rsvpReminderMemorialBody",
    },
  },
};

/** Localised text is stored as `{ en: string }` JSON. */
function fromLocalized(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  if (typeof record.en === "string") return record.en;
  return Object.values(record).find((entry): entry is string => typeof entry === "string") ?? "";
}

function hostsOf(contentJson: unknown): string {
  if (typeof contentJson === "object" && contentJson !== null && !Array.isArray(contentJson)) {
    const hosts = (contentJson as Record<string, unknown>).hosts;
    if (typeof hosts === "string" && hosts.trim().length > 0) return hosts.trim();
  }
  return t("en", "emails.invitationHostsFallback");
}

function invitationBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_INVITATION_URL?.trim() || LOCAL_INVITATION_URL).replace(
    /\/+$/,
    "",
  );
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export function createEmailCampaignJob(options?: {
  dbClient?: ExtendedDbClient;
  /** Overrides the Resend adapter (tests). Without it, `RESEND_API_KEY` decides. */
  emailAdapter?: ResendEmailAdapter;
  now?: () => Date;
  /** Pause between sends; 0 in tests. */
  sendIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}): JobDefinition<typeof EmailCampaignJobSchema, EmailCampaignJobResult> {
  const client = options?.dbClient ?? db;
  const now = options?.now ?? (() => new Date());
  const sendIntervalMs = options?.sendIntervalMs ?? DEFAULT_SEND_INTERVAL_MS;
  const sleep = options?.sleep ?? defaultSleep;

  return {
    name: "invitation.email_campaign",
    schema: EmailCampaignJobSchema,
    dedupeKey: (payload) => `campaign:${payload.campaignId}`,
    retryPolicy: {
      retryLimit: 3,
      retryDelaySec: 30,
      retryBackoff: true,
      deadLetterQueue: "dlq.invitation.email_campaign",
      // 500 recipients at the paced send rate take about five minutes; leave generous room.
      expireInSeconds: 30 * 60,
    },
    handler: async (payload): Promise<EmailCampaignJobResult> => {
      const campaign = await client.campaign.findUnique({
        where: { id: payload.campaignId },
        include: { invitation: { include: { event: true } } },
      });
      if (!campaign || campaign.channel !== "EMAIL") {
        return { status: "NOT_FOUND", sent: 0, failed: 0, skipped: 0 };
      }

      const tally = async (): Promise<{ sent: number; failed: number }> => {
        const [sent, failed] = await Promise.all([
          client.message.count({ where: { campaignId: campaign.id, status: "SENT" } }),
          client.message.count({ where: { campaignId: campaign.id, status: "FAILED" } }),
        ]);
        return { sent, failed };
      };
      if (FINISHED_STATUSES.has(campaign.status)) {
        return { status: "ALREADY_PROCESSED", ...(await tally()), skipped: 0 };
      }

      const fail = async (
        status: "NOT_CONFIGURED" | "NOT_SENDABLE" | "QUIET_HOURS",
      ): Promise<EmailCampaignJobResult> => {
        await client.campaign.update({ where: { id: campaign.id }, data: { status: "FAILED" } });
        return { status, sent: 0, failed: 0, skipped: 0 };
      };

      const audience = AudienceSchema.safeParse(campaign.audienceFilterJson);
      const { invitation } = campaign;
      const { event } = invitation;
      if (!audience.success || invitation.deletedAt || event.deletedAt || !invitation.publishedAt) {
        // The link in the email would not open, so do not send it.
        return fail("NOT_SENDABLE");
      }
      const { kind, recipients } = audience.data;

      const emailAdapter = options?.emailAdapter ?? createResendAdapterFromEnv();
      if (!emailAdapter) return fail("NOT_CONFIGURED");

      if (kind === "REMINDER") {
        const hour = localHour(now(), event.timeZone);
        if (hour < QUIET_HOURS_END || hour >= QUIET_HOURS_START) return fail("QUIET_HOURS");
      }

      const sendAll = async (): Promise<EmailCampaignJobResult> => {
        const guests = await client.guest.findMany({
          where: { id: { in: recipients.map((recipient) => recipient.guestId) }, deletedAt: null },
          select: {
            id: true,
            email: true,
            party: {
              select: {
                id: true,
                invitationId: true,
                displayName: true,
                token: true,
                tokenRevokedAt: true,
                deletedAt: true,
              },
            },
          },
        });
        const guestById = new Map(guests.map((guest) => [guest.id, guest]));

        const hashes = guests.flatMap((guest) =>
          guest.email ? [hashEmailAddress(guest.email)] : [],
        );
        const [unsubscribes, earlier] = await Promise.all([
          hashes.length > 0
            ? client.unsubscribe.findMany({
                where: { channel: "EMAIL", address: { in: hashes } },
                select: { address: true },
              })
            : [],
          client.message.findMany({
            where: { campaignId: campaign.id },
            select: { id: true, to: true, status: true, providerId: true },
          }),
        ]);
        const unsubscribed = new Set(unsubscribes.map((row) => row.address));
        // From an earlier, interrupted run of this job.
        const alreadySent = new Map<string, number>();
        const failedRowByProviderId = new Map<string, string>();
        for (const message of earlier) {
          if (message.status === "SENT") {
            alreadySent.set(message.to, (alreadySent.get(message.to) ?? 0) + 1);
          } else if (message.status === "FAILED") {
            failedRowByProviderId.set(message.providerId, message.id);
          }
        }

        const mode = event.experienceMode === "MEMORIAL" ? "MEMORIAL" : "CELEBRATION";
        const copy = COPY[kind][mode];
        const eventTitle = fromLocalized(event.title);
        const eventDate = formatEventDateTime(event.startsAt, event.timeZone);
        const hosts = hostsOf(invitation.contentJson);
        const subject = t("en", copy.subject, { eventTitle });
        const deadlineLine =
          kind === "REMINDER" && invitation.rsvpDeadline
            ? `\n\n${t("en", "emails.rsvpReminderDeadline", {
                deadline: formatEventDateTime(invitation.rsvpDeadline, event.timeZone),
              })}`
            : "";
        const baseUrl = invitationBaseUrl();
        const from = invitationsFromAddress();
        const templateKey = TEMPLATE_KEYS[kind];

        let sent = 0;
        let failed = 0;
        let skipped = 0;
        let sentThisRun = 0;
        let lastFailure: string | null = null;

        for (const recipient of recipients) {
          const guest = guestById.get(recipient.guestId);
          if (
            !guest ||
            !guest.email ||
            guest.party.id !== recipient.partyId ||
            guest.party.invitationId !== invitation.id ||
            guest.party.deletedAt ||
            guest.party.tokenRevokedAt
          ) {
            skipped += 1;
            continue;
          }
          const hash = hashEmailAddress(guest.email);
          if (unsubscribed.has(hash)) {
            skipped += 1;
            continue;
          }
          const earlierSends = alreadySent.get(hash) ?? 0;
          if (earlierSends > 0) {
            alreadySent.set(hash, earlierSends - 1);
            sent += 1;
            continue;
          }

          const inviteUrl = `${baseUrl}/i/${invitation.eventSlug}/${guest.party.token}`;
          const unsubscribeUrl = `${baseUrl}/unsubscribe?t=${createUnsubscribeToken(hash)}`;
          const text = `${t("en", copy.body, {
            partyName: fromLocalized(guest.party.displayName),
            hosts,
            eventTitle,
            eventDate,
            inviteUrl,
          })}${deadlineLine}\n\n--\n${t("en", "emails.unsubscribeFooter", { unsubscribeUrl })}`;

          const failedProviderId = `failed:${campaign.id}:${guest.id}`;
          const failedRowId = failedRowByProviderId.get(failedProviderId);
          if (sentThisRun > 0 && sendIntervalMs > 0) await sleep(sendIntervalMs);
          sentThisRun += 1;

          let providerId: string | null = null;
          try {
            const delivery = await emailAdapter.sendEmail(
              { from, to: guest.email, subject, text },
              `cmp:${campaign.id}:${guest.id}`,
            );
            providerId = delivery.id;
          } catch (err) {
            // Only the kind of failure is kept: the provider's answer can contain the address.
            providerId = null;
            lastFailure = err instanceof ResendDeliveryError ? `HTTP ${err.status}` : "ERROR";
          }

          if (providerId) {
            const data = { status: "SENT", providerId, sentAt: now() };
            if (failedRowId) {
              await client.message.update({ where: { id: failedRowId }, data });
            } else {
              await client.message.create({
                data: {
                  id: generateId("msg_"),
                  channel: "EMAIL",
                  to: hash,
                  templateKey,
                  locale: "en",
                  eventId: event.id,
                  campaignId: campaign.id,
                  ...data,
                },
              });
            }
            sent += 1;
          } else {
            if (!failedRowId) {
              await client.message.create({
                data: {
                  id: generateId("msg_"),
                  channel: "EMAIL",
                  to: hash,
                  templateKey,
                  locale: "en",
                  eventId: event.id,
                  campaignId: campaign.id,
                  status: "FAILED",
                  providerId: failedProviderId,
                  sentAt: null,
                },
              });
            }
            failed += 1;
          }
        }

        const status = failed === 0 ? "SENT" : sent === 0 ? "FAILED" : "PARTIAL";
        await client.campaign.update({ where: { id: campaign.id }, data: { status } });
        if (failed > 0 && process.env.NODE_ENV !== "test") {
          // Counts and the provider status only: no address, link or name.
          console.warn(
            JSON.stringify({
              level: "warn",
              msg: "email campaign finished with failed deliveries",
              campaignId: campaign.id,
              sent,
              failed,
              skipped,
              lastFailure,
            }),
          );
        }
        return { status, sent, failed, skipped };
      };

      await client.campaign.update({ where: { id: campaign.id }, data: { status: "SENDING" } });
      try {
        return await sendAll();
      } catch (err) {
        // The database or the process gave way mid-send. `SENDING` would be a lie from here on,
        // and nothing would ever move the campaign out of it.
        await client.campaign
          .update({ where: { id: campaign.id }, data: { status: "QUEUED" } })
          .catch(() => undefined);
        throw err;
      }
    },
  };
}
