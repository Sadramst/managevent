import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";

/**
 * Prefix applied to all AES-256-GCM field-encrypted strings.
 */
export const ENCRYPTION_PREFIX = "enc:v1:" as const;

/**
 * Resolves a 32-byte encryption key from a base64 string or `process.env.PII_ENCRYPTION_KEY`.
 *
 * // DECISION-NEEDED(FND-02): Key rotation version table for PII_ENCRYPTION_KEY (v1 prefix already encoded in ciphertext).
 */
export function resolveEncryptionKey(keyInput?: string): Buffer {
  const raw = keyInput ?? process.env.PII_ENCRYPTION_KEY ?? "";
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PII_ENCRYPTION_KEY is required in production");
    }
    // Deterministic local fallback key for unit tests when env is unset
    return createHash("sha256").update("managevent-local-dev-pii-key").digest();
  }

  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) {
    return decoded;
  }
  return createHash("sha256").update(raw).digest();
}

/**
 * Checks whether a string value is already encrypted with the Managevent envelope format.
 */
export function isEncryptedValue(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Encrypts a plaintext string using AES-256-GCM (12-byte random IV, 16-byte authentication tag).
 * Idempotent: if the input is already prefixed with `enc:v1:`, it is returned unchanged.
 *
 * @param plaintext - Sensitive string to encrypt.
 * @param keyInput - Optional base64 32-byte key override.
 * @returns Envelope string `enc:v1:<ivHex>:<tagHex>:<cipherHex>`.
 */
export function encryptField(plaintext: string, keyInput?: string): string {
  if (isEncryptedValue(plaintext)) {
    return plaintext;
  }
  const key = resolveEncryptionKey(keyInput);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an AES-256-GCM envelope string produced by `encryptField`.
 * If the string does not start with `enc:v1:`, it is returned as-is.
 *
 * @param payload - Encrypted envelope string.
 * @param keyInput - Optional base64 32-byte key override.
 * @returns Decrypted UTF-8 plaintext.
 */
export function decryptField(payload: string, keyInput?: string): string {
  if (!isEncryptedValue(payload)) {
    return payload;
  }
  const body = payload.slice(ENCRYPTION_PREFIX.length);
  const parts = body.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted field envelope format");
  }
  const [ivHex, tagHex, cipherHex] = parts;
  if (!ivHex || !tagHex || cipherHex === undefined) {
    throw new Error("Malformed encrypted field components");
  }

  const key = resolveEncryptionKey(keyInput);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Encrypts sensitive 🔒 fields on an RSVP write payload (`allergyNotes`, `accessibilityNotes`,
 * `dietary` -> `dietaryEncrypted`, `allergySeverity` -> `allergySeverityEncrypted`).
 */
export function encryptRsvpWriteData<T extends Record<string, unknown>>(
  data: T,
  keyInput?: string,
): Omit<T, "dietary" | "allergySeverity"> & {
  dietaryEncrypted?: string | null;
  allergySeverityEncrypted?: string | null;
} {
  const clone: Record<string, unknown> = { ...data };

  if (typeof clone.allergyNotes === "string" && clone.allergyNotes.length > 0) {
    clone.allergyNotes = encryptField(clone.allergyNotes, keyInput);
  }
  if (typeof clone.accessibilityNotes === "string" && clone.accessibilityNotes.length > 0) {
    clone.accessibilityNotes = encryptField(clone.accessibilityNotes, keyInput);
  }
  if (Array.isArray(clone.dietary)) {
    clone.dietaryEncrypted = encryptField(JSON.stringify(clone.dietary), keyInput);
  }
  if (typeof clone.allergySeverity === "string") {
    clone.allergySeverityEncrypted = encryptField(clone.allergySeverity, keyInput);
  } else if (clone.allergySeverity === null) {
    clone.allergySeverityEncrypted = null;
  }

  delete clone.dietary;
  delete clone.allergySeverity;
  return clone as Omit<T, "dietary" | "allergySeverity">;
}

/**
 * Decrypts sensitive 🔒 fields on an RSVP record returned from the database.
 */
type DecryptedRsvp<T> = T extends object
  ? T & {
      dietary?: unknown;
      allergySeverity?: unknown;
    }
  : T;

export function decryptRsvpRecord<T>(record: T, keyInput?: string): DecryptedRsvp<T> {
  if (!record || typeof record !== "object") {
    return record as DecryptedRsvp<T>;
  }
  const clone = { ...(record as Record<string, unknown>) };

  if (typeof clone.allergyNotes === "string" && isEncryptedValue(clone.allergyNotes)) {
    clone.allergyNotes = decryptField(clone.allergyNotes, keyInput);
  }
  if (typeof clone.accessibilityNotes === "string" && isEncryptedValue(clone.accessibilityNotes)) {
    clone.accessibilityNotes = decryptField(clone.accessibilityNotes, keyInput);
  }
  if (typeof clone.dietaryEncrypted === "string" && isEncryptedValue(clone.dietaryEncrypted)) {
    const parsed: unknown = JSON.parse(decryptField(clone.dietaryEncrypted, keyInput));
    if (Array.isArray(parsed)) {
      clone.dietary = parsed;
    }
  }
  if (
    typeof clone.allergySeverityEncrypted === "string" &&
    isEncryptedValue(clone.allergySeverityEncrypted)
  ) {
    clone.allergySeverity = decryptField(clone.allergySeverityEncrypted, keyInput);
  }

  return clone as DecryptedRsvp<T>;
}

/**
 * Encrypts private tribute / wishing-well messages when visibility is `HOSTS_ONLY`.
 */
export function encryptWellEntryWriteData<T extends Record<string, unknown>>(
  data: T,
  keyInput?: string,
): T {
  const clone: Record<string, unknown> = { ...data };
  const visibility = clone.visibility ?? "HOSTS_ONLY";
  if (
    visibility === "HOSTS_ONLY" &&
    typeof clone.message === "string" &&
    clone.message.length > 0
  ) {
    clone.message = encryptField(clone.message, keyInput);
  }
  return clone as T;
}

/**
 * Decrypts a `WellEntry` record if its `message` is field-encrypted.
 */
export function decryptWellEntryRecord<T>(record: T, keyInput?: string): T {
  if (!record || typeof record !== "object") {
    return record;
  }
  const clone = { ...(record as Record<string, unknown>) };
  if (typeof clone.message === "string" && isEncryptedValue(clone.message)) {
    clone.message = decryptField(clone.message, keyInput);
  }
  return clone as T;
}

/**
 * Prisma client extension that transparently encrypts and decrypts 🔒 health and private tribute fields.
 *
 * @param keyInput - Optional base64 32-byte key override.
 */
export function createFieldEncryptionExtension(keyInput?: string) {
  return Prisma.defineExtension({
    name: "managevent-field-encryption",
    query: {
      rsvp: {
        async create({ args, query }) {
          args.data = encryptRsvpWriteData(
            args.data as unknown as Record<string, unknown>,
            keyInput,
          ) as typeof args.data;
          const res = await query(args);
          return decryptRsvpRecord(res, keyInput);
        },
        async update({ args, query }) {
          args.data = encryptRsvpWriteData(
            args.data as unknown as Record<string, unknown>,
            keyInput,
          ) as typeof args.data;
          const res = await query(args);
          return decryptRsvpRecord(res, keyInput);
        },
        async upsert({ args, query }) {
          args.create = encryptRsvpWriteData(
            args.create as unknown as Record<string, unknown>,
            keyInput,
          ) as typeof args.create;
          args.update = encryptRsvpWriteData(
            args.update as unknown as Record<string, unknown>,
            keyInput,
          ) as typeof args.update;
          const res = await query(args);
          return decryptRsvpRecord(res, keyInput);
        },
        async findUnique({ args, query }) {
          const res = await query(args);
          return decryptRsvpRecord(res, keyInput);
        },
        async findUniqueOrThrow({ args, query }) {
          const res = await query(args);
          return decryptRsvpRecord(res, keyInput);
        },
        async findFirst({ args, query }) {
          const res = await query(args);
          return decryptRsvpRecord(res, keyInput);
        },
        async findFirstOrThrow({ args, query }) {
          const res = await query(args);
          return decryptRsvpRecord(res, keyInput);
        },
        async findMany({ args, query }) {
          const res = await query(args);
          return res.map((row) => decryptRsvpRecord(row, keyInput));
        },
      },
      wellEntry: {
        async create({ args, query }) {
          args.data = encryptWellEntryWriteData(
            args.data as unknown as Record<string, unknown>,
            keyInput,
          ) as typeof args.data;
          const res = await query(args);
          return decryptWellEntryRecord(res, keyInput);
        },
        async update({ args, query }) {
          args.data = encryptWellEntryWriteData(
            args.data as unknown as Record<string, unknown>,
            keyInput,
          ) as typeof args.data;
          const res = await query(args);
          return decryptWellEntryRecord(res, keyInput);
        },
        async findUnique({ args, query }) {
          const res = await query(args);
          return decryptWellEntryRecord(res, keyInput);
        },
        async findFirst({ args, query }) {
          const res = await query(args);
          return decryptWellEntryRecord(res, keyInput);
        },
        async findMany({ args, query }) {
          const res = await query(args);
          return res.map((row) => decryptWellEntryRecord(row, keyInput));
        },
      },
    },
  });
}
