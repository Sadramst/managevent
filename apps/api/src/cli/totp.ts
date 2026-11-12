/**
 * RFC 6238 time-based one-time passwords with `node:crypto` (HMAC-SHA1, 30 second step, 6 digits),
 * and the RFC 4648 base32 decoding an `otpauth://` URI needs.
 *
 * Used by the staff bootstrap CLI to complete two-factor enrolment on the operator's behalf.
 */
import { createHmac } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Decodes RFC 4648 base32 (padding and whitespace optional, case-insensitive). */
export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=]/g, "").toUpperCase();
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) throw new Error("Invalid base32 character in TOTP secret");
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

/** The shared secret (raw bytes) carried in the `secret` parameter of an `otpauth://totp/` URI. */
export function secretFromTotpUri(totpUri: string): Buffer {
  let secret: string | null;
  try {
    secret = new URL(totpUri).searchParams.get("secret");
  } catch {
    throw new Error("The two-factor enrolment URI is not a valid URI");
  }
  if (!secret) throw new Error("The two-factor enrolment URI has no secret");
  return base32Decode(secret);
}

/** The TOTP code for `secret` at `atMs` (milliseconds since the Unix epoch). */
export function totpCode(
  secret: Buffer,
  atMs: number,
  options: { periodSeconds?: number; digits?: number } = {},
): string {
  const period = options.periodSeconds ?? 30;
  const digits = options.digits ?? 6;
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / 1000 / period)));

  const digest = createHmac("sha1", secret).update(counter).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, "0");
}
