/**
 * The Better Auth mount as the API exposes it: abuse limits that do not depend on a
 * caller-supplied address, magic-link rules, and logs without email addresses.
 *
 * Runs against the real database. Every account uses a unique `auth-guard-...` address and is
 * removed in `afterAll`. Email is "configured" for this file only, and the provider call is
 * captured in memory: nothing is sent.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TRUSTED_CLIENT_IP_HEADER } from "@managevent/auth";
import { db } from "@managevent/db";
import { MeResponseSchema } from "@managevent/validators";
import { createApiApp } from "../app.js";
import { secretFromTotpUri, totpCode } from "../cli/totp.js";
import { dbAvailable, TEST_CLIENT_IP, uniqueTestSuffix } from "../test/db.js";
import { withTrustedClientIp } from "./auth-guard.js";
import { InMemoryJobQueue } from "./queue.js";

const ORIGIN = "http://localhost:3001";

describe("withTrustedClientIp", () => {
  const request = (headers: Record<string, string>) =>
    new Request("http://localhost:4000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ email: "a@example.org", password: "x" }),
    });

  it("replaces whatever the caller sent in the internal client IP header", async () => {
    const forged = request({
      [TRUSTED_CLIENT_IP_HEADER]: "203.0.113.99",
      "x-forwarded-for": "203.0.113.98",
    });
    const trusted = withTrustedClientIp(forged, "198.51.100.4");
    expect(trusted.headers.get(TRUSTED_CLIENT_IP_HEADER)).toBe("198.51.100.4");
    // The body still reaches Better Auth.
    expect(await trusted.json()).toEqual({ email: "a@example.org", password: "x" });
  });

  it("always gives Better Auth an address its limiter counts, even for an unknown caller", () => {
    const unknown = withTrustedClientIp(request({ "x-forwarded-for": "x" }), "unknown");
    expect(unknown.headers.get(TRUSTED_CLIENT_IP_HEADER)).toBe("0.0.0.0");
    const v6 = withTrustedClientIp(request({}), "2001:db8:1:2::9");
    expect(v6.headers.get(TRUSTED_CLIENT_IP_HEADER)).toBe("2001:db8:1:2:0:0:0:0");
  });
});

describe.skipIf(!dbAvailable)("auth mount (database)", () => {
  const savedEnv = {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  };
  const emails: string[] = [];
  const newEmail = (label: string) => {
    const email = `auth-guard-${label}-${uniqueTestSuffix()}@test.managevent.invalid`;
    emails.push(email);
    return email;
  };
  const sentMail: Array<{ to: string; text: string }> = [];
  const realFetch = globalThis.fetch;

  /** Limits off: for the flows that are not about limits. */
  let app: ReturnType<typeof createApiApp>;
  const limitedApp = (clientIp: Parameters<typeof createApiApp>[0] = {}) =>
    createApiApp({ deps: { queue: new InMemoryJobQueue() }, ...clientIp });

  beforeAll(() => {
    process.env.BETTER_AUTH_URL = "http://localhost:4000";
    process.env.AUTH_COOKIE_DOMAIN = "localhost";
    process.env.RESEND_API_KEY = "re_test_not_a_real_key";
    vi.stubGlobal("fetch", (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith("https://api.resend.com/")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { to: string[]; text: string };
        sentMail.push({ to: body.to[0] ?? "", text: body.text });
        return new Response(JSON.stringify({ id: `re_test_${uniqueTestSuffix()}` }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return realFetch(input, init);
    }) as typeof fetch);
    app = createApiApp({ deps: { queue: new InMemoryJobQueue() }, disableRateLimits: true });
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    const users = await db.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    // Pending two-factor sign-ins hold the user id; sessions and accounts cascade from the user.
    await db.verification.deleteMany({ where: { value: { in: ids } } });
    await db.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  });

  const cookiesOf = (res: Response) =>
    res.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .filter((pair) => pair && !pair.endsWith("="))
      .join("; ");

  const post = (
    target: ReturnType<typeof createApiApp>,
    path: string,
    body: unknown,
    headers: Record<string, string> = {},
  ) =>
    target.request(`/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
      body: JSON.stringify(body),
    });

  async function signUp(email: string, password: string) {
    const res = await post(app, "/sign-up/email", { name: "Auth Guard", email, password });
    expect(res.status).toBe(200);
    return cookiesOf(res);
  }

  async function enrolTotp(cookie: string, password: string): Promise<Buffer> {
    const enable = await post(app, "/two-factor/enable", { password }, { cookie });
    expect(enable.status).toBe(200);
    const secret = secretFromTotpUri(((await enable.json()) as { totpURI: string }).totpURI);
    const verify = await post(
      app,
      "/two-factor/verify-totp",
      { code: totpCode(secret, Date.now()) },
      { cookie },
    );
    expect(verify.status).toBe(200);
    return secret;
  }

  /** Requests a magic link and returns the query string of the emailed link, or null. */
  async function requestMagicLink(email: string): Promise<string | null> {
    sentMail.length = 0;
    const res = await post(app, "/sign-in/magic-link", { email, callbackURL: `${ORIGIN}/studio` });
    expect(res.status).toBe(200);
    const mail = sentMail.find((entry) => entry.to === email);
    if (!mail) return null;
    return new URL(mail.text.match(/https?:\/\/\S+/)?.[0] ?? "").search;
  }

  const verifyMagicLink = (search: string) =>
    app.request(`/api/auth/magic-link/verify${search}`, { headers: { origin: ORIGIN } });

  const me = async (cookie: string) =>
    MeResponseSchema.parse(await (await app.request("/v1/me", { headers: { cookie } })).json())
      .user;

  describe("limits that a forged address cannot avoid", () => {
    it("limits sign-in per caller even when x-forwarded-for is missing, rotated or not an IP", async () => {
      // As reached straight from the internet: no proxy secret, no edge header. Nothing the
      // caller sends names them. (Set explicitly, so a developer's environment cannot change it.)
      const direct = limitedApp({ clientIp: { proxySecret: null, trustedHeader: null } });
      const forwarded = (i: number): Record<string, string> =>
        i % 3 === 0
          ? {}
          : i % 3 === 1
            ? { "x-forwarded-for": `x, 203.0.113.${i}` }
            : { "x-forwarded-for": `198.51.100.${i}`, [TRUSTED_CLIENT_IP_HEADER]: `192.0.2.${i}` };

      const statuses: number[] = [];
      for (let i = 0; i < 14; i += 1) {
        const res = await post(
          direct,
          "/sign-in/email",
          // A different unknown address each time: only the per-caller limit can stop this.
          {
            email: `nobody-${i}-${uniqueTestSuffix()}@test.managevent.invalid`,
            password: "wrong-password-1",
          },
          forwarded(i),
        );
        statuses.push(res.status);
      }
      expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
      expect(statuses.slice(10)).toEqual(Array(4).fill(429));
    });

    it("locks password sign-in for an address after 10 wrong passwords from any number of IPs", async () => {
      const email = newEmail("lockout");
      const password = `Right-${uniqueTestSuffix()}`;
      await signUp(email, password);
      const other = newEmail("other");
      await signUp(other, password);

      // Every attempt comes from a different address, so no per-IP limit is involved.
      const limited = limitedApp({ clientIp: TEST_CLIENT_IP });
      const attempt = (address: string, candidate: string, i: number) =>
        post(
          limited,
          "/sign-in/email",
          { email: address, password: candidate },
          {
            "x-forwarded-for": `203.0.113.${i + 1}`,
          },
        );

      // A correct sign-in in between does not count as a failure.
      expect((await attempt(email, password, 100)).status).toBe(200);
      for (let i = 0; i < 10; i += 1) {
        // Another spelling of the address does not open another bucket.
        const spelled = i % 2 === 0 ? email : email.toUpperCase();
        expect((await attempt(spelled, `wrong-${i}-password`, i)).status).toBe(401);
      }
      const locked = await attempt(email, `wrong-again-password`, 50);
      expect(locked.status).toBe(429);
      expect(((await locked.json()) as { error: { code: string } }).error.code).toBe(
        "RATE_LIMITED",
      );
      expect(locked.headers.get("retry-after")).toMatch(/^\d+$/);
      // Locked means locked: the right password is not tried either.
      expect((await attempt(email, password, 51)).status).toBe(429);
      // Another account is unaffected.
      expect((await attempt(other, password, 52)).status).toBe(200);
    });

    it("locks two-factor verification per account after 5 wrong codes, across sign-ins and IPs", async () => {
      const email = newEmail("totp");
      const password = `Right-${uniqueTestSuffix()}`;
      const secret = await enrolTotp(await signUp(email, password), password);

      const limited = limitedApp({ clientIp: TEST_CLIENT_IP });
      let ip = 0;
      const from = () => ({ "x-forwarded-for": `198.51.100.${(ip += 1)}` });
      const pendingSignIn = async () => {
        const res = await post(limited, "/sign-in/email", { email, password }, from());
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({ twoFactorRedirect: true });
        return cookiesOf(res);
      };
      const verify = (cookie: string, code: string) =>
        post(limited, "/two-factor/verify-totp", { code }, { cookie, ...from() });

      // A right code first: successes never use up the allowance.
      expect((await verify(await pendingSignIn(), totpCode(secret, Date.now()))).status).toBe(200);

      // Wrong codes, each on a NEW pending sign-in and from a new address.
      for (let i = 0; i < 5; i += 1) {
        const wrong = String((Number(totpCode(secret, Date.now())) + 1 + i) % 1_000_000).padStart(
          6,
          "0",
        );
        expect((await verify(await pendingSignIn(), wrong)).status).toBe(401);
      }
      // The account is locked: even the right code, on a fresh sign-in, is not checked.
      const locked = await verify(await pendingSignIn(), totpCode(secret, Date.now()));
      expect(locked.status).toBe(429);
      expect(locked.headers.getSetCookie().join(";")).not.toContain("session_token=");
    });

    it("takes the guarded requests as JSON only, so the address in the body is always seen", async () => {
      const email = newEmail("form");
      const password = `Right-${uniqueTestSuffix()}`;
      await signUp(email, password);
      const limited = limitedApp({ clientIp: TEST_CLIENT_IP });
      // Better Auth itself would accept this form body; the per-address limit could not read it.
      const form = await limited.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: ORIGIN,
          "x-forwarded-for": "203.0.113.150",
        },
        body: new URLSearchParams({ email, password }).toString(),
      });
      expect(form.status).toBe(415);
      expect(form.headers.getSetCookie().join(";")).not.toContain("session_token=");
      // The same credentials as JSON sign in.
      const json = await post(
        limited,
        "/sign-in/email",
        { email, password },
        {
          "x-forwarded-for": "203.0.113.151",
        },
      );
      expect(json.status).toBe(200);
    });

    it("caps emailed sign-in links per address", async () => {
      const email = newEmail("mailbomb");
      const limited = limitedApp({ clientIp: TEST_CLIENT_IP });
      sentMail.length = 0;
      const statuses: number[] = [];
      for (let i = 0; i < 7; i += 1) {
        const res = await post(
          limited,
          "/sign-in/magic-link",
          { email, callbackURL: `${ORIGIN}/studio` },
          { "x-forwarded-for": `192.0.2.${i + 1}` },
        );
        statuses.push(res.status);
      }
      expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429]);
      expect(sentMail.filter((mail) => mail.to === email)).toHaveLength(5);
    });
  });

  describe("logging", () => {
    it("never writes an email address to the logs on a failed sign-in or reset", async () => {
      const email = newEmail("logs");
      const password = `Right-${uniqueTestSuffix()}`;
      await signUp(email, password);
      const unknown = `nobody-logs-${uniqueTestSuffix()}@test.managevent.invalid`;

      const written: string[] = [];
      const capture = (...args: unknown[]) => {
        written.push(
          args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "),
        );
      };
      const spies = (["error", "warn", "info", "log", "debug"] as const).map((method) =>
        vi.spyOn(console, method).mockImplementation(capture),
      );
      try {
        expect((await post(app, "/sign-in/email", { email: unknown, password })).status).toBe(401);
        expect(
          (await post(app, "/sign-in/email", { email, password: "wrong-password-1" })).status,
        ).toBe(401);
        await post(app, "/forget-password", { email: unknown, redirectTo: `${ORIGIN}/reset` });
      } finally {
        for (const spy of spies) spy.mockRestore();
      }

      const output = written.join("\n");
      // Something was logged (the failures are still visible to operators)...
      expect(output).toContain("better-auth:");
      // ...but no address, in any form.
      expect(output).not.toContain(unknown);
      expect(output).not.toContain(email);
      expect(output).not.toContain("@test.managevent.invalid");
    });
  });

  describe("magic link", () => {
    it("removes a password set by whoever registered the address before its owner proved it", async () => {
      // An attacker registers the victim's address with a password of their own choosing.
      const email = newEmail("prehijack");
      const attackerPassword = `Attacker-${uniqueTestSuffix()}`;
      const attackerCookie = await signUp(email, attackerPassword);
      expect((await me(attackerCookie))?.email).toBe(email);
      const squatted = await db.user.findUniqueOrThrow({ where: { email } });
      expect(squatted.emailVerified).toBe(false);

      // The owner of the mailbox signs in with an emailed link.
      const search = await requestMagicLink(email);
      expect(search).not.toBeNull();
      const verify = await verifyMagicLink(search ?? "");
      expect(verify.status).toBe(302);
      const ownerCookie = cookiesOf(verify);
      expect(await me(ownerCookie)).toMatchObject({ id: squatted.id, emailVerified: true });

      // The attacker is out: their session is gone and their password opens nothing.
      expect(await me(attackerCookie)).toBeNull();
      const again = await post(app, "/sign-in/email", { email, password: attackerPassword });
      expect(again.status).toBe(401);
      const accounts = await db.account.findMany({ where: { userId: squatted.id } });
      expect(accounts.filter((account) => account.providerId === "credential")).toEqual([]);
      // The owner's new session is the only one.
      expect(await db.session.count({ where: { userId: squatted.id } })).toBe(1);

      // Once the address is verified, a later link leaves the owner's own password alone.
      const ownerAccount = await db.account.create({
        data: {
          id: `acc-${uniqueTestSuffix()}`,
          userId: squatted.id,
          accountId: squatted.id,
          providerId: "credential",
          password: "a-password-hash-the-owner-set-later",
        },
      });
      const second = await requestMagicLink(email);
      expect((await verifyMagicLink(second ?? "")).status).toBe(302);
      expect(await db.account.count({ where: { id: ownerAccount.id } })).toBe(1);
    });

    it("is never sent to an account that turned two-factor on, host or staff", async () => {
      const email = newEmail("twofactor-host");
      const password = `Right-${uniqueTestSuffix()}`;
      await enrolTotp(await signUp(email, password), password);
      const user = await db.user.findUniqueOrThrow({ where: { email } });
      expect(user).toMatchObject({ roles: ["CUSTOMER_HOST"], twoFactorEnabled: true });

      // Password sign-in asks for the second factor...
      const signIn = await post(app, "/sign-in/email", { email, password });
      expect(await signIn.json()).toMatchObject({ twoFactorRedirect: true });
      // ...so no link that would skip it is ever emailed, and no session appears.
      const sessionsBefore = await db.session.count({ where: { userId: user.id } });
      expect(await requestMagicLink(email)).toBeNull();
      expect(sentMail).toEqual([]);
      expect(await db.session.count({ where: { userId: user.id } })).toBe(sessionsBefore);
    });

    it("refuses a link that was emailed before the account turned two-factor on", async () => {
      const email = newEmail("twofactor-late");
      const password = `Right-${uniqueTestSuffix()}`;
      await signUp(email, password);
      // Verified by an earlier link, so the unverified-account rule is not what stops this.
      const first = await requestMagicLink(email);
      expect((await verifyMagicLink(first ?? "")).status).toBe(302);

      const pending = await requestMagicLink(email);
      expect(pending).not.toBeNull();
      // The owner then turns two-factor on while the second link is still in the mailbox.
      const user = await db.user.findUniqueOrThrow({ where: { email } });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });

      const verify = await verifyMagicLink(pending ?? "");
      expect(verify.status).toBe(403);
      expect(verify.headers.getSetCookie().join(";")).not.toContain("session_token=");
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
      // The link is used up: it does not work later either.
      await db.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false } });
      const retry = await verifyMagicLink(pending ?? "");
      expect(retry.status).toBe(302);
      expect(retry.headers.get("location")).toContain("error=");
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    });
  });
});
