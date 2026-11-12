/**
 * Global teardown for the real-API run: soft-deletes the rows this run created in the shared
 * local database, and only those. They are found by the throwaway email domain every test
 * address uses, so nobody else's enquiries or accounts are touched.
 *
 * - The test enquiries leave the staff inbox (`Lead.deletedAt`).
 * - The test accounts, one of them a `SUPER_ADMIN`, can no longer sign in (`User.deletedAt`,
 *   sessions removed).
 *
 * There is no API route for either, so this is the one place the tests reach the database
 * directly. It is best effort: a failure is reported and never fails the run.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { E2E_EMAIL_DOMAIN } from "./real-api";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

interface CleanupClient {
  lead: { updateMany(args: object): Promise<{ count: number }> };
  user: {
    findMany(args: object): Promise<{ id: string }[]>;
    updateMany(args: object): Promise<{ count: number }>;
  };
  session: { deleteMany(args: object): Promise<{ count: number }> };
  $disconnect(): Promise<void>;
}

function databaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = path.join(repoRoot, ".env");
  return existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")).DATABASE_URL : undefined;
}

/** True for a database on this machine. The cleanup never writes anywhere else. */
function isLocalDatabase(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export default async function globalTeardown(): Promise<void> {
  const url = databaseUrl();
  if (!url) return;
  if (!isLocalDatabase(url)) {
    console.warn(
      `[e2e] DATABASE_URL is not a local database, so the test rows were NOT cleaned up. ` +
        `They all use @${E2E_EMAIL_DOMAIN} addresses.`,
    );
    return;
  }
  let client: CleanupClient | undefined;
  try {
    // The generated Prisma client lives with `packages/db`; this app does not depend on it.
    const requireFromDb = createRequire(path.join(repoRoot, "packages/db/package.json"));
    const { PrismaClient } = requireFromDb("@prisma/client") as {
      PrismaClient: new (options: object) => CleanupClient;
    };
    client = new PrismaClient({ datasources: { db: { url } } });
    const mine = { email: { endsWith: `@${E2E_EMAIL_DOMAIN}` }, deletedAt: null };
    const now = new Date();
    await client.lead.updateMany({ where: mine, data: { deletedAt: now } });
    const users = await client.user.findMany({ where: mine, select: { id: true } });
    const userIds = users.map((user) => user.id);
    if (userIds.length > 0) {
      await client.session.deleteMany({ where: { userId: { in: userIds } } });
      await client.user.updateMany({ where: { id: { in: userIds } }, data: { deletedAt: now } });
    }
  } catch (error) {
    console.warn(
      `[e2e] Could not clean up the test rows (${error instanceof Error ? error.name : "error"}). ` +
        `They all use @${E2E_EMAIL_DOMAIN} addresses.`,
    );
  } finally {
    await client?.$disconnect().catch(() => undefined);
  }
}
