/**
 * Header handling for the same-origin auth proxy (`app/api/auth/[...all]/route.ts`).
 *
 * The browser talks to Better Auth through this site, so the session cookie is set on this
 * origin. `Origin` and `Referer` MUST reach the API: Better Auth's CSRF check passes silently
 * when the origin is empty, so dropping them would switch the check off.
 */
import { clientIpFromHeaders } from "./client-ip";

/** Request headers passed to the API as they arrived. Nothing else is forwarded. */
const FORWARDED_REQUEST_HEADERS = [
  "cookie",
  "content-type",
  "origin",
  "referer",
  "user-agent",
  "accept",
  "authorization",
] as const;

/** Response headers that describe the upstream body encoding, not ours. */
const DROPPED_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  // Re-added one by one from `getSetCookie()`, because `Headers` folds them otherwise.
  "set-cookie",
]);

/**
 * The API answers a trusted origin with CORS headers (`access-control-allow-origin` plus
 * `allow-credentials`). This proxy is for same-origin calls only, so they are never relayed:
 * relayed, they would let another trusted origin read this site's auth responses.
 */
const DROPPED_RESPONSE_PREFIX = "access-control-";

/** The only API mount this proxy forwards to. */
const AUTH_PATH_PREFIX = "/api/auth/";

export const PROXY_SECRET_HEADER = "x-managevent-proxy-secret";

/**
 * The headers for the upstream request. `x-forwarded-for` is the address this server resolved,
 * never the caller's own header, and the shared secret goes with it so the API believes it.
 */
export function buildUpstreamHeaders(incoming: Headers, proxySecret: string | undefined): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = incoming.get(name);
    if (value) headers.set(name, value);
  }
  const clientIp = clientIpFromHeaders(incoming);
  if (clientIp) {
    headers.set("x-forwarded-for", clientIp);
    const secret = proxySecret?.trim();
    if (secret) headers.set(PROXY_SECRET_HEADER, secret);
  }
  return headers;
}

/**
 * The headers for our response: everything the API sent except body-encoding headers, with every
 * `Set-Cookie` appended as its own header (session, `two_factor`, `dont_remember`, ...), and
 * never cacheable.
 */
export function buildDownstreamHeaders(upstream: Headers): Headers {
  const headers = new Headers();
  upstream.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (DROPPED_RESPONSE_HEADERS.has(lower) || lower.startsWith(DROPPED_RESPONSE_PREFIX)) return;
    headers.set(name, value);
  });
  for (const cookie of upstream.getSetCookie()) headers.append("set-cookie", cookie);
  headers.set("cache-control", "private, no-store");
  headers.set("x-robots-tag", "noindex, nofollow");
  return headers;
}

/**
 * The API URL for an incoming proxy URL: same path and query, on the API origin. Null when the
 * path is not strictly inside the API's auth mount, so this route can never be used to reach
 * another API route (`/v1/...`) carrying this server's proxy secret.
 *
 * `new URL()` already resolves `.`, `..` and their `%2e` spellings, so a path that climbs out no
 * longer starts with the prefix. Encoded slashes and backslashes are refused as well: no auth
 * endpoint contains one, and a server that decoded them would see a different path than we do.
 */
export function upstreamUrl(apiUrl: string, requestUrl: string): string | null {
  const { pathname, search } = new URL(requestUrl);
  if (!pathname.startsWith(AUTH_PATH_PREFIX)) return null;
  if (/%2f|%5c|\\|\/\/|\/\.{1,2}(?:\/|$)/i.test(pathname)) return null;
  return `${apiUrl.replace(/\/+$/, "")}${pathname}${search}`;
}
