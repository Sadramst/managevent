/**
 * @managevent/worker
 *
 * pg-boss background worker, job registry, `lead.created` email job, and `headcount.changed` recommendation job.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PgBoss from "pg-boss";
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
  MockSafeResendAdapter,
  type ResendEmailAdapter,
  type ResendEmailPayload,
} from "./jobs/lead-created.js";
import { type JobDefinition, type JobRetryPolicy, WorkerJobRegistry } from "./registry.js";
import { WORKER_SCHEDULES, type WorkerCronSchedule } from "./schedules.js";

export {
  createHeadcountChangedJob,
  createLeadCreatedJob,
  hashAddressForAnalytics,
  type HeadcountChangedJobData,
  type HeadcountChangedJobResult,
  HeadcountChangedJobSchema,
  type JobDefinition,
  type JobRetryPolicy,
  type LeadCreatedJobData,
  type LeadCreatedJobResult,
  LeadCreatedJobSchema,
  MockSafeResendAdapter,
  type ResendEmailAdapter,
  type ResendEmailPayload,
  WORKER_SCHEDULES,
  type WorkerCronSchedule,
  WorkerJobRegistry,
};

/**
 * Creates a default `WorkerJobRegistry` with all Phase 0 jobs registered.
 */
export function createDefaultWorkerRegistry(options?: {
  emailAdapter?: ResendEmailAdapter;
}): WorkerJobRegistry {
  const registry = new WorkerJobRegistry();
  registry.register(
    createLeadCreatedJob(options?.emailAdapter ? { emailAdapter: options.emailAdapter } : {}),
  );
  registry.register(createHeadcountChangedJob());
  return registry;
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
  const registry = createDefaultWorkerRegistry();
  await registry.bindToPgBoss(boss);
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
        }),
      );
    })
    .catch((err: unknown) => {
      console.error("Failed to start Managevent worker:", err);
      process.exit(1);
    });
}
