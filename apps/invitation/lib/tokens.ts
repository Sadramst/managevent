/**
 * Cryptographic guest token & slug generation for digital invitations (`WEBSITE.md` §B6.1, `MIGRATION.md`).
 *
 * Suffix is derived from HMAC-SHA256(GUEST_TOKEN_PEPPER, event.salt + party.stableId) over the 31-character safe alphabet
 * (omitting '0', '1', 'i', 'l', 'o' to avoid misreading across fonts and handwriting).
 */
import { createHash, createHmac, randomBytes } from "node:crypto";

/**
 * 31-character safe alphabet (excludes `0`, `1`, `i`, `l`, `o`) per `WEBSITE.md` §B6.1.
 */
export const SAFE_TOKEN_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz" as const;

/**
 * Sanitizes user input into a clean, URL-safe lowercase slug base.
 */
export function sanitizeSlugName(input: string, fallback = "guest"): string {
  const sanitized = String(input ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, 36);

  return sanitized.length > 0 ? sanitized : fallback;
}

/**
 * Derives a deterministic, unguessable suffix using HMAC-SHA256 over the 31-character safe alphabet.
 */
export function deriveTokenSuffix(
  pepper: string,
  salt: string,
  stableId: string,
  length = 6,
): string {
  const hmac = createHmac("sha256", pepper || "managevent-local-dev-pepper-default-salt");
  hmac.update(`${salt}:${stableId}`);
  const digest = hmac.digest();

  let suffix = "";
  for (let i = 0; i < length; i++) {
    const byte = digest[i] ?? 0;
    suffix += SAFE_TOKEN_ALPHABET[byte % SAFE_TOKEN_ALPHABET.length];
  }
  return suffix;
}

/**
 * Generates a full permanent party/family guest token: `{readableName}-{suffix}` (e.g. `sara-family-g9qtmt`).
 */
export function generateGuestToken(
  name: string,
  pepper: string,
  salt: string,
  stableId: string,
): string {
  const base = sanitizeSlugName(name, "guest");
  const suffix = deriveTokenSuffix(pepper, salt, stableId, 6);
  return `${base}-${suffix}`;
}

/**
 * Generates an event-level slug matching `SafeEventSlugSchema`:
 * `{words}-{suffix3to6}` (e.g. `sara-ali-aghd-7kq`).
 */
export function generateEventSlug(title: string, salt: string): string {
  const base = sanitizeSlugName(title, "event");
  const digest = createHash("sha256").update(`${title}:${salt}`).digest();
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    const byte = digest[i] ?? 0;
    suffix += SAFE_TOKEN_ALPHABET[byte % SAFE_TOKEN_ALPHABET.length];
  }
  return `${base}-${suffix}`;
}

/**
 * Validates whether a token matches the expected guest token format: `{name}-{suffix6to16}`.
 */
export function isValidGuestTokenFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const regex = /^[a-z0-9]+(?:-[a-z0-9]+)*-[23456789abcdefghjkmnpqrstuvwxyz]{6,16}$/;
  return regex.test(token);
}

/**
 * Generates a cryptographically random 32-character hex salt for new events.
 */
export function generateEventSalt(): string {
  return randomBytes(16).toString("hex");
}
