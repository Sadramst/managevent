/**
 * RFC 6238 time-based one-time passwords with `node:crypto` (HMAC-SHA1, 30 second step, six
 * digits), for signing in to the staff console in end-to-end tests the way an authenticator app
 * would. Test-only: the secret comes from the staff bootstrap CLI's `otpauth://` URI.
 */
import { createHmac } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD_MS = 30_000;

/** Decodes RFC 4648 base32 (padding and whitespace optional, case-insensitive). */
export function base32Decode(input: string): Buffer {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of input.replace(/[\s=]/g, "").toUpperCase()) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) throw new Error("Invalid base32 character in TOTP secret");
    buffer = ((buffer << 5) | value) & 0xfff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

/** The shared secret carried in the `secret` parameter of an `otpauth://totp/` URI. */
export function secretFromTotpUri(totpUri: string): Buffer {
  const secret = new URL(totpUri).searchParams.get("secret");
  if (!secret) throw new Error("The TOTP URI has no secret");
  return base32Decode(secret);
}

/** The six-digit code for `secret` at `atMs` (milliseconds since the Unix epoch). */
export function totpCode(secret: Buffer, atMs: number = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / PERIOD_MS)));
  const digest = createHmac("sha1", secret).update(counter).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/**
 * A code with enough of its 30 second window left to be typed and submitted. Waits for the next
 * window when the current one is about to end.
 */
export async function freshTotpCode(totpUri: string, minRemainingMs = 4_000): Promise<string> {
  const remaining = PERIOD_MS - (Date.now() % PERIOD_MS);
  if (remaining < minRemainingMs) {
    await new Promise((resolve) => setTimeout(resolve, remaining + 250));
  }
  return totpCode(secretFromTotpUri(totpUri));
}
