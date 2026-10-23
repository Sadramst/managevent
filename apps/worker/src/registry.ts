/**
 * Type-safe pg-boss job registry for `apps/worker` (`ADR-0003` and `apps/worker/AGENTS.md`).
 *
 * Every registered job has:
 * - A Zod payload schema
 * - A deterministic `dedupeKey` builder for idempotency
 * - An exponential-backoff retry policy and dead-letter queue
 */
import PgBoss from "pg-boss";
import type { z } from "zod";

export interface JobRetryPolicy {
  retryLimit: number;
  retryDelaySec: number;
  retryBackoff: boolean;
  deadLetterQueue: string;
}

export interface JobDefinition<TSchema extends z.ZodTypeAny, TResult = unknown> {
  name: string;
  schema: TSchema;
  dedupeKey: (payload: z.infer<TSchema>) => string;
  retryPolicy: JobRetryPolicy;
  handler: (payload: z.infer<TSchema>) => Promise<TResult>;
}

export class WorkerJobRegistry {
  private readonly definitions = new Map<string, JobDefinition<z.ZodTypeAny, unknown>>();
  private readonly processedDedupeKeys = new Set<string>();

  register<TSchema extends z.ZodTypeAny, TResult>(
    definition: JobDefinition<TSchema, TResult>,
  ): void {
    if (this.definitions.has(definition.name)) {
      throw new Error(`Duplicate job registration: ${definition.name}`);
    }
    this.definitions.set(
      definition.name,
      definition as unknown as JobDefinition<z.ZodTypeAny, unknown>,
    );
  }

  getDefinition(name: string): JobDefinition<z.ZodTypeAny, unknown> | undefined {
    return this.definitions.get(name);
  }

  listJobNames(): string[] {
    return [...this.definitions.keys()];
  }

  /**
   * Validates the payload with the job's Zod schema, checks the idempotency `dedupeKey`,
   * and executes the job handler.
   */
  async executeJob<TResult = unknown>(
    name: string,
    rawPayload: unknown,
  ): Promise<{ deduplicated: boolean; dedupeKey: string; result?: TResult }> {
    const def = this.definitions.get(name);
    if (!def) {
      throw new Error(`Unknown worker job: ${name}`);
    }

    const parsedPayload: unknown = def.schema.parse(rawPayload);
    const key = def.dedupeKey(parsedPayload);

    if (this.processedDedupeKeys.has(key)) {
      return { deduplicated: true, dedupeKey: key };
    }

    const result = (await def.handler(parsedPayload)) as TResult;
    this.processedDedupeKeys.add(key);

    return {
      deduplicated: false,
      dedupeKey: key,
      result,
    };
  }

  /**
   * Binds all registered jobs and dead-letter queues to a running `PgBoss` instance.
   */
  async bindToPgBoss(boss: PgBoss): Promise<void> {
    for (const def of this.definitions.values()) {
      await boss.createQueue(def.retryPolicy.deadLetterQueue);
      await boss.createQueue(def.name, {
        name: def.name,
        deadLetter: def.retryPolicy.deadLetterQueue,
        retryLimit: def.retryPolicy.retryLimit,
        retryDelay: def.retryPolicy.retryDelaySec,
        retryBackoff: def.retryPolicy.retryBackoff,
      });

      await boss.work(def.name, async (jobs) => {
        for (const job of jobs) {
          await this.executeJob(def.name, job.data);
        }
      });
    }
  }
}
