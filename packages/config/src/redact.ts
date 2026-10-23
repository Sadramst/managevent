/**
 * Log redaction helpers for Australian Privacy Act (APPs) compliance.
 *
 * Never log PII, tokens, payment credentials, health/dietary details, or full guest URLs.
 */

export const REDACTED_PLACEHOLDER = "[REDACTED]" as const;

/**
 * Canonical list of normalized (lowercase, alphanumeric-only) keys that must be redacted in logs.
 */
export const REDACTED_FIELD_NAMES = [
  "email",
  "phone",
  "phonenumber",
  "mobile",
  "name",
  "fullname",
  "firstname",
  "lastname",
  "authorname",
  "customername",
  "guestname",
  "displayname",
  "address",
  "ip",
  "ipaddress",
  "password",
  "pin",
  "pinhash",
  "salt",
  "pepper",
  "secret",
  "token",
  "guesttoken",
  "individualtoken",
  "sharetoken",
  "displaytoken",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "setcookie",
  "dietary",
  "allergynotes",
  "allergyseverity",
  "accessibilitynotes",
  "messagetohost",
  "message",
  "songrequests",
  "card",
  "cardnumber",
  "cvc",
  "cvv",
  "iban",
  "bsb",
  "accountnumber",
  "payid",
  "abn",
  "acn",
  "customerabn",
  "stripesecretkey",
  "stripewebhooksecret",
  "piiencryptionkey",
  "apikey",
] as const;

const REDACTED_NORMALIZED_SET = new Set<string>(REDACTED_FIELD_NAMES);

/**
 * Normalizes a field key by stripping non-alphanumeric characters and lowercasing.
 */
export function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  if (REDACTED_NORMALIZED_SET.has(normalized)) {
    return true;
  }
  return (
    normalized.endsWith("token") ||
    normalized.endsWith("secret") ||
    normalized.endsWith("password") ||
    normalized.endsWith("allergy") ||
    normalized.endsWith("dietary")
  );
}

/**
 * Redacts guest tokens and sensitive query parameters from URLs.
 *
 * Examples:
 * - `/i/sara-ali-aghd/sara-family-g9qtmt` -> `/i/sara-ali-aghd/[REDACTED]`
 * - `/display/evt_123/disp_tok_abc` -> `/display/evt_123/[REDACTED]`
 * - `/legacy/anniversary/armita-party-g9qtmt` -> `/legacy/anniversary/[REDACTED]`
 */
export function redactUrl(url: string): string {
  let sanitized = url
    .replace(/(\/i\/[^/?#]+\/)([^/?#]+)/g, `$1${REDACTED_PLACEHOLDER}`)
    .replace(/(\/display\/[^/?#]+\/)([^/?#]+)/g, `$1${REDACTED_PLACEHOLDER}`)
    .replace(/(\/legacy\/[^/?#]+\/)([^/?#]+)/g, `$1${REDACTED_PLACEHOLDER}`)
    .replace(/(\/plan\/estimate\/)([^/?#]+)/g, `$1${REDACTED_PLACEHOLDER}`);

  const queryIndex = sanitized.indexOf("?");
  if (queryIndex !== -1) {
    const base = sanitized.slice(0, queryIndex);
    const queryAndHash = sanitized.slice(queryIndex + 1);
    const [queryPart = "", hashPart] = queryAndHash.split("#", 2);
    const params = queryPart.split("&").map((pair) => {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) return pair;
      const k = pair.slice(0, eqIdx);
      if (isSensitiveKey(k) || k.toLowerCase() === "estimate") {
        return `${k}=${REDACTED_PLACEHOLDER}`;
      }
      return pair;
    });
    sanitized = `${base}?${params.join("&")}${hashPart !== undefined ? `#${hashPart}` : ""}`;
  }

  return sanitized;
}

/**
 * Deeply redacts sensitive keys and guest URLs from an arbitrary value for safe logging.
 *
 * @param input - Arbitrary value to sanitize for logs.
 * @returns Sanitized clone with PII/tokens replaced by `[REDACTED]`.
 */
export function redactForLog(input: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    if (
      input.includes("/i/") ||
      input.includes("/display/") ||
      input.includes("/legacy/") ||
      input.includes("?")
    ) {
      return redactUrl(input);
    }
    return input;
  }

  if (typeof input !== "object") {
    return input;
  }

  if (input instanceof Date) {
    return input.toISOString();
  }

  if (seen.has(input)) {
    return "[CIRCULAR]";
  }
  seen.add(input);

  if (Array.isArray(input)) {
    return input.map((item) => redactForLog(item, seen));
  }

  const record = input as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(record)) {
    if (isSensitiveKey(key)) {
      result[key] = REDACTED_PLACEHOLDER;
    } else if (
      (key === "url" || key === "path" || key === "href" || key === "referer") &&
      typeof val === "string"
    ) {
      result[key] = redactUrl(val);
    } else {
      result[key] = redactForLog(val, seen);
    }
  }

  return result;
}
