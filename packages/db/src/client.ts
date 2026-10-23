import { PrismaClient } from "@prisma/client";
import { createFieldEncryptionExtension } from "./encryption.js";

/**
 * Options for creating a Managevent database client instance.
 */
export interface CreateDbClientOptions {
  /** Optional database URL override. */
  datasourceUrl?: string;
  /** Optional base64 32-byte field encryption key override. */
  encryptionKey?: string;
}

/**
 * Creates a PrismaClient extended with the Managevent AES-256-GCM field encryption extension.
 */
export function createDbClient(options: CreateDbClientOptions = {}) {
  const base = new PrismaClient(
    options.datasourceUrl ? { datasourceUrl: options.datasourceUrl } : undefined,
  );
  return base.$extends(createFieldEncryptionExtension(options.encryptionKey));
}

export type ExtendedDbClient = ReturnType<typeof createDbClient>;

const globalForPrisma = globalThis as unknown as {
  __manageventDb?: ExtendedDbClient;
};

/**
 * Shared singleton database client with field-level encryption enabled.
 * Only `apps/api` and `apps/worker` may import this package.
 */
export const db: ExtendedDbClient = globalForPrisma.__manageventDb ?? createDbClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__manageventDb = db;
}
