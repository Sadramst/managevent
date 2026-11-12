import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

type FetchArgs = [input: string | URL | Request, init?: RequestInit];

const fetchMock = vi.fn<(...args: FetchArgs) => Promise<Response>>();

function upstream(
  status: number,
  body: string | null,
  headers: Array<[string, string]> = [],
): Response {
  const responseHeaders = new Headers();
  for (const [name, value] of headers) responseHeaders.append(name, value);
  return new Response(body, { status, headers: responseHeaders });
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
  vi.stubEnv("API_URL", "http://api.internal:4000/");
  vi.stubEnv("API_PROXY_SECRET", "shared-secret-for-tests");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("auth proxy", () => {
  it("forwards a sign-in with origin, referer, cookie, client IP and the shared secret", async () => {
    fetchMock.mockResolvedValue(
      upstream(200, JSON.stringify({ redirect: false, token: "t", user: { id: "usr_1" } }), [
        ["content-type", "application/json"],
        ["set-cookie", "managevent.session_token=abc; Path=/; HttpOnly; SameSite=Lax"],
        ["set-cookie", "managevent.session_data=def; Path=/; HttpOnly; SameSite=Lax"],
        ["content-length", "999"],
        ["content-encoding", "gzip"],
      ]),
    );
    const request = new NextRequest("http://localhost:3001/api/auth/sign-in/email?x=1", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3001",
        referer: "http://localhost:3001/sign-in",
        cookie: "managevent.two_factor=zzz",
        "user-agent": "vitest",
        "x-forwarded-for": "203.0.113.7, 10.0.0.2",
        "x-managevent-proxy-secret": "sent-by-the-browser",
        "x-evil": "dropped",
      },
      body: JSON.stringify({ email: "host@example.com", password: "a long password" }),
    });

    const response = await POST(request);

    const { url, init, headers } = lastCall();
    expect(url).toBe("http://api.internal:4000/api/auth/sign-in/email?x=1");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("manual");
    expect(init.cache).toBe("no-store");
    expect(headers.get("origin")).toBe("http://localhost:3001");
    expect(headers.get("referer")).toBe("http://localhost:3001/sign-in");
    expect(headers.get("cookie")).toBe("managevent.two_factor=zzz");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
    // The secret comes from this server's environment, never from the browser's request.
    expect(headers.get("x-managevent-proxy-secret")).toBe("shared-secret-for-tests");
    expect(headers.get("x-evil")).toBeNull();
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toContain("host@example.com");

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([
      "managevent.session_token=abc; Path=/; HttpOnly; SameSite=Lax",
      "managevent.session_data=def; Path=/; HttpOnly; SameSite=Lax",
    ]);
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    // The session token is a bearer credential; the cookie already carries the session.
    await expect(response.json()).resolves.toEqual({ redirect: false, user: { id: "usr_1" } });
  });

  it("passes error statuses and bodies through unchanged", async () => {
    fetchMock.mockResolvedValue(
      upstream(401, JSON.stringify({ code: "INVALID_EMAIL_OR_PASSWORD" }), [
        ["content-type", "application/json"],
      ]),
    );
    const response = await POST(
      new NextRequest("http://localhost:3001/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3001" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ code: "INVALID_EMAIL_OR_PASSWORD" });
  });

  it("passes a redirect through without following it (magic-link verify)", async () => {
    fetchMock.mockResolvedValue(
      upstream(302, null, [
        ["location", "http://localhost:3001/studio"],
        ["set-cookie", "managevent.session_token=abc; Path=/; HttpOnly"],
      ]),
    );
    const response = await GET(
      new NextRequest("http://localhost:3001/api/auth/magic-link/verify?token=tok"),
    );
    const { url, init, headers } = lastCall();
    expect(url).toBe("http://api.internal:4000/api/auth/magic-link/verify?token=tok");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    // No client address known: nothing is forwarded for it.
    expect(headers.get("x-forwarded-for")).toBeNull();
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost:3001/studio");
    expect(response.headers.getSetCookie()).toHaveLength(1);
  });

  it("sends no secret header when none is configured", async () => {
    vi.stubEnv("API_PROXY_SECRET", "");
    fetchMock.mockResolvedValue(upstream(200, "{}", [["content-type", "application/json"]]));
    await POST(
      new NextRequest("http://localhost:3001/api/auth/sign-out", {
        method: "POST",
        headers: { "content-type": "application/json", "x-managevent-proxy-secret": "forged" },
        body: "{}",
      }),
    );
    expect(lastCall().headers.get("x-managevent-proxy-secret")).toBeNull();
  });

  it("answers 502 in the API error shape when the API cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const response = await POST(
      new NextRequest("http://localhost:3001/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "NETWORK_ERROR" } });
  });

  it("refuses paths outside /api/auth/", async () => {
    const response = await GET(new NextRequest("http://localhost:3001/api/other/thing"));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never emits CORS headers, whatever origin asks", async () => {
    // What the API answers a trusted sibling origin (www, the portal) with.
    fetchMock.mockResolvedValue(
      upstream(200, JSON.stringify({ twoFactorRedirect: true }), [
        ["content-type", "application/json"],
        ["access-control-allow-origin", "http://localhost:3100"],
        ["access-control-allow-credentials", "true"],
        ["access-control-expose-headers", "set-auth-token"],
        ["vary", "Origin"],
        ["set-auth-token", "signed-session-token"],
        ["x-request-id", "req_1"],
      ]),
    );
    const response = await POST(
      new NextRequest("http://localhost:3001/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3100" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
    const names = [...response.headers.keys()];
    expect(names.filter((name) => name.startsWith("access-control-"))).toEqual([]);
    expect(response.headers.get("vary")).toBeNull();
    expect(response.headers.get("set-auth-token")).toBeNull();
    expect(response.headers.get("x-request-id")).toBe("req_1");
  });

  it("does not forward the browser's authorization header", async () => {
    fetchMock.mockResolvedValue(upstream(200, "{}", [["content-type", "application/json"]]));
    await POST(
      new NextRequest("http://localhost:3001/api/auth/sign-out", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer stolen" },
        body: "{}",
      }),
    );
    expect(lastCall().headers.get("authorization")).toBeNull();
  });

  it.each([
    ["GET", "/api/auth/get-session"],
    ["GET", "/api/auth/list-sessions"],
    ["GET", "/api/auth/list-accounts"],
    ["GET", "/api/auth/error?error=Your%20account%20is%20locked"],
    ["GET", "/api/auth/sign-out"],
    ["GET", "/api/auth/reset-password/tok/extra"],
    ["GET", "/api/auth/magic-link/verify/%2e%2e/get-session"],
    ["POST", "/api/auth/get-session"],
    ["POST", "/api/auth/revoke-sessions"],
    ["POST", "/api/auth/change-password"],
    ["POST", "/api/auth/two-factor/disable"],
    ["POST", "/api/auth/sign-in/email/"],
  ])("answers 404 and forwards nothing for %s %s", async (method, path) => {
    const request = new NextRequest(`http://localhost:3001${path}`, {
      method,
      ...(method === "POST" ? { headers: { "content-type": "application/json" }, body: "{}" } : {}),
    });
    const response = await (method === "GET" ? GET(request) : POST(request));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "/api/auth/sign-in/email",
    "/api/auth/sign-up/email",
    "/api/auth/sign-in/magic-link",
    "/api/auth/two-factor/verify-totp",
    "/api/auth/two-factor/verify-backup-code",
    "/api/auth/forget-password",
    "/api/auth/reset-password",
    "/api/auth/sign-out",
  ])("forwards POST %s", async (path) => {
    fetchMock.mockResolvedValue(upstream(200, "{}", [["content-type", "application/json"]]));
    const response = await POST(
      new NextRequest(`http://localhost:3001${path}`, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
    expect(lastCall().url).toBe(`http://api.internal:4000${path}`);
  });

  it("forwards the emailed password-reset link and passes its redirect through", async () => {
    const query = "?callbackURL=http%3A%2F%2Flocalhost%3A3001%2Freset-password";
    fetchMock.mockResolvedValue(
      upstream(302, null, [["location", "http://localhost:3001/reset-password?token=abc123"]]),
    );
    const response = await GET(
      new NextRequest(`http://localhost:3001/api/auth/reset-password/abc123${query}`),
    );
    expect(lastCall().url).toBe(`http://api.internal:4000/api/auth/reset-password/abc123${query}`);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/reset-password?token=abc123",
    );
  });

  it("sends a redirect to Better Auth's error page to the sign-in page instead", async () => {
    fetchMock.mockResolvedValue(
      upstream(302, null, [
        ["location", "http://api.internal:4000/api/auth/error?error=attacker%20text"],
      ]),
    );
    const response = await GET(
      new NextRequest("http://localhost:3001/api/auth/magic-link/verify?token=tok"),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/sign-in?error=link");
  });

  it("removes the session token from a session object as well", async () => {
    fetchMock.mockResolvedValue(
      upstream(200, JSON.stringify({ token: "t", session: { id: "s1", token: "t" } }), [
        ["content-type", "application/json; charset=utf-8"],
      ]),
    );
    const response = await POST(
      new NextRequest("http://localhost:3001/api/auth/two-factor/verify-totp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "123456" }),
      }),
    );
    await expect(response.json()).resolves.toEqual({ session: { id: "s1" } });
  });

  it("refuses a body over 16 KB by its Content-Length, without forwarding it", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3001/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(30 * 1024 * 1024),
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a body over 16 KB even when Content-Length is missing or untrue", async () => {
    const big = JSON.stringify({ email: "a@example.com", password: "x".repeat(17 * 1024) });
    for (const declared of [undefined, "10"]) {
      const response = await POST(
        new NextRequest("http://localhost:3001/api/auth/sign-in/email", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(declared ? { "content-length": declared } : {}),
          },
          body: big,
        }),
      );
      expect(response.status).toBe(413);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a body just under the limit", async () => {
    fetchMock.mockResolvedValue(upstream(401, "{}", [["content-type", "application/json"]]));
    const body = JSON.stringify({ email: "a@example.com", password: "x".repeat(15 * 1024) });
    const response = await POST(
      new NextRequest("http://localhost:3001/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );
    expect(response.status).toBe(401);
    expect(new TextDecoder().decode(lastCall().init.body as ArrayBuffer)).toBe(body);
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", null])(
    "refuses a POST that is not JSON (%s)",
    async (contentType) => {
      const response = await POST(
        new NextRequest("http://localhost:3001/api/auth/sign-in/email", {
          method: "POST",
          headers: contentType ? { "content-type": contentType } : {},
          body: "email=a%40example.com",
        }),
      );
      expect(response.status).toBe(415);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
