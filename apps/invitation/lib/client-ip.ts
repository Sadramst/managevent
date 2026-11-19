/**
 * The visitor's IP address as seen by this Next server, forwarded to the API so rate limits and
 * consent records apply per visitor rather than per web server.
 *
 * The API only believes the forwarded address on a request that also carries the shared secret
 * (`API_PROXY_SECRET`), so this value is never trusted from the public internet directly.
 */

import { isIP } from "node:net";

function clean(value: string | null | undefined): string | undefined {
  const candidate = value?.split(",")[0]?.trim();
  if (!candidate) return undefined;
  // Drop anything that is not a syntactically valid IPv4 or IPv6 literal.
  return isIP(candidate) !== 0 ? candidate : undefined;
}

/**
 * Reads the client address from the two headers our own edge (Caddy, `infra/vps/Caddyfile`)
 * writes on every request: `x-real-ip`, then the first hop of `x-forwarded-for`. Headers of
 * hosting platforms we do not run on are deliberately not read: nothing in front of this server
 * sets them, so a visitor could choose the address. Returns undefined when nothing usable is
 * present (`next start` on localhost).
 */
export function clientIpFromHeaders(headers: Pick<Headers, "get">): string | undefined {
  return clean(headers.get("x-real-ip")) ?? clean(headers.get("x-forwarded-for"));
}
