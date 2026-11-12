/**
 * `lead.created` job: sends the auto-reply to the person who enquired and an alert with the
 * enquiry details to the planner inbox (`LEAD_NOTIFICATION_EMAIL`), and records each send as a
 * `Message` row.
 *
 * - The payload is the lead id only. The lead is loaded here, so no personal information sits in
 *   the queue tables.
 * - Idempotent: each email has a fixed tag stored in `Message.providerId` and sent to Resend as
 *   the `Idempotency-Key`, so a retry never sends twice.
 * - When email is not configured nothing is sent and a `Message` row with status
 *   `NOT_CONFIGURED` records that. Nothing is ever reported as sent that was not.
 * - There is no default planner address: without `LEAD_NOTIFICATION_EMAIL` only the auto-reply
 *   goes out.
 */
import { db, type ExtendedDbClient, generateId } from "@managevent/db";
import { t } from "@managevent/i18n";
import { EnabledLocaleSchema, LeadIdSchema } from "@managevent/validators";
import { z } from "zod";
import { formatDayMonthYear } from "../lib/format.js";
import {
  createResendAdapterFromEnv,
  type ResendEmailAdapter,
  transactionalFromAddress,
} from "../lib/resend.js";
import { hashEmailAddress } from "../lib/unsubscribe-token.js";
import type { JobDefinition } from "../registry.js";

/** Extra keys from older producers (name, email, ...) are ignored. */
export const LeadCreatedJobSchema = z.object({
  leadId: LeadIdSchema,
});

export type LeadCreatedJobData = z.infer<typeof LeadCreatedJobSchema>;

/** `sha256(lowercased address)`: what `Message.to` stores instead of the address. */
export function hashAddressForAnalytics(address: string): string {
  return hashEmailAddress(address);
}

export interface LeadCreatedJobResult {
  status: "SENT" | "ALREADY_SENT" | "NOT_CONFIGURED" | "LEAD_NOT_FOUND";
  /** True when this run sent nothing because an earlier run already had. */
  alreadySent: boolean;
  autoReplySent: boolean;
  plannerAlertSent: boolean;
}

const AUTO_REPLY_TEMPLATE = "emails.leadAutoReply";
const PLANNER_ALERT_TEMPLATE = "emails.leadPlannerAlert";
const LOCAL_ADMIN_URL = "http://localhost:3100/admin";

function adminLeadUrl(leadId: string): string {
  const base = (process.env.NEXT_PUBLIC_ADMIN_URL?.trim() || LOCAL_ADMIN_URL).replace(/\/+$/, "");
  return `${base}/leads/${leadId}`;
}

export function createLeadCreatedJob(options?: {
  dbClient?: ExtendedDbClient;
  /** Overrides the Resend adapter (tests). Without it, `RESEND_API_KEY` decides. */
  emailAdapter?: ResendEmailAdapter;
  /** Overrides `LEAD_NOTIFICATION_EMAIL` (tests). */
  plannerInboxEmail?: string;
}): JobDefinition<typeof LeadCreatedJobSchema, LeadCreatedJobResult> {
  const client = options?.dbClient ?? db;

  return {
    name: "lead.created",
    schema: LeadCreatedJobSchema,
    dedupeKey: (payload) => `lead.created:${payload.leadId}`,
    retryPolicy: {
      retryLimit: 3,
      retryDelaySec: 10,
      retryBackoff: true,
      deadLetterQueue: "dlq.lead.created",
    },
    handler: async (payload): Promise<LeadCreatedJobResult> => {
      const lead = await client.lead.findFirst({
        where: { id: payload.leadId, deletedAt: null },
      });
      if (!lead) {
        return {
          status: "LEAD_NOT_FOUND",
          alreadySent: false,
          autoReplySent: false,
          plannerAlertSent: false,
        };
      }

      const replyTag = `lead-auto-reply:${lead.id}`;
      const alertTag = `lead-planner-alert:${lead.id}`;
      const recorded = await client.message.findMany({
        where: { providerId: { in: [replyTag, alertTag] } },
        select: { id: true, providerId: true, status: true },
      });
      const replyRow = recorded.find((row) => row.providerId === replyTag);
      const replyDone = replyRow?.status === "SENT";
      const alertDone = recorded.some(
        (row) => row.providerId === alertTag && row.status === "SENT",
      );

      const parsedLocale = EnabledLocaleSchema.safeParse(lead.preferredLanguage);
      const locale = parsedLocale.success ? parsedLocale.data : "en";

      const emailAdapter = options?.emailAdapter ?? createResendAdapterFromEnv();
      if (!emailAdapter) {
        if (!replyRow) {
          await client.message.create({
            data: {
              id: generateId("msg_"),
              channel: "EMAIL",
              to: hashEmailAddress(lead.email),
              templateKey: AUTO_REPLY_TEMPLATE,
              locale,
              status: "NOT_CONFIGURED",
              providerId: replyTag,
              sentAt: null,
            },
          });
        }
        return {
          status: "NOT_CONFIGURED",
          alreadySent: false,
          autoReplySent: false,
          plannerAlertSent: false,
        };
      }

      const plannerEmail = (
        options?.plannerInboxEmail ??
        process.env.LEAD_NOTIFICATION_EMAIL ??
        ""
      ).trim();
      const alertWanted = plannerEmail.length > 0 && !alertDone;
      if (replyDone && !alertWanted) {
        return {
          status: "ALREADY_SENT",
          alreadySent: true,
          autoReplySent: false,
          plannerAlertSent: false,
        };
      }

      const from = transactionalFromAddress();

      if (!replyDone) {
        await emailAdapter.sendEmail(
          {
            from,
            to: lead.email,
            subject: t(locale, "emails.leadAutoReplySubject"),
            text: t(locale, "emails.leadAutoReplyBody", { name: lead.name }),
          },
          replyTag,
        );
        const sentAt = new Date();
        if (replyRow) {
          // An earlier run recorded NOT_CONFIGURED; email has been set up since.
          await client.message.update({
            where: { id: replyRow.id },
            data: { status: "SENT", sentAt },
          });
        } else {
          await client.message.create({
            data: {
              id: generateId("msg_"),
              channel: "EMAIL",
              to: hashEmailAddress(lead.email),
              templateKey: AUTO_REPLY_TEMPLATE,
              locale,
              status: "SENT",
              providerId: replyTag,
              sentAt,
            },
          });
        }
      }

      if (alertWanted) {
        const notProvided = t("en", "emails.leadValueNotProvided");
        await emailAdapter.sendEmail(
          {
            from,
            to: plannerEmail,
            subject: t("en", "emails.leadPlannerAlertSubject", {
              name: lead.name,
              source: lead.source,
            }),
            text: t("en", "emails.leadPlannerAlertBody", {
              name: lead.name,
              email: lead.email,
              phone: lead.phone ?? notProvided,
              preferredChannel: lead.preferredChannel,
              ceremony: lead.ceremonySlug ?? notProvided,
              eventDate: lead.eventDate ? formatDayMonthYear(lead.eventDate) : notProvided,
              dateFlexible: t(
                "en",
                lead.dateFlexible ? "emails.leadValueYes" : "emails.leadValueNo",
              ),
              guestEstimate: lead.guestEstimate ?? notProvided,
              area: lead.area ?? notProvided,
              source: lead.source,
              message: lead.message?.trim() || notProvided,
              leadUrl: adminLeadUrl(lead.id),
            }),
          },
          alertTag,
        );
        await client.message.create({
          data: {
            id: generateId("msg_"),
            channel: "EMAIL",
            to: hashEmailAddress(plannerEmail),
            templateKey: PLANNER_ALERT_TEMPLATE,
            locale: "en",
            status: "SENT",
            providerId: alertTag,
            sentAt: new Date(),
          },
        });
      }

      return {
        status: "SENT",
        alreadySent: false,
        autoReplySent: !replyDone,
        plannerAlertSent: alertWanted,
      };
    },
  };
}
