/**
 * `lead.created` job: sends a localised auto-reply email to the lead and a notification
 * to Managevent planners via the Resend wrapper, recording an idempotent `Message` row in Postgres.
 */
import { createHash } from "node:crypto";
import { db, type ExtendedDbClient, generateId } from "@managevent/db";
import { t } from "@managevent/i18n";
import { EnabledLocaleSchema, LeadIdSchema, LeadSourceEnum } from "@managevent/validators";
import { z } from "zod";
import type { JobDefinition } from "../registry.js";

export const LeadCreatedJobSchema = z.object({
  leadId: LeadIdSchema,
  name: z.string().min(1),
  email: z.string().email(),
  preferredLanguage: EnabledLocaleSchema.default("en"),
  source: LeadSourceEnum,
  ceremonySlug: z.string().nullable().default(null),
});

export type LeadCreatedJobData = z.infer<typeof LeadCreatedJobSchema>;

export interface ResendEmailPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
}

export interface ResendEmailAdapter {
  sendEmail(payload: ResendEmailPayload): Promise<{ id: string }>;
}

/**
 * Default test-safe Resend email adapter (never calls live external API in local/test mode).
 */
export class MockSafeResendAdapter implements ResendEmailAdapter {
  async sendEmail(payload: ResendEmailPayload): Promise<{ id: string }> {
    const hash = createHash("sha256")
      .update(`${payload.to}:${payload.subject}`)
      .digest("hex")
      .slice(0, 16);
    return { id: `re_msg_${hash}` };
  }
}

export function hashAddressForAnalytics(address: string): string {
  return createHash("sha256").update(address.trim().toLowerCase()).digest("hex");
}

export interface LeadCreatedJobResult {
  alreadySent: boolean;
  autoReplyProviderId: string;
  plannerAlertProviderId?: string;
}

export function createLeadCreatedJob(options?: {
  dbClient?: ExtendedDbClient;
  emailAdapter?: ResendEmailAdapter;
  plannerInboxEmail?: string;
}): JobDefinition<typeof LeadCreatedJobSchema, LeadCreatedJobResult> {
  const client = options?.dbClient ?? db;
  const emailAdapter = options?.emailAdapter ?? new MockSafeResendAdapter();
  const plannerEmail = options?.plannerInboxEmail ?? "planners@managevent.com.au";
  const fromAddress =
    process.env.EMAIL_FROM_TRANSACTIONAL ?? "Managevent <hello@managevent.com.au>";

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
      const idempotentProviderTag = `lead-auto-reply:${payload.leadId}`;
      const existingMsg = await client.message.findFirst({
        where: { providerId: idempotentProviderTag },
      });

      if (existingMsg) {
        return {
          alreadySent: true,
          autoReplyProviderId: existingMsg.providerId,
        };
      }

      const locale = payload.preferredLanguage;
      const autoReplySubject = t(locale, "emails.leadAutoReplySubject");
      const autoReplyBody = t(locale, "emails.leadAutoReplyBody", { name: payload.name });

      await emailAdapter.sendEmail({
        from: fromAddress,
        to: payload.email,
        subject: autoReplySubject,
        text: autoReplyBody,
      });

      const plannerSubject = t("en", "emails.leadPlannerAlertSubject", {
        name: payload.name,
        source: payload.source,
      });
      const plannerResult = await emailAdapter.sendEmail({
        from: fromAddress,
        to: plannerEmail,
        subject: plannerSubject,
        text: `Lead ID: ${payload.leadId} (${payload.source})`,
      });

      await client.message.create({
        data: {
          id: generateId("msg_"),
          channel: "EMAIL",
          to: hashAddressForAnalytics(payload.email),
          templateKey: "emails.leadAutoReply",
          locale,
          status: "SENT",
          providerId: idempotentProviderTag,
          sentAt: new Date(),
        },
      });

      return {
        alreadySent: false,
        autoReplyProviderId: idempotentProviderTag,
        plannerAlertProviderId: plannerResult.id,
      };
    },
  };
}
