/**
 * Shared infrastructure that needs no database: error envelope, origin guard, rate limiting,
 * email transport, environment-derived facts, localised text and the in-memory queue.
 */
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type ApiEnv,
  handleApiError,
  originGuard,
  requestIdMiddleware,
} from "../middleware/context.js";
import { rewriteAuthLinkOrigin } from "./auth.js";
import { isEmailConfigured, sendTransactionalEmail } from "./email.js";
import { getCapabilities, getPublicAppUrl, getTrustedOrigins, toOrigin } from "./env.js";
import { ApiProblem, isUniqueViolation, notFound, unauthenticated } from "./errors.js";
import { fromLocalized, toLocalized } from "./localized.js";
import { InMemoryJobQueue, PgBossJobQueue } from "./queue.js";
import { type ClientIpConfig, PROXY_SECRET_HEADER } from "./client-ip.js";
import {
  clientIp,
  clientIpMiddleware,
  createRateLimitScope,
  failureLimit,
  rateLimit,
  RL,
} from "./rate-limit.js";

const ENV_KEYS = [
  "RESEND_API_KEY",
  "EMAIL_FROM_TRANSACTIONAL",
  "STRIPE_SECRET_KEY",
  "AUTH_TRUSTED_ORIGINS",
  "NEXT_PUBLIC_MARKETING_URL",
  "NEXT_PUBLIC_INVITATION_URL",
  "NEXT_PUBLIC_PORTAL_URL",
  "NEXT_PUBLIC_VENDORS_URL",
  "NEXT_PUBLIC_ADMIN_URL",
  "NODE_ENV",
] as const;

function useCleanEnv(): void {
  const saved = new Map<string, string | undefined>();
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved.set(key, process.env[key]);
      if (key !== "NODE_ENV") delete process.env[key];
    }
  });
  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

/** A minimal app with the real request-id and error handling, plus per-app rate-limit state. */
/** As behind an edge proxy that sets `x-forwarded-for` itself: the tests name their client there. */
const BEHIND_PROXY: ClientIpConfig = { proxySecret: null, trustedHeader: "x-forwarded-for" };
/** As reached directly from the internet: no header says who the caller is. */
const DIRECT: ClientIpConfig = { proxySecret: null, trustedHeader: null };
const TEST_PROXY_SECRET = "unit-test-proxy-secret-0123456789abcdef";

function buildApp(options: { disabled?: boolean; clientIp?: ClientIpConfig } = {}): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>();
  const state = { disabled: options.disabled === true, scope: createRateLimitScope() };
  app.use("*", requestIdMiddleware());
  app.use("*", async (c, next) => {
    c.set("rateLimit", state);
    c.set("actor", null);
    await next();
  });
  app.use("*", clientIpMiddleware(options.clientIp ?? BEHIND_PROXY));
  app.onError((err, c) => handleApiError(err, c));
  return app;
}

type ErrorBody = { error: { code: string; message: string; details?: unknown; requestId: string } };

describe("lib/errors + handleApiError", () => {
  it("renders an ApiProblem in the standard envelope with its status, code and details", async () => {
    const app = buildApp();
    app.get("/closed", () => {
      throw new ApiProblem(409, "RSVP_CLOSED", "RSVPs are closed", { deadline: "2027-01-01" });
    });
    app.get("/missing", () => {
      throw notFound();
    });
    app.get("/anon", () => {
      throw unauthenticated();
    });
    app.get("/boom", () => {
      throw new Error("secret internal detail");
    });

    const closed = await app.request("/closed", { headers: { "x-request-id": "req_test_1" } });
    expect(closed.status).toBe(409);
    expect(await closed.json()).toEqual({
      error: {
        code: "RSVP_CLOSED",
        message: "RSVPs are closed",
        details: { deadline: "2027-01-01" },
        requestId: "req_test_1",
      },
    });

    const missing = await app.request("/missing");
    expect(missing.status).toBe(404);
    const missingBody = (await missing.json()) as ErrorBody;
    expect(missingBody.error.code).toBe("NOT_FOUND");
    expect(missingBody.error).not.toHaveProperty("details");

    expect((await app.request("/anon")).status).toBe(401);

    const boom = await app.request("/boom");
    expect(boom.status).toBe(500);
    const boomBody = (await boom.json()) as ErrorBody;
    expect(boomBody.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(boomBody)).not.toContain("secret internal detail");
  });

  it("recognises Prisma unique violations", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
    expect(isUniqueViolation(new Error("x"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe("middleware/originGuard", () => {
  const allowed = ["http://localhost:3001", "https://invitation.managevent.com.au"];

  function guarded(): Hono<ApiEnv> {
    const app = buildApp();
    app.use("/v1/*", originGuard(allowed));
    app.all("/v1/thing", (c) => c.json({ ok: true }));
    app.post("/api/auth/sign-in/email", (c) => c.json({ ok: true }));
    return app;
  }

  it("rejects a cookie-carrying write from an origin that is not allowed", async () => {
    const res = await guarded().request("/v1/thing", {
      method: "POST",
      headers: { cookie: "managevent.session_token=abc", origin: "https://evil.example" },
    });
    expect(res.status).toBe(403);
    expect(((await res.json()) as ErrorBody).error.code).toBe("FORBIDDEN");
  });

  it("allows trusted origins, cookie-less requests, origin-less requests and safe methods", async () => {
    const app = guarded();
    const cookie = "managevent.session_token=abc";
    const cases: Array<[string, Record<string, string>]> = [
      ["POST", { cookie, origin: "http://localhost:3001" }],
      ["PATCH", { cookie, origin: "https://invitation.managevent.com.au" }],
      // Server-to-server call from a Next app: cookie forwarded, no Origin header.
      ["POST", { cookie }],
      // Guest-token and bearer requests carry no cookie.
      ["POST", { origin: "https://evil.example" }],
      ["DELETE", { authorization: "Bearer token", origin: "https://evil.example" }],
      ["GET", { cookie, origin: "https://evil.example" }],
    ];
    for (const [method, headers] of cases) {
      const res = await app.request("/v1/thing", { method, headers });
      expect(res.status, `${method} ${JSON.stringify(headers)}`).toBe(200);
    }
  });

  it("does not match a look-alike origin and leaves non-/v1 paths alone", async () => {
    const app = guarded();
    const cookie = "managevent.session_token=abc";
    for (const origin of [
      "http://localhost:30010",
      "https://invitation.managevent.com.au.evil.example",
      "null",
    ]) {
      const res = await app.request("/v1/thing", { method: "POST", headers: { cookie, origin } });
      expect(res.status, origin).toBe(403);
    }
    const auth = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { cookie, origin: "https://evil.example" },
    });
    expect(auth.status).toBe(200);
  });
});

describe("lib/rate-limit", () => {
  it("never takes the client IP from a header the caller can set", async () => {
    const readIp = (app: Hono<ApiEnv>) => {
      app.get("/ip", (c) => c.json({ ip: clientIp(c) }));
      return async (headers: Record<string, string>) =>
        ((await (await app.request("/ip", { headers })).json()) as { ip: string }).ip;
    };

    // Reached directly: x-forwarded-for and x-real-ip are whatever the caller typed.
    const direct = readIp(buildApp({ clientIp: DIRECT }));
    expect(await direct({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })).toBe("unknown");
    expect(await direct({ "x-real-ip": "203.0.113.8" })).toBe("unknown");
    expect(await direct({ "fly-client-ip": "203.0.113.9" })).toBe("unknown");
    expect(await direct({})).toBe("unknown");

    // Our own web servers prove themselves with the shared secret; then their first hop counts.
    const proxied = readIp(
      buildApp({ clientIp: { proxySecret: TEST_PROXY_SECRET, trustedHeader: "fly-client-ip" } }),
    );
    expect(
      await proxied({
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        [PROXY_SECRET_HEADER]: TEST_PROXY_SECRET,
        "fly-client-ip": "198.51.100.200",
      }),
    ).toBe("203.0.113.7");
    // A wrong or missing secret: the forwarded address is ignored and the edge header decides.
    expect(
      await proxied({
        "x-forwarded-for": "203.0.113.7",
        [PROXY_SECRET_HEADER]: "not-the-secret",
        "fly-client-ip": "198.51.100.200",
      }),
    ).toBe("198.51.100.200");
    expect(
      await proxied({ "x-forwarded-for": "203.0.113.7", "fly-client-ip": "198.51.100.200" }),
    ).toBe("198.51.100.200");
    // A caller can prepend to a list header but the edge proxy's own entry is last.
    expect(await proxied({ "fly-client-ip": "203.0.113.1, 198.51.100.201" })).toBe(
      "198.51.100.201",
    );
    // Not an address at all.
    expect(await proxied({ "fly-client-ip": "x" })).toBe("unknown");
  });

  it("does not hand out a fresh bucket for a made-up x-forwarded-for hop", async () => {
    const app = buildApp({ clientIp: DIRECT });
    app.get("/limited", RL.publicMisc, (c) => c.json({ ok: true }));
    // 60 a minute per IP. Every request claims a different address, or none that parses.
    const statuses: number[] = [];
    for (let i = 0; i < 70; i += 1) {
      const forwarded = i % 2 === 0 ? `198.51.100.${i}` : `x, 203.0.113.${i}`;
      const res = await app.request("/limited", { headers: { "x-forwarded-for": forwarded } });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 60).every((status) => status === 200)).toBe(true);
    expect(statuses.slice(60).every((status) => status === 429)).toBe(true);
  });

  it("counts an IPv6 caller per /64 network, not per address", async () => {
    const app = buildApp();
    app.get("/limited", RL.publicMisc, (c) => c.json({ ok: true }));
    const from = (ip: string) => app.request("/limited", { headers: { "x-forwarded-for": ip } });
    // RL.publicMisc is keyed per /64: 60 requests from 60 addresses of one network use it up.
    for (let i = 0; i < 60; i += 1) {
      expect((await from(`2001:db8:1:2::${(i + 1).toString(16)}`)).status).toBe(200);
    }
    expect((await from("2001:db8:1:2:ffff::1")).status).toBe(429);
    expect((await from("2001:db8:1:3::1")).status).toBe(200);
  });

  it("allows `max` requests per key per window, then answers 429 with Retry-After", async () => {
    const app = buildApp();
    app.use(
      "/limited",
      rateLimit({ name: "t", windowMs: 60_000, max: 3, key: (c) => clientIp(c) }),
    );
    app.get("/limited", (c) => c.json({ ok: true }));

    const from = (ip: string) => app.request("/limited", { headers: { "x-forwarded-for": ip } });
    for (let i = 0; i < 3; i += 1) expect((await from("198.51.100.1")).status).toBe(200);
    const blocked = await from("198.51.100.1");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(((await blocked.json()) as ErrorBody).error.code).toBe("RATE_LIMITED");
    // Another key is unaffected.
    expect((await from("198.51.100.2")).status).toBe(200);
  });

  it("starts a new window once the old one has passed", async () => {
    const app = buildApp();
    app.use("/short", rateLimit({ name: "short", windowMs: 40, max: 1, key: () => "k" }));
    app.get("/short", (c) => c.json({ ok: true }));
    expect((await app.request("/short")).status).toBe(200);
    expect((await app.request("/short")).status).toBe(429);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect((await app.request("/short")).status).toBe(200);
  });

  it("skips limiting for a null key, keeps apps isolated, and can be disabled", async () => {
    const skipped = buildApp();
    skipped.use("/x", rateLimit({ name: "n", windowMs: 60_000, max: 1, key: () => null }));
    skipped.get("/x", (c) => c.json({ ok: true }));
    for (let i = 0; i < 5; i += 1) expect((await skipped.request("/x")).status).toBe(200);

    const limiter = rateLimit({ name: "shared", windowMs: 60_000, max: 1, key: () => "k" });
    const first = buildApp();
    first.get("/x", limiter, (c) => c.json({ ok: true }));
    const second = buildApp();
    second.get("/x", limiter, (c) => c.json({ ok: true }));
    expect((await first.request("/x")).status).toBe(200);
    expect((await first.request("/x")).status).toBe(429);
    // Same limiter, different app: its own counters.
    expect((await second.request("/x")).status).toBe(200);

    const disabled = buildApp({ disabled: true });
    disabled.get("/x", limiter, RL.publicMisc, RL.enumGuard, (c) => c.json({ ok: true }));
    for (let i = 0; i < 5; i += 1) expect((await disabled.request("/x")).status).toBe(200);
  });

  it("guestWrite limits per link (10/min) independently of the per-IP limit (20/min)", async () => {
    const app = buildApp();
    app.post("/v1/i/:eventSlug/:guestToken/rsvp", RL.guestWrite, (c) => c.json({ ok: true }));
    const post = (token: string, ip: string) =>
      app.request(`/v1/i/some-event-7kq2/${token}/rsvp`, {
        method: "POST",
        headers: { "x-forwarded-for": ip },
      });

    // One link, many IPs: the link bucket trips after 10.
    for (let i = 0; i < 10; i += 1) {
      expect((await post("guest-a-7kq2m9xp", `192.0.2.${i}`)).status).toBe(200);
    }
    expect((await post("guest-a-7kq2m9xp", "192.0.2.99")).status).toBe(429);
    // Token case and whitespace do not open a fresh bucket.
    expect((await post("GUEST-A-7KQ2M9XP", "192.0.2.98")).status).toBe(429);
    // Nor does any spelling of the event slug that the service resolves to the same link: it
    // trims and lowercases the slug, so the limiter must too.
    const variant = (slug: string, ip: string) =>
      app.request(`/v1/i/${slug}/guest-a-7kq2m9xp/rsvp`, {
        method: "POST",
        headers: { "x-forwarded-for": ip },
      });
    for (const [index, slug] of [
      "%20some-event-7kq2",
      "some-event-7kq2%09",
      "%0Asome-event-7kq2%20",
      "SOME-EVENT-7KQ2",
    ].entries()) {
      expect((await variant(slug, `192.0.2.${120 + index}`)).status).toBe(429);
    }

    // One IP, many links: the IP bucket trips after 20.
    for (let i = 0; i < 20; i += 1) {
      expect((await post(`guest-b${i}-7kq2m9xp`, "192.0.2.200")).status).toBe(200);
    }
    expect((await post("guest-zz-7kq2m9xp", "192.0.2.200")).status).toBe(429);
  });

  it("hostWrite limits per signed-in user, falling back to the IP for anonymous callers", async () => {
    const app = new Hono<ApiEnv>();
    const state = { disabled: false, scope: createRateLimitScope() };
    app.use("*", requestIdMiddleware());
    app.use("*", async (c, next) => {
      c.set("rateLimit", state);
      const userId = c.req.header("x-test-user");
      c.set("actor", userId ? { userId, roles: ["CUSTOMER_HOST"] } : null);
      await next();
    });
    app.post("/v1/events", RL.hostWrite, (c) => c.json({ ok: true }));

    const post = (headers: Record<string, string>) =>
      app.request("/v1/events", { method: "POST", headers });
    for (let i = 0; i < 120; i += 1) {
      expect(
        (await post({ "x-test-user": "usr_a", "x-forwarded-for": `192.0.2.${i}` })).status,
      ).toBe(200);
    }
    expect((await post({ "x-test-user": "usr_a" })).status).toBe(429);
    expect((await post({ "x-test-user": "usr_b" })).status).toBe(200);
    expect((await post({ "x-forwarded-for": "192.0.2.250" })).status).toBe(200);
  });

  it("bulk limits per event (10/hour)", async () => {
    const app = buildApp();
    app.post("/v1/events/:eventId/guests/import", RL.bulk, (c) => c.json({ ok: true }));
    for (let i = 0; i < 10; i += 1) {
      expect((await app.request("/v1/events/evt_a/guests/import", { method: "POST" })).status).toBe(
        200,
      );
    }
    expect((await app.request("/v1/events/evt_a/guests/import", { method: "POST" })).status).toBe(
      429,
    );
    expect((await app.request("/v1/events/evt_b/guests/import", { method: "POST" })).status).toBe(
      200,
    );
  });

  it("enumGuard blocks an IP after 30 not-found or gone responses, including thrown ones", async () => {
    const app = buildApp();
    app.get("/v1/i/:eventSlug/:guestToken", RL.enumGuard, (c) => {
      const token = c.req.param("guestToken");
      if (token === "real") return c.json({ ok: true });
      if (token === "revoked") throw new ApiProblem(410, "LINK_REVOKED", "This link was revoked");
      throw notFound();
    });
    const get = (token: string, ip: string) =>
      app.request(`/v1/i/some-event-7kq2/${token}`, { headers: { "x-forwarded-for": ip } });

    // Successful responses never count.
    for (let i = 0; i < 40; i += 1) expect((await get("real", "192.0.2.10")).status).toBe(200);

    for (let i = 0; i < 29; i += 1)
      expect((await get(`guess-${i}`, "192.0.2.11")).status).toBe(404);
    expect((await get("revoked", "192.0.2.11")).status).toBe(410);
    // The 31st request is refused, even for a link that exists.
    const blocked = await get("real", "192.0.2.11");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    // Other clients are unaffected.
    expect((await get("real", "192.0.2.12")).status).toBe(200);
  });

  it("enumGuard counts misses that are in flight together: 100 at once still means 30", async () => {
    const app = buildApp();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    app.get("/v1/i/:eventSlug/:guestToken", RL.enumGuard, async () => {
      // Every request reaches the handler before any of them has answered.
      await gate;
      throw notFound();
    });
    const pending = Array.from({ length: 100 }, (_, i) =>
      app.request(`/v1/i/some-event-7kq2/guess-${i}`, {
        headers: { "x-forwarded-for": "192.0.2.77" },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    release();
    const statuses = (await Promise.all(pending)).map((res) => res.status);
    expect(statuses.filter((status) => status === 404)).toHaveLength(30);
    expect(statuses.filter((status) => status === 429)).toHaveLength(70);
  });

  it("failureLimit gives the slot back for a success and keeps it for a failure", async () => {
    const app = buildApp();
    app.post(
      "/attempt/:outcome",
      failureLimit({
        name: "attempts",
        windowMs: 60_000,
        max: 3,
        key: async () => "account-1",
        isFailure: (status) => status >= 400,
      }),
      (c) => c.json({ ok: true }, c.req.param("outcome") === "ok" ? 200 : 401),
    );
    const attempt = (outcome: string) => app.request(`/attempt/${outcome}`, { method: "POST" });
    for (let i = 0; i < 10; i += 1) expect((await attempt("ok")).status).toBe(200);
    for (let i = 0; i < 3; i += 1) expect((await attempt("wrong")).status).toBe(401);
    // Locked for the rest of the window, even with the right answer.
    expect((await attempt("ok")).status).toBe(429);
  });
});

describe("lib/email", () => {
  useCleanEnv();

  it("reports not configured and refuses to send without RESEND_API_KEY", async () => {
    expect(isEmailConfigured()).toBe(false);
    let called = false;
    const attempt = sendTransactionalEmail(
      { to: "guest@example.com", subject: "Hello", text: "Body" },
      {
        fetchImpl: async () => {
          called = true;
          return new Response("{}");
        },
      },
    );
    await expect(attempt).rejects.toMatchObject({ status: 503, code: "EMAIL_NOT_CONFIGURED" });
    await expect(attempt).rejects.toBeInstanceOf(ApiProblem);
    expect(called).toBe(false);

    process.env.RESEND_API_KEY = "   ";
    expect(isEmailConfigured()).toBe(false);
  });

  it("posts to Resend with the key, sender, idempotency key and plain-text body", async () => {
    process.env.RESEND_API_KEY = "re_unit_test_key";
    process.env.EMAIL_FROM_TRANSACTIONAL = "Managevent <hello@managevent.com.au>";
    expect(isEmailConfigured()).toBe(true);

    const calls: Array<{ url: string; init: RequestInit }> = [];
    const result = await sendTransactionalEmail(
      {
        to: "guest@example.com",
        subject: "Your link",
        text: "Line one\nLine two",
        idempotencyKey: "magic:abc",
      },
      {
        fetchImpl: async (input, init) => {
          calls.push({ url: String(input), init: init ?? {} });
          return new Response(JSON.stringify({ id: "re_msg_123" }), { status: 200 });
        },
      },
    );

    expect(result).toEqual({ providerId: "re_msg_123" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.resend.com/emails");
    expect(calls[0]?.init.method).toBe("POST");
    const headers = new Headers(calls[0]?.init.headers);
    expect(headers.get("authorization")).toBe("Bearer re_unit_test_key");
    expect(headers.get("idempotency-key")).toBe("magic:abc");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      from: "Managevent <hello@managevent.com.au>",
      to: ["guest@example.com"],
      subject: "Your link",
      text: "Line one\nLine two",
    });
  });

  it("fails without leaking the recipient when the provider rejects or returns no id", async () => {
    process.env.RESEND_API_KEY = "re_unit_test_key";
    const rejected = sendTransactionalEmail(
      { to: "guest@example.com", subject: "s", text: "t" },
      { fetchImpl: async () => new Response('{"message":"bad"}', { status: 422 }) },
    );
    await expect(rejected).rejects.toThrow(/HTTP 422/);
    await rejected.catch((err: unknown) => {
      expect(String(err)).not.toContain("guest@example.com");
    });

    await expect(
      sendTransactionalEmail(
        { to: "guest@example.com", subject: "s", text: "t" },
        { fetchImpl: async () => new Response("{}", { status: 200 }) },
      ),
    ).rejects.toThrow(/no message id/);
  });
});

describe("lib/env", () => {
  useCleanEnv();

  it("reports only what is really configured", () => {
    expect(getCapabilities()).toEqual({
      emailPassword: true,
      magicLink: false,
      passwordReset: false,
      emailInvitations: false,
      stripeCheckout: false,
    });

    process.env.RESEND_API_KEY = "re_unit_test_key";
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_local_only";
    expect(getCapabilities()).toMatchObject({
      magicLink: true,
      passwordReset: true,
      emailInvitations: true,
      // The legacy placeholder key is not a configured Stripe account.
      stripeCheckout: false,
    });

    process.env.STRIPE_SECRET_KEY = "sk_test_unitTestKey0123456789";
    expect(getCapabilities().stripeCheckout).toBe(true);
  });

  it("builds trusted origins from the app URLs plus the local dev origins", () => {
    expect(getTrustedOrigins().sort()).toEqual(["http://localhost:3001", "http://localhost:3100"]);

    process.env.NEXT_PUBLIC_MARKETING_URL = "https://www.managevent.com.au/";
    process.env.NEXT_PUBLIC_INVITATION_URL = "https://invitation.managevent.com.au";
    process.env.NEXT_PUBLIC_ADMIN_URL = "not a url";
    expect(getTrustedOrigins().sort()).toEqual([
      "http://localhost:3001",
      "http://localhost:3100",
      "https://invitation.managevent.com.au",
      "https://www.managevent.com.au",
    ]);

    process.env.NODE_ENV = "production";
    expect(getTrustedOrigins().sort()).toEqual([
      "https://invitation.managevent.com.au",
      "https://www.managevent.com.au",
    ]);
  });

  it("lets AUTH_TRUSTED_ORIGINS replace the derived list", () => {
    process.env.NEXT_PUBLIC_MARKETING_URL = "https://www.managevent.com.au";
    process.env.AUTH_TRUSTED_ORIGINS =
      " https://a.example.com , https://b.example.com/path ,, javascript:alert(1)";
    expect(getTrustedOrigins()).toEqual(["https://a.example.com", "https://b.example.com"]);
  });

  it("normalises origins and resolves public app URLs", () => {
    expect(toOrigin("https://example.com/a/b?c=1")).toBe("https://example.com");
    expect(toOrigin("http://localhost:3001/")).toBe("http://localhost:3001");
    expect(toOrigin("ftp://example.com")).toBeNull();
    expect(toOrigin("/studio")).toBeNull();
    expect(toOrigin(undefined)).toBeNull();

    expect(getPublicAppUrl("INVITATION")).toBe("http://localhost:3001");
    expect(getPublicAppUrl("MARKETING")).toBe("http://localhost:3100");
    process.env.NEXT_PUBLIC_INVITATION_URL = "https://invitation.managevent.com.au/";
    expect(getPublicAppUrl("INVITATION")).toBe("https://invitation.managevent.com.au");
  });
});

describe("lib/auth rewriteAuthLinkOrigin", () => {
  const trusted = ["http://localhost:3001", "https://invitation.managevent.com.au"];

  it("moves the link to the trusted origin of its callback URL", () => {
    const link =
      "http://localhost:4000/api/auth/magic-link/verify?token=abc&callbackURL=" +
      encodeURIComponent("http://localhost:3001/studio");
    const rewritten = new URL(rewriteAuthLinkOrigin(link, trusted));
    expect(rewritten.origin).toBe("http://localhost:3001");
    expect(rewritten.pathname).toBe("/api/auth/magic-link/verify");
    expect(rewritten.searchParams.get("token")).toBe("abc");
    expect(rewritten.searchParams.get("callbackURL")).toBe("http://localhost:3001/studio");

    const prod =
      "https://api.managevent.com.au/api/auth/reset-password/tok123?callbackURL=" +
      encodeURIComponent("https://invitation.managevent.com.au/reset-password");
    expect(rewriteAuthLinkOrigin(prod, trusted)).toBe(
      "https://invitation.managevent.com.au/api/auth/reset-password/tok123?callbackURL=" +
        encodeURIComponent("https://invitation.managevent.com.au/reset-password"),
    );
  });

  it("leaves the link alone for relative, missing or untrusted callbacks", () => {
    const relative =
      "http://localhost:4000/api/auth/magic-link/verify?token=abc&callbackURL=%2Fstudio";
    expect(rewriteAuthLinkOrigin(relative, trusted)).toBe(relative);
    const none = "http://localhost:4000/api/auth/magic-link/verify?token=abc";
    expect(rewriteAuthLinkOrigin(none, trusted)).toBe(none);
    const untrusted =
      "http://localhost:4000/api/auth/magic-link/verify?token=abc&callbackURL=" +
      encodeURIComponent("https://evil.example/studio");
    expect(rewriteAuthLinkOrigin(untrusted, trusted)).toBe(untrusted);
    expect(rewriteAuthLinkOrigin("not a url", trusted)).toBe("not a url");
  });
});

describe("lib/localized", () => {
  it("wraps and unwraps `{ en }` text and tolerates odd stored values", () => {
    expect(toLocalized("Sara & Ali")).toEqual({ en: "Sara & Ali" });
    expect(fromLocalized({ en: "Sara & Ali" })).toBe("Sara & Ali");
    expect(fromLocalized(toLocalized(""))).toBe("");
    expect(fromLocalized("plain")).toBe("plain");
    expect(fromLocalized({ ar: "مرحبا" })).toBe("مرحبا");
    expect(fromLocalized({ en: 42 })).toBe("");
    expect(fromLocalized(null)).toBe("");
    expect(fromLocalized(undefined)).toBe("");
    expect(fromLocalized(["x"])).toBe("");
  });
});

describe("lib/queue", () => {
  it("InMemoryJobQueue records jobs and honours singleton keys", async () => {
    const queue = new InMemoryJobQueue();
    const first = await queue.enqueue(
      "headcount.changed",
      { eventId: "evt_1", headcountId: "hc_1" },
      { singletonKey: "headcount.changed:hc_1" },
    );
    const duplicate = await queue.enqueue(
      "headcount.changed",
      { eventId: "evt_1", headcountId: "hc_1" },
      { singletonKey: "headcount.changed:hc_1" },
    );
    const other = await queue.enqueue("invitation.email_campaign", { campaignId: "cmp_1" });
    expect(first).toBeTruthy();
    expect(duplicate).toBeNull();
    expect(other).toBeTruthy();
    expect(queue.jobs).toEqual([
      {
        name: "headcount.changed",
        payload: { eventId: "evt_1", headcountId: "hc_1" },
        opts: { singletonKey: "headcount.changed:hc_1" },
      },
      { name: "invitation.email_campaign", payload: { campaignId: "cmp_1" }, opts: {} },
    ]);
  });

  it("PgBossJobQueue reports null instead of throwing when the database is unreachable", async () => {
    const queue = new PgBossJobQueue("postgresql://nobody:nothing@127.0.0.1:1/none");
    try {
      await expect(queue.enqueue("lead.created", { leadId: "lead_1" })).resolves.toBeNull();
      // A later call retries the start rather than staying broken or throwing.
      await expect(queue.enqueue("lead.created", { leadId: "lead_1" })).resolves.toBeNull();
    } finally {
      await queue.stop();
    }
  }, 30_000);

  it("PgBossJobQueue throws for a required job it could not enqueue", async () => {
    const queue = new PgBossJobQueue("postgresql://nobody:nothing@127.0.0.1:1/none");
    try {
      // The caller is about to tell someone the work is queued, so it has to know.
      await expect(
        queue.enqueue(
          "invitation.email_campaign",
          { campaignId: "cmp_1" },
          { singletonKey: "campaign:cmp_1", required: true },
        ),
      ).rejects.toBeInstanceOf(Error);
    } finally {
      await queue.stop();
    }
  }, 30_000);
});
