/**
 * Where a request really came from.
 *
 * `x-forwarded-for` is typed by whoever sends the request, so on its own it proves nothing: a
 * caller could rotate it to get a fresh rate-limit bucket per request, or put a forged address on
 * a consent or audit row. The address is therefore taken from the first source that the caller
 * cannot forge:
 *
 * 1. `x-forwarded-for`, but ONLY on a request that carries our own web servers' shared secret
 *    (`API_PROXY_SECRET`, sent as `x-managevent-proxy-secret`). The Next apps call the API
 *    server-to-server and pass the visitor's address this way.
 * 2. The header the edge proxy sets (`TRUSTED_CLIENT_IP_HEADER`; `x-real-ip` behind Caddy in
 *    production). When the header holds a list, the last entry is the one the proxy added.
 * 3. The address of the TCP connection.
 *
 * When none of them yields an address the request is `"unknown"`, and every limiter puts it in
 * one shared bucket: an unidentified caller is never left unlimited.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

/** Header our own web servers send to have their `x-forwarded-for` believed. */
export const PROXY_SECRET_HEADER = "x-managevent-proxy-secret";
export const UNKNOWN_CLIENT_IP = "unknown";

const MIN_PROXY_SECRET_LENGTH = 32;

export interface ClientIpConfig {
  /** `API_PROXY_SECRET`: shared with the web apps; null when not configured. */
  proxySecret: string | null;
  /** `TRUSTED_CLIENT_IP_HEADER`: lowercase name of the edge proxy's header; null when none. */
  trustedHeader: string | null;
}

/** Reads the configuration at call time. A secret that is set but too short is a hard error. */
export function clientIpConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ClientIpConfig {
  const proxySecret = env.API_PROXY_SECRET?.trim() || null;
  if (proxySecret !== null && proxySecret.length < MIN_PROXY_SECRET_LENGTH) {
    throw new Error(`API_PROXY_SECRET must be at least ${MIN_PROXY_SECRET_LENGTH} characters`);
  }
  const trustedHeader = env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase() || null;
  return { proxySecret, trustedHeader };
}

/** A syntactically valid IPv4 or IPv6 address in a stable spelling, or null. */
export function toCanonicalIp(value: string | null | undefined): string | null {
  let candidate = value?.trim() ?? "";
  if (candidate.startsWith("[") && candidate.endsWith("]")) candidate = candidate.slice(1, -1);
  const zone = candidate.indexOf("%");
  if (zone !== -1) candidate = candidate.slice(0, zone);
  candidate = candidate.toLowerCase();
  // An IPv4 client seen through a dual-stack socket.
  if (candidate.startsWith("::ffff:") && isIP(candidate.slice(7)) === 4) {
    candidate = candidate.slice(7);
  }
  return isIP(candidate) === 0 ? null : candidate;
}

function secretsMatch(given: string | null, expected: string): boolean {
  if (!given) return false;
  // Hash both sides so the comparison is constant-time whatever the lengths.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** True when the request carries the shared secret of our own web servers. */
export function isTrustedProxyRequest(headers: Headers, config: ClientIpConfig): boolean {
  return (
    config.proxySecret !== null &&
    secretsMatch(headers.get(PROXY_SECRET_HEADER), config.proxySecret)
  );
}

/** The client address from the first trustworthy source, or null when there is none. */
export function resolveClientIp(
  headers: Headers,
  socketAddress: string | null | undefined,
  config: ClientIpConfig,
): string | null {
  if (isTrustedProxyRequest(headers, config)) {
    const forwarded = toCanonicalIp(headers.get("x-forwarded-for")?.split(",")[0]);
    if (forwarded) return forwarded;
  }
  if (config.trustedHeader) {
    const fromEdge = toCanonicalIp(headers.get(config.trustedHeader)?.split(",").at(-1));
    if (fromEdge) return fromEdge;
  }
  return toCanonicalIp(socketAddress);
}

/** The eight groups of an IPv6 address, each as up to four hex digits. */
function ipv6Groups(ip: string): string[] {
  let address = ip;
  const lastColon = address.lastIndexOf(":");
  const tail = address.slice(lastColon + 1);
  if (tail.includes(".")) {
    // Embedded IPv4 (`64:ff9b::192.0.2.1`): the dotted quad is the last two groups.
    const [a = 0, b = 0, c = 0, d = 0] = tail.split(".").map(Number);
    address = `${address.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head = "", rest] = address.split("::");
  const left = head.length > 0 ? head.split(":") : [];
  const right = rest !== undefined && rest.length > 0 ? rest.split(":") : [];
  const missing = rest === undefined ? 0 : Math.max(0, 8 - left.length - right.length);
  return [...left, ...Array<string>(missing).fill("0"), ...right].slice(0, 8);
}

/**
 * The key a per-IP limiter counts under. One IPv6 customer controls a whole /64 and can use a new
 * address from it for every request, so IPv6 is counted per /64 network; IPv4 per address.
 */
export function rateLimitIpKey(ip: string): string {
  if (isIP(ip) !== 6) return ip;
  return `${ipv6Groups(ip).slice(0, 4).join(":")}::/64`;
}

/**
 * The value for Better Auth's client IP header. Its limiter only counts values it recognises as
 * an IP (dotted IPv4, or IPv6 written out in eight groups) and silently skips everything else, so
 * the address is spelled the way it expects: IPv4 as is, IPv6 as its /64 network in full, and an
 * unknown client as `0.0.0.0` (one shared bucket).
 */
export function toAuthClientIp(ip: string | null): string {
  if (ip === null) return "0.0.0.0";
  const version = isIP(ip);
  if (version === 4) return ip;
  if (version !== 6) return "0.0.0.0";
  return [...ipv6Groups(ip).slice(0, 4), "0", "0", "0", "0"].join(":");
}
