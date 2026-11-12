import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALLOWED_AUTH_POSTS,
  buildDownstreamHeaders,
  buildUpstreamHeaders,
  MAX_BODY_BYTES,
  PROXY_SECRET_HEADER,
  proxyAuthRequest,
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
    authorization: "Bearer stolen-token",
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
    expect(headers.has("authorization")).toBe(false);
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

describe("proxyAuthRequest", () => {
  type FetchArgs = [input: string | URL | Request, init?: RequestInit];
  const fetchMock = vi.fn<(...args: FetchArgs) => Promise<Response>>();
  const options = { apiUrl: "http://api.internal:4000/", proxySecret: SECRET };
  const site = "https://www.managevent.com.au";

  function post(path: string, body: string, headers: Record<string, string> = {}): Request {
    return new Request(`${site}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: site, ...headers },
      body,
    });
  }

  function lastCall(): { url: string; init: RequestInit; headers: Headers } {
    const call = fetchMock.mock.calls.at(-1);
    if (!call) throw new Error("fetch was not called");
    const init = call[1] ?? {};
    return { url: String(call[0]), init, headers: new Headers(init.headers) };
  }

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows exactly the calls the staff sign-in form makes", () => {
    expect([...ALLOWED_AUTH_POSTS].sort()).toEqual([
      "/api/auth/sign-in/email",
      "/api/auth/sign-out",
      "/api/auth/two-factor/verify-totp",
    ]);
  });

  it("forwards an allowed call with the client address and secret, never authorization", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ twoFactorRedirect: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const response = await proxyAuthRequest(
      post("/api/auth/sign-in/email", JSON.stringify({ email: "a@b.co", password: "x" }), {
        authorization: "Bearer stolen-token",
        "x-real-ip": "203.0.113.7",
        cookie: "managevent.two_factor=zzz",
      }),
      options,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ twoFactorRedirect: true });
    const { url, init, headers } = lastCall();
    expect(url).toBe("http://api.internal:4000/api/auth/sign-in/email");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("manual");
    expect(headers.get("origin")).toBe(site);
    expect(headers.get("cookie")).toBe("managevent.two_factor=zzz");
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(headers.get(PROXY_SECRET_HEADER)).toBe(SECRET);
    expect(headers.has("authorization")).toBe(false);
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toContain("a@b.co");
  });

  it("answers 404 for every other auth endpoint and method, without calling the API", async () => {
    const refused: Request[] = [
      new Request(`${site}/api/auth/get-session`),
      new Request(`${site}/api/auth/sign-in/email`),
      post("/api/auth/get-session", "{}"),
      post("/api/auth/list-sessions", "{}"),
      post("/api/auth/sign-up/email", "{}"),
      post("/api/auth/sign-in/magic-link", "{}"),
      post("/api/auth/forget-password", "{}"),
      post("/api/auth/two-factor/enable", "{}"),
      post("/api/auth/two-factor/verify-backup-code", "{}"),
      post("/api/auth/sign-in/email/", "{}"),
      post("/api/auth/x/../sign-up/email", "{}"),
      post("/api/auth/..%2f..%2fv1%2fleads", "{}"),
    ];
    for (const request of refused) {
      const response = await proxyAuthRequest(request, options);
      expect(response.status, `${request.method} ${request.url}`).toBe(404);
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a body over the cap, declared or not, and a body that is not JSON", async () => {
    const big = "x".repeat(MAX_BODY_BYTES + 1);
    const declared = await proxyAuthRequest(post("/api/auth/sign-in/email", big), options);
    expect(declared.status).toBe(413);

    // No Content-Length: the body arrives as a stream and is counted while it is read.
    const chunk = new TextEncoder().encode("x".repeat(4096));
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent > MAX_BODY_BYTES * 2) {
          controller.close();
          return;
        }
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const streamed = new Request(`${site}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    expect((await proxyAuthRequest(streamed, options)).status).toBe(413);

    const form = post("/api/auth/sign-in/email", "email=a", {
      "content-type": "application/x-www-form-urlencoded",
    });
    expect((await proxyAuthRequest(form, options)).status).toBe(415);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("relays cookies but not CORS headers, the bearer header or the session token", async () => {
    const upstreamHeaders = new Headers({
      "content-type": "application/json",
      "access-control-allow-origin": "https://invitation.managevent.com.au",
      "access-control-allow-credentials": "true",
      "set-auth-token": "secret-session-token",
      vary: "Origin",
    });
    upstreamHeaders.append("set-cookie", "managevent.session_token=abc; Path=/; HttpOnly");
    const upstreamBody = {
      token: "secret-session-token",
      user: { id: "usr_1" },
      session: { token: "second-token", id: "s" },
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(upstreamBody), { status: 200, headers: upstreamHeaders }),
    );
    const response = await proxyAuthRequest(
      post("/api/auth/two-factor/verify-totp", JSON.stringify({ code: "123456" })),
      options,
    );

    expect(response.status).toBe(200);
    const names = [...response.headers.keys()];
    expect(names.filter((name) => name.startsWith("access-control-"))).toEqual([]);
    expect(response.headers.has("set-auth-token")).toBe(false);
    expect(response.headers.has("vary")).toBe(false);
    expect(response.headers.getSetCookie()).toEqual([
      "managevent.session_token=abc; Path=/; HttpOnly",
    ]);
    const text = await response.text();
    expect(text).not.toContain("secret-session-token");
    expect(text).not.toContain("second-token");
    expect(JSON.parse(text)).toEqual({ user: { id: "usr_1" }, session: { id: "s" } });
  });

  it("answers 502 when the API cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const response = await proxyAuthRequest(post("/api/auth/sign-out", "{}"), options);
    expect(response.status).toBe(502);
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
