/**
 * Open-redirect-safe handling of the `?next=` parameter used by the sign-in flow.
 *
 * Pure and dependency-free, so both server pages and client forms can use it.
 */

/** Where a host lands after signing in when no (valid) `next` was given. */
export const DEFAULT_AFTER_SIGN_IN = "/studio";

/** Paths that must never be a sign-in destination (they would loop or are not pages). */
const BLOCKED_PREFIXES = ["/sign-in", "/sign-up", "/reset-password", "/api"];

const PARSE_BASE = "http://same-origin.invalid";

/**
 * Returns `input` only when it is a same-origin relative path; otherwise `fallback`.
 *
 * Accepted: `/studio`, `/studio/evt_1/guests?tab=2#x`.
 * Rejected: absolute URLs, protocol-relative `//host`, backslash tricks (`/\host`), anything
 * with whitespace or control characters, anything that resolves off this origin, and the auth
 * pages and `/api/*`.
 */
export function safeNextPath(
  input: string | string[] | null | undefined,
  fallback: string = DEFAULT_AFTER_SIGN_IN,
): string {
  const value = Array.isArray(input) ? input[0] : input;
  if (typeof value !== "string" || value.length === 0 || value.length > 2000) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // Browsers treat a backslash like a slash, and strip tabs and newlines, when parsing a URL.
  if (/[\\\s]/.test(value) || hasControlCharacter(value)) return fallback;

  let url: URL;
  try {
    url = new URL(value, PARSE_BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== PARSE_BASE) return fallback;
  const path = url.pathname;
  if (path.startsWith("//")) return fallback;
  if (BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return fallback;
  }
  return `${path}${url.search}${url.hash}`;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** `/sign-in?next=<path>` for a destination; `next` is dropped when it is the default. */
export function signInPath(next?: string | null, base = "/sign-in"): string {
  const safe = safeNextPath(next);
  return safe === DEFAULT_AFTER_SIGN_IN ? base : `${base}?next=${encodeURIComponent(safe)}`;
}
