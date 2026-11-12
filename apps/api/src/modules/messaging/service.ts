/**
 * Email invitations and RSVP reminders for hosts, plus the public unsubscribe.
 *
 * The API only decides WHO gets an email and records that as a `Campaign`; the worker
 * (`invitation.email_campaign`) sends. Without an email provider nothing is queued and the caller
 * gets `503 EMAIL_NOT_CONFIGURED`: there is no mock transport.
 *
 * A campaign is only reported as queued (202) once its job really is in the queue. If the job
 * cannot be enqueued the caller gets `503 QUEUE_UNAVAILABLE`; the campaign row stays `QUEUED`, a
 * repeat of the request with the same `Idempotency-Key` enqueues it, and the worker's sweep
 * (`invitation.email_campaign_sweep`) picks up any campaign that was left behind.
 */
import type { AuthActor } from "@managevent/auth";
import type {
  EmailCampaignCreate,
  EmailCampaignKind,
  EmailCampaignResult,
  EmailCampaignSkipReason,
  MessagingStatus,
} from "@managevent/validators";
import { type EventAccess, requireEntitlement, requireEventAccess } from "../../lib/access.js";
import { writeAudit } from "../../lib/audit.js";
import type { ApiDeps, DbTx } from "../../lib/deps.js";
import { isEmailConfigured } from "../../lib/email.js";
import { ApiProblem, isUniqueViolation, notFound, unauthenticated } from "../../lib/errors.js";
import { utcToZonedWallTime } from "../../lib/time.js";
import { lockInvitation } from "../guest-list/repo.js";
import * as repo from "./repo.js";
import { hashEmailAddress, verifyUnsubscribeToken } from "./unsubscribe-token.js";

/** Reminders are sent between 08:00 and 20:00 in the event's time zone. */
const QUIET_HOURS_END = 8;
const QUIET_HOURS_START = 20;
const MAX_REMINDERS_PER_ADDRESS = 2;
const STATUS_CAMPAIGN_LIMIT = 20;
const CAMPAIGN_TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;
const CAMPAIGN_STATUSES = ["QUEUED", "SENDING", "SENT", "PARTIAL", "FAILED"] as const;
type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface RequestContext {
  actor: AuthActor | null;
  ip?: string;
}

function emailLimitOf(access: EventAccess): number | null {
  const max = access.effectivePlan.maxEmailInvitations;
  return max === "unlimited" ? null : max;
}

export function isQuietHour(now: Date, timeZone: string): boolean {
  const hour = Number(utcToZonedWallTime(now, timeZone).slice(11, 13));
  return hour < QUIET_HOURS_END || hour >= QUIET_HOURS_START;
}

function toResult(campaignId: string, audience: repo.CampaignAudience): EmailCampaignResult {
  return {
    campaignId,
    queued: audience.recipients.length,
    skipped: audience.skipped,
  };
}

interface AudienceFacts {
  unsubscribed: ReadonlySet<string>;
  /** Address hashes that already have this email, or are about to get it from a queued campaign. */
  sentCount: ReadonlyMap<string, number>;
}

/**
 * Decides, party by party, who receives the email. Pure: all lookups are passed in.
 *
 * - A revoked link is never emailed (`LINK_REVOKED`).
 * - Only guests with an address can be reached (`NO_EMAIL`); an address is used once per party.
 * - Unsubscribed addresses are left out (`UNSUBSCRIBED`).
 * - INVITE: an address that already has the invitation is left out (`ALREADY_SENT`).
 * - REMINDER: only parties with a pending guest (`NOT_PENDING`), at most two per address
 *   (`REMINDER_LIMIT`).
 */
export function selectRecipients(
  kind: EmailCampaignKind,
  parties: readonly repo.AudienceParty[],
  facts: AudienceFacts,
  options: { reportNotPending: boolean },
): repo.CampaignAudience {
  const recipients: repo.CampaignAudience["recipients"] = [];
  const skipped: repo.CampaignAudience["skipped"] = [];
  const skip = (partyId: string, reason: EmailCampaignSkipReason) =>
    skipped.push({ partyId, reason });

  for (const party of parties) {
    if (kind === "REMINDER" && !party.guests.some((guest) => guest.status === "PENDING")) {
      if (options.reportNotPending) skip(party.id, "NOT_PENDING");
      continue;
    }
    if (party.tokenRevokedAt) {
      skip(party.id, "LINK_REVOKED");
      continue;
    }

    const seen = new Set<string>();
    const reachable: Array<{ guestId: string; hash: string }> = [];
    for (const guest of party.guests) {
      if (!guest.email) continue;
      const hash = hashEmailAddress(guest.email);
      if (seen.has(hash)) continue;
      seen.add(hash);
      reachable.push({ guestId: guest.id, hash });
    }
    if (reachable.length === 0) {
      skip(party.id, "NO_EMAIL");
      continue;
    }

    const subscribed = reachable.filter((entry) => !facts.unsubscribed.has(entry.hash));
    if (subscribed.length === 0) {
      skip(party.id, "UNSUBSCRIBED");
      continue;
    }

    const allowance = kind === "INVITE" ? 1 : MAX_REMINDERS_PER_ADDRESS;
    const due = subscribed.filter((entry) => (facts.sentCount.get(entry.hash) ?? 0) < allowance);
    if (due.length === 0) {
      skip(party.id, kind === "INVITE" ? "ALREADY_SENT" : "REMINDER_LIMIT");
      continue;
    }
    for (const entry of due) recipients.push({ partyId: party.id, guestId: entry.guestId });
  }
  return { kind, recipients, skipped };
}

export function createMessagingService(deps: ApiDeps) {
  async function planAudience(
    tx: DbTx,
    access: EventAccess,
    kind: EmailCampaignKind,
    partyIds: EmailCampaignCreate["partyIds"],
  ): Promise<{ audience: repo.CampaignAudience; used: number }> {
    const invitationId = access.invitation.id;
    const parties = await repo.loadAudienceParties(tx, invitationId, partyIds);
    if (partyIds !== "ALL") {
      const found = new Set(parties.map((party) => party.id));
      // An id from another event is indistinguishable from one that does not exist.
      if ([...new Set(partyIds)].some((partyId) => !found.has(partyId))) {
        throw notFound("Party not found");
      }
    }

    const hashes = parties.flatMap((party) =>
      party.guests.flatMap((guest) => (guest.email ? [hashEmailAddress(guest.email)] : [])),
    );
    const templateKey = repo.templateKeyFor(kind);
    const [unsubscribed, sent, inFlight, sentTotal] = await Promise.all([
      repo.findUnsubscribedHashes(tx, hashes),
      repo.countSentByHash(tx, access.event.id, templateKey, hashes),
      repo.loadInFlightCampaigns(tx, invitationId),
      repo.countSentEmails(tx, access.event.id),
    ]);

    // Recipients of campaigns that are still queued count as sent, so two requests in quick
    // succession cannot email the same address twice or slip past the plan quota.
    const sentCount = new Map(sent);
    const queuedGuestIds = inFlight
      .filter((campaign) => campaign.kind === kind)
      .flatMap((campaign) => campaign.guestIds);
    const queuedEmails = await repo.loadGuestEmails(tx, queuedGuestIds);
    for (const guestId of queuedGuestIds) {
      const email = queuedEmails.get(guestId);
      if (!email) continue;
      const hash = hashEmailAddress(email);
      sentCount.set(hash, (sentCount.get(hash) ?? 0) + 1);
    }

    return {
      audience: selectRecipients(
        kind,
        parties,
        { unsubscribed, sentCount },
        { reportNotPending: partyIds !== "ALL" },
      ),
      used: sentTotal + inFlight.reduce((sum, campaign) => sum + campaign.unsent, 0),
    };
  }

  /**
   * Puts the campaign's job in the queue, or fails the request. Telling the host "queued" for a
   * campaign nobody will ever send would leave it `QUEUED` for good, its guests marked as
   * already emailed and its recipients counted against the plan quota.
   */
  async function enqueueCampaign(campaignId: string): Promise<void> {
    try {
      await deps.queue.enqueue(
        "invitation.email_campaign",
        { campaignId },
        { singletonKey: `campaign:${campaignId}`, required: true },
      );
    } catch {
      throw new ApiProblem(
        503,
        "QUEUE_UNAVAILABLE",
        "The emails could not be queued. Send the request again to retry.",
        { campaignId },
      );
    }
  }

  async function createCampaign(
    ctx: RequestContext,
    eventId: string,
    kind: EmailCampaignKind,
    input: EmailCampaignCreate,
    idempotencyKey: string,
    afterAuthorised?: () => Promise<void>,
  ): Promise<EmailCampaignResult> {
    const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:write");
    await afterAuthorised?.();
    if (kind === "REMINDER") requireEntitlement(access, "rsvpReminders");
    if (access.invitation.isDemo) {
      throw new ApiProblem(403, "DEMO_READ_ONLY", "Sample invitations cannot send email");
    }
    const userId = ctx.actor?.userId;
    if (!userId) throw unauthenticated();
    const invitation = access.invitation;
    // Scoped to the invitation and the kind, so a key can never resolve to another event's campaign.
    const storedKey = `${invitation.id}:${kind}:${idempotencyKey}`;

    const replay = async (
      tx: DbTx,
    ): Promise<{ result: EmailCampaignResult; enqueue: boolean } | null> => {
      const existing = await repo.findCampaignByIdempotencyKey(tx, storedKey);
      if (!existing) return null;
      const audience = repo.CampaignAudienceSchema.parse(existing.audienceFilterJson);
      return {
        result: toResult(existing.id, audience),
        // Still waiting for the worker: the first attempt may never have reached the queue.
        // The singleton key makes enqueueing it again harmless when it did.
        enqueue: existing.status === "QUEUED" && audience.recipients.length > 0,
      };
    };
    const replayed = await replay(deps.db);
    if (replayed) {
      if (replayed.enqueue) await enqueueCampaign(replayed.result.campaignId);
      return replayed.result;
    }

    if (!isEmailConfigured()) {
      throw new ApiProblem(503, "EMAIL_NOT_CONFIGURED", "Email sending is not configured");
    }
    if (!invitation.publishedAt) {
      throw new ApiProblem(409, "NOT_PUBLISHED", "Publish the invitation before emailing guests");
    }
    if (kind === "REMINDER") {
      const now = deps.now();
      const closed =
        (invitation.rsvpDeadline !== null && now > invitation.rsvpDeadline) ||
        now >= access.event.startsAt;
      if (closed) {
        throw new ApiProblem(409, "RSVP_CLOSED", "RSVPs are closed, so a reminder cannot help");
      }
      if (isQuietHour(now, access.event.timeZone)) {
        throw new ApiProblem(
          409,
          "QUIET_HOURS",
          "Reminders are sent between 8am and 8pm in the event's time zone",
        );
      }
    }

    let created: { result: EmailCampaignResult; enqueue: boolean };
    try {
      created = await deps.db.$transaction(async (tx) => {
        await lockInvitation(tx, invitation.id);
        const again = await replay(tx);
        if (again) return again;

        const { audience, used } = await planAudience(tx, access, kind, input.partyIds);
        const limit = emailLimitOf(access);
        if (limit !== null && used + audience.recipients.length > limit) {
          throw new ApiProblem(
            403,
            "PLAN_LIMIT_EXCEEDED",
            "The email limit of this plan is reached",
            { limit, used, requested: audience.recipients.length },
          );
        }

        const hasRecipients = audience.recipients.length > 0;
        const campaignId = await repo.createCampaign(tx, {
          invitationId: invitation.id,
          // Nothing to send: the campaign is complete as soon as it exists.
          status: hasRecipients ? "QUEUED" : "SENT",
          consentAttestationUserId: userId,
          idempotencyKey: storedKey,
          audience,
        });
        await writeAudit(tx, {
          actor: ctx.actor,
          action: "campaign.create",
          entity: "Campaign",
          entityId: campaignId,
          // Counts only: no addresses, no names.
          diff: {
            eventId,
            kind,
            queued: audience.recipients.length,
            skipped: audience.skipped.length,
            consentAttested: input.consentAttested,
          },
          ...(ctx.ip ? { ip: ctx.ip } : {}),
        });
        return { result: toResult(campaignId, audience), enqueue: hasRecipients };
      }, CAMPAIGN_TX_OPTIONS);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const raced = await replay(deps.db);
      if (!raced) throw err;
      created = raced;
    }

    if (created.enqueue) await enqueueCampaign(created.result.campaignId);
    return created.result;
  }

  return {
    async getStatus(actor: AuthActor | null, eventId: string): Promise<MessagingStatus> {
      const access = await requireEventAccess(deps, actor, eventId, "guest:read");
      const [campaigns, sent, inFlight] = await Promise.all([
        repo.listCampaigns(deps.db, access.invitation.id, STATUS_CAMPAIGN_LIMIT),
        repo.countSentEmails(deps.db, eventId),
        repo.loadInFlightCampaigns(deps.db, access.invitation.id),
      ]);

      return {
        emailConfigured: isEmailConfigured(),
        remindersEntitled: access.effectivePlan.rsvpReminders,
        quota: {
          limit: emailLimitOf(access),
          // Sent plus queued: what the next request will be measured against.
          used: sent + inFlight.reduce((sum, campaign) => sum + campaign.unsent, 0),
        },
        campaigns: campaigns.flatMap((campaign) => {
          const audience = repo.CampaignAudienceSchema.safeParse(campaign.audienceFilterJson);
          if (!audience.success) return [];
          const status: CampaignStatus = (CAMPAIGN_STATUSES as readonly string[]).includes(
            campaign.status,
          )
            ? (campaign.status as CampaignStatus)
            : "FAILED";
          const total = audience.data.recipients.length;
          const finished = status === "SENT" || status === "PARTIAL" || status === "FAILED";
          // Left out when the campaign was created, plus recipients the worker passed over
          // (for example an address that unsubscribed before the send).
          const passedOver = finished ? Math.max(0, total - campaign.sent - campaign.failed) : 0;
          return [
            {
              id: campaign.id,
              kind: audience.data.kind,
              status,
              createdAt: campaign.createdAt.toISOString(),
              counts: {
                total,
                sent: campaign.sent,
                failed: campaign.failed,
                skipped: audience.data.skipped.length + passedOver,
              },
            },
          ];
        }),
      };
    },

    sendEmailInvitations(
      ctx: RequestContext,
      eventId: string,
      input: EmailCampaignCreate,
      idempotencyKey: string,
      /** Runs once the caller is authorised (the `bulk` rate limit). */
      afterAuthorised?: () => Promise<void>,
    ): Promise<EmailCampaignResult> {
      return createCampaign(ctx, eventId, "INVITE", input, idempotencyKey, afterAuthorised);
    },

    sendRsvpReminders(
      ctx: RequestContext,
      eventId: string,
      input: EmailCampaignCreate,
      idempotencyKey: string,
      /** Runs once the caller is authorised (the `bulk` rate limit). */
      afterAuthorised?: () => Promise<void>,
    ): Promise<EmailCampaignResult> {
      return createCampaign(ctx, eventId, "REMINDER", input, idempotencyKey, afterAuthorised);
    },

    /** Public: the signed token is the authority. Returns false when it is malformed or forged. */
    async unsubscribe(token: string): Promise<boolean> {
      const addressHash = verifyUnsubscribeToken(token);
      if (!addressHash) return false;
      await repo.recordUnsubscribe(deps.db, addressHash);
      return true;
    },
  };
}

export type MessagingService = ReturnType<typeof createMessagingService>;
