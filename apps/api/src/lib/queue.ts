/**
 * Job producer for `apps/worker` (pg-boss on the application Postgres).
 *
 * `PgBossJobQueue` keeps ONE lazily started PgBoss instance per process, so enqueueing on the
 * RSVP path costs a single insert instead of a connect/start/stop cycle. By default a failed
 * enqueue never fails the request that triggered it: it is logged (name and error only, never the
 * payload) and reported as `null`. Jobs are derived from committed rows, so they can be re-driven
 * later.
 *
 * `null` therefore means "no new job": either the enqueue failed, or a job with the same
 * singleton key is already waiting. A caller that has to tell the two apart (because it is about
 * to tell someone the work is queued) passes `required: true` and gets the failure as an error.
 */
import PgBoss from "pg-boss";

export type JobName = "lead.created" | "headcount.changed" | "invitation.email_campaign";

export interface EnqueueOptions {
  singletonKey?: string;
  /** Throw when the job could not be enqueued, instead of logging it and returning `null`. */
  required?: boolean;
}

export interface JobQueue {
  enqueue(
    name: JobName,
    payload: Record<string, unknown>,
    opts?: EnqueueOptions,
  ): Promise<string | null>;
}

const DEFAULT_CONNECTION_STRING = "postgresql://postgres:postgres@localhost:5432/managevent";

function logQueueError(event: string, name: string | null, err: unknown): void {
  if (process.env.NODE_ENV === "test") return;
  console.error(
    JSON.stringify({
      level: "error",
      msg: event,
      ...(name ? { job: name } : {}),
      error: err instanceof Error ? err.name : "UnknownError",
    }),
  );
}

export class PgBossJobQueue implements JobQueue {
  private readonly connectionString: string;
  private starting: Promise<PgBoss> | null = null;
  private readonly queues = new Map<string, Promise<void>>();

  constructor(connectionString: string = process.env.DATABASE_URL ?? DEFAULT_CONNECTION_STRING) {
    this.connectionString = connectionString;
  }

  private start(): Promise<PgBoss> {
    if (!this.starting) {
      const boss = new PgBoss({
        connectionString: this.connectionString,
        // The API only produces jobs. Scheduling and maintenance belong to the worker.
        schedule: false,
        supervise: false,
        max: 4,
      });
      boss.on("error", (err) => logQueueError("pg-boss error", null, err));
      this.starting = boss.start().catch((err: unknown) => {
        // Allow a later enqueue to retry the start (for example after the database comes back).
        this.starting = null;
        throw err;
      });
    }
    return this.starting;
  }

  private ensureQueue(boss: PgBoss, name: string): Promise<void> {
    let created = this.queues.get(name);
    if (!created) {
      created = boss.createQueue(name).catch((err: unknown) => {
        this.queues.delete(name);
        throw err;
      });
      this.queues.set(name, created);
    }
    return created;
  }

  async enqueue(
    name: JobName,
    payload: Record<string, unknown>,
    opts: EnqueueOptions = {},
  ): Promise<string | null> {
    try {
      const boss = await this.start();
      await this.ensureQueue(boss, name);
      return await boss.send(name, payload, {
        ...(opts.singletonKey ? { singletonKey: opts.singletonKey } : {}),
        retryLimit: 3,
        retryDelay: 5,
        retryBackoff: true,
      });
    } catch (err) {
      logQueueError("job enqueue failed", name, err);
      if (opts.required) throw err;
      return null;
    }
  }

  /** Stops the underlying PgBoss instance, if one was started (process shutdown, CLI tools). */
  async stop(): Promise<void> {
    const starting = this.starting;
    this.starting = null;
    this.queues.clear();
    if (!starting) return;
    try {
      const boss = await starting;
      await boss.stop({ graceful: false });
    } catch (err) {
      logQueueError("pg-boss stop failed", null, err);
    }
  }
}

/** Test double: records what would have been enqueued. Never used outside tests. */
export class InMemoryJobQueue implements JobQueue {
  readonly jobs: Array<{
    name: JobName;
    payload: Record<string, unknown>;
    opts: EnqueueOptions;
  }> = [];

  async enqueue(
    name: JobName,
    payload: Record<string, unknown>,
    opts: EnqueueOptions = {},
  ): Promise<string | null> {
    if (opts.singletonKey && this.jobs.some((job) => job.opts.singletonKey === opts.singletonKey)) {
      return null;
    }
    this.jobs.push({ name, payload, opts });
    return `job_${this.jobs.length}`;
  }
}
