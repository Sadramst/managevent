/**
 * @managevent/db
 *
 * Database schema, Prisma client, prefixed UUIDv7 ID generator, AES-256-GCM field encryption
 * extension for sensitive health/tribute fields, and Perth placeholder seed utilities.
 */

export * from "@prisma/client";

export { createDbClient, type CreateDbClientOptions, db, type ExtendedDbClient } from "./client.js";

export {
  createFieldEncryptionExtension,
  decryptField,
  decryptRsvpRecord,
  decryptWellEntryRecord,
  encryptField,
  ENCRYPTION_PREFIX,
  encryptRsvpWriteData,
  encryptWellEntryWriteData,
  isEncryptedValue,
  resolveEncryptionKey,
} from "./encryption.js";

export {
  type EntityKey,
  extractIdTimestamp,
  generateId,
  generateUuidV7,
  ID_PREFIXES,
  type IdPrefix,
  isValidPrefixedId,
  type PrefixedId,
} from "./ids.js";

export { loadContentSeedFixtures, seedDatabase } from "./seed.js";
