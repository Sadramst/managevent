/**
 * @managevent/worker
 *
 * pg-boss background worker: job registry, `lead.created` emails, `headcount.changed`
 * recommendations and `invitation.email_campaign` sends.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PgBoss from "pg-boss";
import {
  type CampaignSweepJobResult,
  CampaignSweepJobSchema,
  createCampaignSweepJob,
} from "./jobs/campaign-sweep.js";
import {
  createEmailCampaignJob,
  type EmailCampaignJobData,
  type EmailCampaignJobResult,
  EmailCampaignJobSchema,
} from "./jobs/email-campaign.js";
import {
  createHeadcountChangedJob,
  type HeadcountChangedJobData,
  type HeadcountChangedJobResult,
  HeadcountChangedJobSchema,
} from "./jobs/headcount-changed.js";
import {
  createLeadCreatedJob,
  hashAddressForAnalytics,
  type LeadCreatedJobData,
  type LeadCreatedJobResult,
  LeadCreatedJobSchema,
} from "./jobs/lead-created.js";
import {
  createResendAdapterFromEnv,
  isEmailConfigured,
  ResendAdapter,
  ResendDeliveryError,
  type ResendEmailAdapter,
  type ResendEmailPayload,
} from "./lib/resend.js";
import {
  createUnsubscribeToken,
  hashEmailAddress,
  verifyUnsubscribeToken,
} from "./lib/unsubscribe-token.js";
import { type JobDefinition, type JobRetryPolicy, WorkerJobRegistry } from "./registry.js";
import { WORKER_SCHEDULES, type WorkerCronSchedule } from "./schedules.js";

export {
  type CampaignSweepJobResult,
  CampaignSweepJobSchema,
  createCampaignSweepJob,
  createEmailCampaignJob,
  createHeadcountChangedJob,
  createLeadCreatedJob,
  createResendAdapterFromEnv,
  createUnsubscribeToken,
  type EmailCampaignJobData,
  type EmailCampaignJobResult,
  EmailCampaignJobSchema,
  hashAddressForAnalytics,
  hashEmailAddress,
  type HeadcountChangedJobData,
  type HeadcountChangedJobResult,
  HeadcountChangedJobSchema,
  isEmailConfigured,
  type JobDefinition,
  type JobRetryPolicy,
  type LeadCreatedJobData,
  type LeadCreatedJobResult,
  LeadCreatedJobSchema,
  ResendAdapter,
  ResendDeliveryError,
  type ResendEmailAdapter,
  type ResendEmailPayload,
  verifyUnsubscribeToken,
  WORKER_SCHEDULES,
  type WorkerCronSchedule,
  WorkerJobRegistry,
};

/**
 * Creates a `WorkerJobRegistry` with every job registered.
 *
 * Email jobs use the real Resend adapter when `RESEND_API_KEY` is set and otherwise record that
 * email is not configured. `emailAdapter` replaces the adapter in tests.
 *
 * `enqueueCampaign` is how the campaign sweep puts a stranded campaign back in the queue. The
 * sweep is registered only when it is given, because without a queue it could do nothing.
 */
export function createDefaultWorkerRegistry(options?: {
  emailAdapter?: ResendEmailAdapter;
  enqueueCampaign?: (campaignId: string) => Promise<void>;
}): WorkerJobRegistry {
  const emailOptions = options?.emailAdapter ? { emailAdapter: options.emailAdapter } : {};
  const registry = new WorkerJobRegistry();
  registry.register(createLeadCreatedJob(emailOptions));
  registry.register(createHeadcountChangedJob());
  registry.register(createEmailCampaignJob(emailOptions));
  if (options?.enqueueCampaign) {
    registry.register(createCampaignSweepJob({ enqueueCampaign: options.enqueueCampaign }));
  }
  return registry;
}

/**
 * Starts the cron schedules whose job is registered and returns their names. A schedule without a
 * job (declared for work that is not built yet) is left alone. Call after `bindToPgBoss`, which
 * creates the queues.
 */
export async function scheduleRegisteredJobs(
  boss: PgBoss,
  registry: WorkerJobRegistry,
  schedules: readonly WorkerCronSchedule[] = WORKER_SCHEDULES,
): Promise<string[]> {
  const started: string[] = [];
  for (const schedule of schedules) {
    if (!registry.getDefinition(schedule.name)) continue;
    // An empty object, not null: every job payload goes through its Zod schema.
    await boss.schedule(schedule.name, schedule.cron, {}, { tz: schedule.timeZone });
    started.push(schedule.name);
  }
  return started;
}

/**
 * Starts the pg-boss worker process against `DATABASE_URL`.
 */
export async function startWorker(
  connectionString: string = process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/managevent",
) {
  const boss = new PgBoss(connectionString);
  await boss.start();
  const registry = createDefaultWorkerRegistry({
    enqueueCampaign: async (campaignId) => {
      // The same job and singleton key the API uses, so a campaign is never queued twice.
      await boss.send(
        "invitation.email_campaign",
        { campaignId },
        { singletonKey: `campaign:${campaignId}` },
      );
    },
  });
  await registry.bindToPgBoss(boss);
  await scheduleRegisteredJobs(boss, registry);
  return { boss, registry };
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isMainModule) {
  startWorker()
    .then(({ registry }) => {
      console.info(
        JSON.stringify({
          level: "info",
          msg: "Managevent worker started",
          jobs: registry.listJobNames(),
          emailConfigured: isEmailConfigured(),
        }),
      );
    })
    .catch((err: unknown) => {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "Failed to start Managevent worker",
          error: err instanceof Error ? err.name : "UnknownError",
        }),
      );
      process.exit(1);
    });
}
