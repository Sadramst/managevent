/**
 * Email address hashing and the signed unsubscribe token.
 *
 * `apps/worker/src/lib/unsubscribe-token.ts` holds the same helper: the worker signs the token it
 * puts in an email footer and the API verifies it. Keep the two files in step.
 *
 * token = base64url(hash) + "." + base64url(HMAC-SHA256(GUEST_TOKEN_PEPPER, "unsub:EMAIL:" + hashHex))
 * where `hashHex = sha256(lowercased email)` and `hash` is its 32 raw bytes. The token therefore
 * carries no address, only the hash that is stored in `Unsubscribe.address`.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getGuestTokenPepper } from "../../lib/guest-tokens.js";

const HASH_HEX = /^[0-9a-f]{64}$/;

/** `sha256(trimmed, lowercased address)` as hex. This is what `Message.to` and `Unsubscribe.address` hold. */
export function hashEmailAddress(address: string): string {
  return createHash("sha256").update(address.trim().toLowerCase(), "utf8").digest("hex");
}

function sign(hashHex: string): Buffer {
  return createHmac("sha256", getGuestTokenPepper()).update(`unsub:EMAIL:${hashHex}`).digest();
}

export function createUnsubscribeToken(hashHex: string): string {
  if (!HASH_HEX.test(hashHex)) throw new RangeError("Expected a sha256 hex digest");
  return `${Buffer.from(hashHex, "hex").toString("base64url")}.${sign(hashHex).toString("base64url")}`;
}

/** Returns the address hash the token was signed for, or null when it is malformed or forged. */
export function verifyUnsubscribeToken(token: string): string | null {
  const parts = token.trim().split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const hash = Buffer.from(parts[0], "base64url");
  const given = Buffer.from(parts[1], "base64url");
  if (hash.length !== 32) return null;
  const hashHex = hash.toString("hex");
  const expected = sign(hashHex);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return hashHex;
}
