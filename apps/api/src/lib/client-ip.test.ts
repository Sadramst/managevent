import { describe, expect, it } from "vitest";
import {
  type ClientIpConfig,
  clientIpConfigFromEnv,
  isTrustedProxyRequest,
  PROXY_SECRET_HEADER,
  rateLimitIpKey,
  resolveClientIp,
  toAuthClientIp,
  toCanonicalIp,
} from "./client-ip.js";

const SECRET = "client-ip-test-secret-0123456789abcdef";
const headers = (init: Record<string, string>) => new Headers(init);

describe("lib/client-ip", () => {
  it("reads its configuration from the environment and refuses a short secret", () => {
    expect(clientIpConfigFromEnv({})).toEqual({ proxySecret: null, trustedHeader: null });
    expect(
      clientIpConfigFromEnv({
        API_PROXY_SECRET: ` ${SECRET} `,
        TRUSTED_CLIENT_IP_HEADER: "Fly-Client-IP",
      }),
    ).toEqual({ proxySecret: SECRET, trustedHeader: "fly-client-ip" });
    expect(clientIpConfigFromEnv({ API_PROXY_SECRET: "", TRUSTED_CLIENT_IP_HEADER: " " })).toEqual({
      proxySecret: null,
      trustedHeader: null,
    });
    expect(() => clientIpConfigFromEnv({ API_PROXY_SECRET: "too-short" })).toThrow(/32/);
  });

  it("normalises addresses and rejects everything that is not one", () => {
    expect(toCanonicalIp(" 203.0.113.7 ")).toBe("203.0.113.7");
    expect(toCanonicalIp("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(toCanonicalIp("[2001:DB8::1]")).toBe("2001:db8::1");
    expect(toCanonicalIp("fe80::1%eth0")).toBe("fe80::1");
    for (const bad of [
      "",
      "x",
      "unknown",
      "203.0.113.7:8080",
      "999.1.1.1",
      "1.2.3",
      null,
      undefined,
    ]) {
      expect(toCanonicalIp(bad)).toBeNull();
    }
  });

  it("falls back to the connection address when no header can be trusted", () => {
    const direct: ClientIpConfig = { proxySecret: null, trustedHeader: null };
    const spoofed = headers({
      "x-forwarded-for": "203.0.113.7",
      "x-real-ip": "203.0.113.8",
      "fly-client-ip": "203.0.113.9",
      [PROXY_SECRET_HEADER]: SECRET,
    });
    expect(resolveClientIp(spoofed, "::ffff:192.0.2.44", direct)).toBe("192.0.2.44");
    expect(resolveClientIp(spoofed, undefined, direct)).toBeNull();
    // The secret header means nothing when no secret is configured.
    expect(isTrustedProxyRequest(spoofed, direct)).toBe(false);
  });

  it("believes x-forwarded-for only together with the shared secret", () => {
    const config: ClientIpConfig = { proxySecret: SECRET, trustedHeader: "fly-client-ip" };
    const fromOurServer = headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      [PROXY_SECRET_HEADER]: SECRET,
      "fly-client-ip": "198.51.100.5",
    });
    expect(isTrustedProxyRequest(fromOurServer, config)).toBe(true);
    expect(resolveClientIp(fromOurServer, "192.0.2.1", config)).toBe("203.0.113.7");

    for (const secret of ["", "wrong", `${SECRET}x`, SECRET.slice(0, -1)]) {
      const forged = headers({
        "x-forwarded-for": "203.0.113.7",
        [PROXY_SECRET_HEADER]: secret,
        "fly-client-ip": "198.51.100.5",
      });
      expect(isTrustedProxyRequest(forged, config)).toBe(false);
      expect(resolveClientIp(forged, "192.0.2.1", config)).toBe("198.51.100.5");
    }

    // Our server forwarded nothing usable: the edge header, then the connection.
    const noForward = headers({ [PROXY_SECRET_HEADER]: SECRET, "x-forwarded-for": "x" });
    expect(resolveClientIp(noForward, "192.0.2.1", config)).toBe("192.0.2.1");
  });

  it("keys IPv6 callers by /64 and IPv4 callers by address", () => {
    expect(rateLimitIpKey("203.0.113.7")).toBe("203.0.113.7");
    expect(rateLimitIpKey("unknown")).toBe("unknown");
    expect(rateLimitIpKey("2001:db8:1:2::5")).toBe("2001:db8:1:2::/64");
    expect(rateLimitIpKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).toBe("2001:db8:1:2::/64");
    expect(rateLimitIpKey("2001:db8:1:3::5")).toBe("2001:db8:1:3::/64");
    expect(rateLimitIpKey("::1")).toBe("0:0:0:0::/64");
  });

  it("spells the address the way Better Auth's limiter accepts, and never leaves it empty", () => {
    // Better Auth 1.2.12 only counts dotted IPv4 or IPv6 written as eight groups.
    const accepted = (ip: string) =>
      /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ip);
    for (const ip of [
      "203.0.113.7",
      "::1",
      "2001:db8::1",
      "2001:db8:1:2:aaaa:bbbb:cccc:dddd",
      "64:ff9b::192.0.2.1",
      null,
    ]) {
      expect(accepted(toAuthClientIp(ip))).toBe(true);
    }
    expect(toAuthClientIp("203.0.113.7")).toBe("203.0.113.7");
    expect(toAuthClientIp("2001:db8:1:2::5")).toBe("2001:db8:1:2:0:0:0:0");
    expect(toAuthClientIp("64:ff9b::192.0.2.1")).toBe("64:ff9b:0:0:0:0:0:0");
    expect(toAuthClientIp(null)).toBe("0.0.0.0");
    expect(toAuthClientIp("unknown")).toBe("0.0.0.0");
  });
});
