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
  sendEmail(payload: ResendEmailPayload, idempotencyKey?: string): Promise<{ id: string }>;
}

export class ProductionResendAdapter implements ResendEmailAdapter {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async sendEmail(payload: ResendEmailPayload, idempotencyKey?: string): Promise<{ id: string }> {
    if (process.env.RESEND_DOMAIN_VERIFIED !== "true") {
      throw new Error("Resend domain verification must be confirmed before sending email");
    }
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is required");
    const response = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Resend delivery failed (${response.status})`);
    const result: unknown = await response.json();
    if (
      !result ||
      typeof result !== "object" ||
      !("id" in result) ||
      typeof result.id !== "string"
    ) {
      throw new Error("Invalid Resend delivery response");
    }
    return { id: result.id };
  }
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
  const emailAdapter =
    options?.emailAdapter ??
    (process.env.NODE_ENV === "production"
      ? new ProductionResendAdapter()
      : new MockSafeResendAdapter());
  const plannerEmail =
    options?.plannerInboxEmail ?? process.env.LEAD_NOTIFICATION_EMAIL ?? "m.sadra.mst@gmail.com";
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

      await emailAdapter.sendEmail(
        {
          from: fromAddress,
          to: payload.email,
          subject: autoReplySubject,
          text: autoReplyBody,
        },
        `lead-auto-reply:${payload.leadId}`,
      );

      const plannerSubject = t("en", "emails.leadPlannerAlertSubject", {
        name: payload.name,
        source: payload.source,
      });
      const plannerResult = await emailAdapter.sendEmail(
        {
          from: fromAddress,
          to: plannerEmail,
          subject: plannerSubject,
          text: `Lead ID: ${payload.leadId}\nName: ${payload.name}\nEmail: ${payload.email}\nSource: ${payload.source}`,
        },
        `lead-planner-alert:${payload.leadId}`,
      );

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
