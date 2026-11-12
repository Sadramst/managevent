/**
 * Identity against the real database and the real Better Auth handler: a sign-up yields a
 * `usr_` id with exactly the host role, and `GET /v1/me` reports that user (or null) plus what
 * this deployment can do. No actor override: the session cookie is resolved for real.
 */
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@managevent/db";
import { MeResponseSchema } from "@managevent/validators";
import { createApiApp } from "../../app.js";
import { InMemoryJobQueue } from "../../lib/queue.js";
import { dbAvailable, uniqueTestSuffix } from "../../test/db.js";

const PROVIDER_ENV = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY"] as const;

describe.skipIf(!dbAvailable)("identity (database)", () => {
  const email = `me-${uniqueTestSuffix()}@test.managevent.invalid`;
  // Local auth settings and no providers, whatever the developer's .env says.
  const savedEnv: Record<string, string | undefined> = {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
  };
  for (const name of PROVIDER_ENV) {
    savedEnv[name] = process.env[name];
    delete process.env[name];
  }
  process.env.BETTER_AUTH_URL = "http://localhost:4000";
  process.env.AUTH_COOKIE_DOMAIN = "localhost";

  const app = createApiApp({ deps: { queue: new InMemoryJobQueue() }, disableRateLimits: true });
  let cookie = "";
  let userId = "";

  afterAll(async () => {
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    // Sessions and the credential account cascade from the user.
    await db.user.deleteMany({ where: { email } });
  });

  it("reports no user and honest capabilities to a signed-out caller, never a 401", async () => {
    const res = await app.request("/v1/me");
    expect(res.status).toBe(200);
    expect(MeResponseSchema.parse(await res.json())).toEqual({
      user: null,
      capabilities: {
        emailPassword: true,
        // No email provider and no Stripe keys: these flows are reported as unavailable.
        magicLink: false,
        passwordReset: false,
        emailInvitations: false,
        stripeCheckout: false,
      },
    });

    // A forged cookie or identity header is just a signed-out caller.
    for (const headers of [
      { cookie: "managevent.session_token=forged" },
      { "x-user-id": "usr_someone", "x-user-roles": "SUPER_ADMIN" },
      { authorization: "Bearer not-a-session" },
    ]) {
      const forged = await app.request("/v1/me", { headers });
      expect(forged.status).toBe(200);
      expect(MeResponseSchema.parse(await forged.json()).user).toBeNull();
    }
  });

  it("signs up through the auth handler with a usr_ id and exactly the host role", async () => {
    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Morgan Example",
        email,
        password: "a long enough passphrase",
      }),
    });
    expect(res.status).toBe(200);
    cookie = res.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    expect(cookie).toContain("managevent.session_token=");

    const row = await db.user.findUniqueOrThrow({ where: { email } });
    userId = row.id;
    expect(userId).toMatch(
      /^usr_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(row.roles).toEqual(["CUSTOMER_HOST"]);
  });

  it("returns the signed-in host from the session cookie", async () => {
    const res = await app.request("/v1/me", { headers: { cookie } });
    expect(res.status).toBe(200);
    const me = MeResponseSchema.parse(await res.json());
    expect(me.user).toEqual({
      id: userId,
      email,
      name: "Morgan Example",
      roles: ["CUSTOMER_HOST"],
      emailVerified: false,
      twoFactorEnabled: false,
    });
    expect(me.capabilities.emailPassword).toBe(true);

    // The same session can use the host routes straight away.
    const events = await app.request("/v1/events", { headers: { cookie } });
    expect(events.status).toBe(200);
    expect(await events.json()).toEqual({ items: [] });
  });

  it("reports capabilities from the environment at request time", async () => {
    process.env.RESEND_API_KEY = `re_${uniqueTestSuffix()}`;
    try {
      const me = MeResponseSchema.parse(await (await app.request("/v1/me")).json());
      expect(me.capabilities).toMatchObject({
        magicLink: true,
        passwordReset: true,
        emailInvitations: true,
        stripeCheckout: false,
      });
    } finally {
      delete process.env.RESEND_API_KEY;
    }
  });

  it("treats a deleted account as signed out", async () => {
    await db.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
    const res = await app.request("/v1/me", { headers: { cookie } });
    expect(res.status).toBe(200);
    expect(MeResponseSchema.parse(await res.json()).user).toBeNull();
    expect((await app.request("/v1/events", { headers: { cookie } })).status).toBe(401);
  });
});
