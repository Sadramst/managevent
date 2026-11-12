import { isIP } from "node:net";

/**
 * The visitor's address as the edge proxy reported it, for forwarding to the API as
 * `x-forwarded-for` (the API only believes it together with the shared proxy secret).
 *
 * Only the two headers our own edge (Caddy, `infra/vps/Caddyfile`) writes on every request are
 * read: `x-real-ip`, which it sets to the connection's address, then the first hop of
 * `x-forwarded-for`, which it rewrites. Headers of platforms we do not run on (`fly-client-ip`,
 * `x-vercel-forwarded-for`) are deliberately NOT read: nothing in front of this server sets
 * them, so a visitor could type one and choose the address the API records and rate limits.
 * Anything that is not a syntactically valid IP is ignored.
 */
export function clientIpFromHeaders(headers: Headers): string | undefined {
  const candidates = [headers.get("x-real-ip"), headers.get("x-forwarded-for")?.split(",")[0]];
  for (const candidate of candidates) {
    let value = candidate?.trim() ?? "";
    if (value.startsWith("[") && value.endsWith("]")) value = value.slice(1, -1);
    // An IPv4 client seen through a dual-stack socket.
    if (value.toLowerCase().startsWith("::ffff:") && isIP(value.slice(7)) === 4) {
      value = value.slice(7);
    }
    if (isIP(value) !== 0) return value;
  }
  return undefined;
}
