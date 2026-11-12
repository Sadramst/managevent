/**
 * Guest link tokens, event slugs and pass signatures (`node:crypto` only).
 *
 * - A party token is `{slug-of-display-name}-{suffix}`. The suffix is derived with HMAC-SHA256 from
 *   the platform pepper (`GUEST_TOKEN_PEPPER`), the per-event salt (`Invitation.salt`) and the
 *   party's immutable `stableId`, so it cannot be guessed or recomputed without both secrets.
 * - The token is stored in `Party.token` when the party is created and is NOT recomputed when the
 *   party is renamed. Reissuing bumps `tokenVersion`, which changes the suffix.
 * - The salt and the pepper never appear in a DTO or a log line.
 */
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { SAFE_TOKEN_ALPHABET } from "@managevent/validators";

/** Same development fallback as `apps/invitation/lib/tokens.ts`, so local links stay stable. */
const DEV_FALLBACK_PEPPER = "managevent-local-dev-pepper-default-salt";
const MIN_PEPPER_LENGTH = 32;

/**
 * 31 symbols. 248 is the largest multiple of 31 that fits in a byte, so bytes 0..247 map evenly
 * onto the alphabet and bytes 248..255 are discarded (no modulo bias).
 */
const ALPHABET_SIZE = SAFE_TOKEN_ALPHABET.length;
const REJECTION_THRESHOLD = Math.floor(256 / ALPHABET_SIZE) * ALPHABET_SIZE;

const PASS_QR_PREFIX = "MV1";
const PASS_SIG_LENGTH = 32;
const PASS_ID_PATTERN =
  /^pass_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PASS_SIG_PATTERN = /^[A-Za-z0-9_-]{32}$/;

/**
 * The platform pepper. In production it must be set and at least 32 characters long; anything
 * else is a deployment error and throws. Outside production a fixed development value is used
 * when the variable is unset.
 */
export function getGuestTokenPepper(): string {
  const pepper = process.env.GUEST_TOKEN_PEPPER?.trim() ?? "";
  if (process.env.NODE_ENV === "production") {
    if (pepper.length < MIN_PEPPER_LENGTH) {
      throw new Error("GUEST_TOKEN_PEPPER must be set to at least 32 characters in production");
    }
    return pepper;
  }
  return pepper.length > 0 ? pepper : DEV_FALLBACK_PEPPER;
}

/** A fresh per-event salt: 32 random bytes as hex. Stored in `Invitation.salt` only. */
export function generateEventSalt(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Turns free text into a lowercase URL-safe slug base (`[a-z0-9]+(-[a-z0-9]+)*`): diacritics are
 * stripped, every other run of characters becomes one hyphen, and the result is cut to `maxLen`
 * without leaving a trailing hyphen. Falls back to `fallback` when nothing usable remains.
 */
export function slugifyName(input: string, fallback: string, maxLen = 36): string {
  const slug = String(input ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, Math.max(1, maxLen))
    .replace(/-+$/g, "");
  return slug.length > 0 ? slug : fallback;
}

/**
 * The immutable id a party's token is derived from: `s_` + 24 random hex characters, or
 * `k_` + the first 24 hex characters of `sha256(seed)` when an Idempotency-Key seed is given, so a
 * retried create resolves to the same party.
 */
export function generateStableId(idempotencySeed?: string): string {
  if (idempotencySeed !== undefined && idempotencySeed.length > 0) {
    return `k_${createHash("sha256").update(idempotencySeed, "utf8").digest("hex").slice(0, 24)}`;
  }
  return `s_${randomBytes(12).toString("hex")}`;
}

/**
 * Derives the unguessable token suffix over the 31-character safe alphabet.
 *
 * HMAC-SHA256(key = pepper, message = `salt:stableId` for version 0, `salt:stableId:version`
 * for version 1+). Digest bytes are mapped with rejection sampling; if one digest does not yield
 * enough symbols, further digests are taken over the same message with `#1`, `#2`, ... appended.
 */
export function deriveTokenSuffix(
  pepper: string,
  salt: string,
  stableId: string,
  tokenVersion = 0,
  length = 8,
): string {
  if (!Number.isInteger(length) || length < 1 || length > 128) {
    throw new RangeError("Token suffix length must be an integer between 1 and 128");
  }
  if (!Number.isInteger(tokenVersion) || tokenVersion < 0) {
    throw new RangeError("Token version must be a non-negative integer");
  }
  const message =
    tokenVersion === 0 ? `${salt}:${stableId}` : `${salt}:${stableId}:${tokenVersion}`;

  let suffix = "";
  for (let block = 0; suffix.length < length; block += 1) {
    const digest = createHmac("sha256", pepper)
      .update(block === 0 ? message : `${message}#${block}`, "utf8")
      .digest();
    for (const byte of digest) {
      if (byte >= REJECTION_THRESHOLD) continue;
      suffix += SAFE_TOKEN_ALPHABET.charAt(byte % ALPHABET_SIZE);
      if (suffix.length === length) break;
    }
  }
  return suffix;
}

/** `{slug-of-display-name}-{8-character suffix}`. Matches `GuestTokenSchema`. */
export function buildPartyToken(
  displayName: string,
  salt: string,
  stableId: string,
  tokenVersion: number,
): string {
  const suffix = deriveTokenSuffix(getGuestTokenPepper(), salt, stableId, tokenVersion);
  return `${slugifyName(displayName, "guest")}-${suffix}`;
}

/**
 * `{slug-of-title, max 40}-{4 random safe-alphabet characters}`. Matches `SafeEventSlugSchema`.
 * Random, not derived: retry on a unique violation.
 */
export function generateEventSlug(title: string): string {
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix += SAFE_TOKEN_ALPHABET.charAt(randomInt(ALPHABET_SIZE));
  }
  return `${slugifyName(title, "event", 40)}-${suffix}`;
}

function passSignature(salt: string, passId: string, eventId: string): string {
  // Per-event signing key, so a pass signature from one event proves nothing about another.
  const eventKey = createHmac("sha256", getGuestTokenPepper())
    .update(`pass-v1:${salt}`, "utf8")
    .digest();
  return createHmac("sha256", eventKey)
    .update(`${passId}.${eventId}`, "utf8")
    .digest("base64url")
    .slice(0, PASS_SIG_LENGTH);
}

/**
 * Signs a pass for its event. `sig` is stored in `Pass.qrPayloadSig`; `qr` (`MV1.{passId}.{sig}`)
 * is what the QR code encodes. It carries no guest name and no guest link.
 */
export function signPass(
  salt: string,
  passId: string,
  eventId: string,
): { sig: string; qr: string } {
  const sig = passSignature(salt, passId, eventId);
  return { sig, qr: `${PASS_QR_PREFIX}.${passId}.${sig}` };
}

/**
 * Parses a scanned QR payload. Returns null for anything that is not a well-formed `MV1` payload.
 * This only checks the shape: the caller loads the pass and compares the signature with
 * `isPassSignatureValid`.
 */
export function verifyPassQr(qr: string): { passId: string; sig: string } | null {
  if (typeof qr !== "string" || qr.length > 200) return null;
  const parts = qr.trim().split(".");
  if (parts.length !== 3) return null;
  const [prefix, passId, sig] = parts;
  if (prefix !== PASS_QR_PREFIX || !passId || !sig) return null;
  if (!PASS_ID_PATTERN.test(passId) || !PASS_SIG_PATTERN.test(sig)) return null;
  return { passId, sig };
}

/** Constant-time check that `sig` is the signature of this pass for this event. */
export function isPassSignatureValid(
  salt: string,
  passId: string,
  eventId: string,
  sig: string,
): boolean {
  const expected = Buffer.from(passSignature(salt, passId, eventId), "utf8");
  const given = Buffer.from(sig, "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
