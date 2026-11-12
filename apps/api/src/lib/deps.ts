/**
 * The dependencies every module receives. Routers are built from `ApiDeps` so tests can swap the
 * queue and the clock while still using the real database.
 */
import { db, type ExtendedDbClient } from "@managevent/db";
import { type JobQueue, PgBossJobQueue } from "./queue.js";

export interface ApiDeps {
  db: ExtendedDbClient;
  queue: JobQueue;
  now: () => Date;
}

/**
 * What a repository function accepts: the shared client or the client inside an interactive
 * `$transaction`. Field encryption applies to both.
 */
export type DbTx = Omit<
  ExtendedDbClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

let defaultQueue: PgBossJobQueue | null = null;

/** One pg-boss producer per process, created on first use. */
function getDefaultQueue(): PgBossJobQueue {
  defaultQueue ??= new PgBossJobQueue();
  return defaultQueue;
}

export function createDefaultDeps(overrides: Partial<ApiDeps> = {}): ApiDeps {
  return {
    db: overrides.db ?? db,
    queue: overrides.queue ?? getDefaultQueue(),
    now: overrides.now ?? (() => new Date()),
  };
}
