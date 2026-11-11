/**
 * Cryptographic guest token & slug generation for digital invitations (`WEBSITE.md` §B6.1, `MIGRATION.md`).
 *
 * Suffix is derived from HMAC-SHA256(GUEST_TOKEN_PEPPER, event.salt + party.stableId) over the 31-character safe alphabet
 * (omitting '0', '1', 'i', 'l', 'o' to avoid misreading across fonts and handwriting).
 *
 * Implemented using standard RFC 6234 SHA-256 / RFC 2104 HMAC-SHA256 + Web Crypto `getRandomValues`
 * so it runs identically in both Node.js and browser client bundles without requiring `node:crypto`.
 */

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(data: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLen = data.length * 8;
  const padLen = (data.length + 9 + 63) & ~63;
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(padLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const w15 = w[i - 15] ?? 0;
      const w2 = w[i - 2] ?? 0;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + (SHA256_K[i] ?? 0) + (w[i] ?? 0)) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function hmacSha256Bytes(keyStr: string, messageStr: string): Uint8Array {
  const encoder = new TextEncoder();
  let keyBytes: Uint8Array = encoder.encode(keyStr);
  const msgBytes: Uint8Array = encoder.encode(messageStr);

  if (keyBytes.length > 64) {
    keyBytes = sha256Bytes(keyBytes);
  }
  const blockKey = new Uint8Array(64);
  blockKey.set(keyBytes);

  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    const k = blockKey[i] ?? 0;
    oKeyPad[i] = k ^ 0x5c;
    iKeyPad[i] = k ^ 0x36;
  }

  const innerInput = new Uint8Array(64 + msgBytes.length);
  innerInput.set(iKeyPad, 0);
  innerInput.set(msgBytes, 64);
  const innerHash = sha256Bytes(innerInput);

  const outerInput = new Uint8Array(64 + 32);
  outerInput.set(oKeyPad, 0);
  outerInput.set(innerHash, 64);
  return sha256Bytes(outerInput);
}

/**
 * 31-character safe alphabet (excludes `0`, `1`, `i`, `l`, `o`) per `WEBSITE.md` §B6.1.
 */
const BASE31_SAFE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz" as const;
export const SAFE_TOKEN_ALPHABET = BASE31_SAFE_ALPHABET;

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
  const digest = hmacSha256Bytes(
    pepper || "managevent-local-dev-pepper-default-salt",
    `${salt}:${stableId}`,
  );

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
  const digest = sha256Bytes(new TextEncoder().encode(`${title}:${salt}`));
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
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
