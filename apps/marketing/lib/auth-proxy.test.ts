import { describe, expect, it } from "vitest";
import {
  buildDownstreamHeaders,
  buildUpstreamHeaders,
  PROXY_SECRET_HEADER,
  upstreamUrl,
} from "./auth-proxy";
import { clientIpFromHeaders } from "./client-ip";
import { ADMIN_PATH_HEADER, isAdminPath } from "./admin/constants";

const SECRET = "s".repeat(40);

describe("clientIpFromHeaders", () => {
  it("prefers the header our edge sets from the connection", () => {
    expect(
      clientIpFromHeaders(
        new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" }),
      ),
    ).toBe("203.0.113.7");
  });

  it("ignores the headers of platforms we do not run on, which a visitor could type", () => {
    expect(
      clientIpFromHeaders(
        new Headers({
          "fly-client-ip": "192.0.2.66",
          "x-vercel-forwarded-for": "192.0.2.67",
          "x-forwarded-for": "198.51.100.1",
        }),
      ),
    ).toBe("198.51.100.1");
    expect(clientIpFromHeaders(new Headers({ "fly-client-ip": "192.0.2.66" }))).toBeUndefined();
  });

  it("takes the first hop of x-forwarded-for and normalises it", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe(
      "198.51.100.1",
    );
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "::ffff:127.0.0.1" }))).toBe(
      "127.0.0.1",
    );
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "[2001:db8::1]" }))).toBe("2001:db8::1");
  });

  it("ignores anything that is not an IP address", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "evil, 198.51.100.1" }))).toBe(
      undefined,
    );
    expect(clientIpFromHeaders(new Headers())).toBeUndefined();
  });
});

describe("buildUpstreamHeaders", () => {
  const incoming = new Headers({
    cookie: "managevent.session_token=abc",
    "content-type": "application/json",
    origin: "https://www.managevent.com.au",
    referer: "https://www.managevent.com.au/admin/sign-in",
    "user-agent": "Test",
    accept: "application/json",
    host: "www.managevent.com.au",
    "x-forwarded-for": "203.0.113.7",
    [PROXY_SECRET_HEADER]: "forged",
    [ADMIN_PATH_HEADER]: "/admin",
    "x-user-id": "usr_forged",
  });

  it("forwards Origin and Referer, which Better Auth's CSRF check depends on", () => {
    const headers = buildUpstreamHeaders(incoming, SECRET);
    expect(headers.get("origin")).toBe("https://www.managevent.com.au");
    expect(headers.get("referer")).toBe("https://www.managevent.com.au/admin/sign-in");
    expect(headers.get("cookie")).toBe("managevent.session_token=abc");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("user-agent")).toBe("Test");
  });

  it("sends the resolved client address with our own secret, never the caller's", () => {
    const headers = buildUpstreamHeaders(incoming, SECRET);
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(headers.get(PROXY_SECRET_HEADER)).toBe(SECRET);
  });

  it("drops everything else, including identity headers and the host", () => {
    const headers = buildUpstreamHeaders(incoming, undefined);
    expect(headers.has("host")).toBe(false);
    expect(headers.has("x-user-id")).toBe(false);
    expect(headers.has(ADMIN_PATH_HEADER)).toBe(false);
    // No secret configured: the caller's forged one is not passed on either.
    expect(headers.has(PROXY_SECRET_HEADER)).toBe(false);
  });

  it("sends neither address nor secret when the address is unknown", () => {
    const headers = buildUpstreamHeaders(new Headers({ "x-forwarded-for": "not-an-ip" }), SECRET);
    expect(headers.has("x-forwarded-for")).toBe(false);
    expect(headers.has(PROXY_SECRET_HEADER)).toBe(false);
  });
});

describe("buildDownstreamHeaders", () => {
  it("passes every Set-Cookie through as its own header and never caches", () => {
    const upstream = new Headers({
      "content-type": "application/json",
      "content-encoding": "gzip",
      "content-length": "42",
      "cache-control": "public, max-age=60",
    });
    upstream.append("set-cookie", "managevent.session_token=abc; Path=/; HttpOnly; SameSite=Lax");
    upstream.append("set-cookie", "managevent.two_factor=; Max-Age=0; Path=/");
    const headers = buildDownstreamHeaders(upstream);
    expect(headers.getSetCookie()).toEqual([
      "managevent.session_token=abc; Path=/; HttpOnly; SameSite=Lax",
      "managevent.two_factor=; Max-Age=0; Path=/",
    ]);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.has("content-encoding")).toBe(false);
    expect(headers.has("content-length")).toBe(false);
    expect(headers.get("cache-control")).toBe("private, no-store");
    expect(headers.get("x-robots-tag")).toContain("noindex");
  });

  it("never relays the API's CORS headers: the proxy is same-origin only", () => {
    const headers = buildDownstreamHeaders(
      new Headers({
        "content-type": "application/json",
        "access-control-allow-origin": "https://invitation.managevent.com.au",
        "access-control-allow-credentials": "true",
        "access-control-expose-headers": "x-request-id",
        vary: "Origin",
      }),
    );
    expect([...headers.keys()].filter((name) => name.startsWith("access-control-"))).toEqual([]);
    expect(headers.get("content-type")).toBe("application/json");
  });
});

describe("upstreamUrl", () => {
  it("keeps the path and query on the API origin", () => {
    expect(
      upstreamUrl("http://api:4000/", "https://www.managevent.com.au/api/auth/sign-in/email?x=1"),
    ).toBe("http://api:4000/api/auth/sign-in/email?x=1");
    expect(upstreamUrl("http://api:4000", "http://localhost:3100/api/auth/get-session")).toBe(
      "http://api:4000/api/auth/get-session",
    );
  });

  it("refuses every path that is not strictly inside the API's auth mount", () => {
    for (const path of [
      "/api/auth/../../v1/leads",
      "/api/auth/%2e%2e/%2e%2e/v1/leads",
      "/api/auth/.%2E/v1/me",
      "/api/auth/..%2f..%2fv1%2fleads",
      "/api/auth/x%5c..%5c..%5cv1/leads",
      "/api/auth//v1/leads",
      "/api/auth",
      "/api/authx/sign-in",
      "/v1/leads",
    ]) {
      expect(
        upstreamUrl("http://api:4000", `https://www.managevent.com.au${path}`),
        path,
      ).toBeNull();
    }
  });

  it("keeps a path that resolves inside the auth mount inside it", () => {
    // The URL parser resolves dot segments and backslashes before the check runs.
    expect(upstreamUrl("http://api:4000", "https://www.managevent.com.au/api/auth/x/../ok")).toBe(
      "http://api:4000/api/auth/ok",
    );
    expect(
      upstreamUrl("http://api:4000", "https://www.managevent.com.au/api/auth/x\\..\\v1/leads"),
    ).toBe("http://api:4000/api/auth/v1/leads");
  });
});

describe("isAdminPath", () => {
  it("matches the console and nothing that merely starts with the same letters", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/leads/x")).toBe(true);
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/en/admin")).toBe(false);
    expect(isAdminPath("/")).toBe(false);
  });
});
