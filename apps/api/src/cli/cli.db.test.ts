/**
 * The two CLI tools against the real database.
 *
 * - `seedDemo` only ever touches the six fixed sample slugs and the sample host, and is safe to
 *   run any number of times.
 * - `createStaff` rows use unique `staff-test+...@managevent.invalid` addresses and are removed
 *   in `afterAll`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@managevent/db";
import {
  ApiErrorSchema,
  GuestTokenSchema,
  INVITATION_TEMPLATES,
  InvitationContentSchema,
  MeResponseSchema,
  RsvpConfigSchema,
  SafeEventSlugSchema,
  WellConfigSchema,
} from "@managevent/validators";
import { createApiApp } from "../app.js";
import { createDefaultDeps } from "../lib/deps.js";
import { buildPartyToken } from "../lib/guest-tokens.js";
import { InMemoryJobQueue } from "../lib/queue.js";
import { utcToZonedWallTime } from "../lib/time.js";
import { dbAvailable, uniqueTestSuffix } from "../test/db.js";
import { createHostTestApp, createTestUser, jsonRequest, type TestUser } from "../test/hosts.js";
import { createStaff, parseStaffArgs, StaffBootstrapError } from "./create-staff.js";
import { DEMO_EVENTS, DEMO_OWNER, DEMO_PARTY } from "./demo-content.js";
import { demoStartsAt, seedDemo } from "./seed-demo.js";
import { secretFromTotpUri, totpCode } from "./totp.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("demo content", () => {
  it("has one valid sample per template, on that template's own theme", () => {
    expect(DEMO_EVENTS.map((event) => event.templateSlug).sort()).toEqual(
      INVITATION_TEMPLATES.map((template) => template.slug).sort(),
    );
    expect(DEMO_EVENTS.map((event) => event.eventSlug)).toEqual([
      "sample-royal-classic-smp2",
      "sample-modern-minimal-smp3",
      "sample-celestial-evening-smp4",
      "sample-botanic-garden-smp5",
      "sample-memorial-calm-smp6",
      "sample-memorial-linen-smp7",
    ]);
    for (const event of DEMO_EVENTS) {
      expect(SafeEventSlugSchema.safeParse(event.eventSlug).success).toBe(true);
      const content = InvitationContentSchema.parse(event.content);
      expect(WellConfigSchema.safeParse(event.wellConfig).success).toBe(true);
      expect(RsvpConfigSchema.safeParse(event.rsvpConfig).success).toBe(true);
      // Written wording, a programme, a venue and questions and answers; no media.
      expect(content.wording.length).toBeGreaterThan(80);
      expect(content.schedule.length).toBeGreaterThanOrEqual(4);
      expect(content.schedule[0]?.time).toBe("16:00");
      expect(content.venue?.name).toBeTruthy();
      expect(content.faq.length).toBeGreaterThanOrEqual(3);
      expect(content.coverImageUrl).toBeNull();
      expect(content.galleryImageUrls).toEqual([]);
      expect(content.music.enabled).toBe(false);
    }
  });

  it("keeps the celebration wells to a message, with no bank details", () => {
    for (const event of DEMO_EVENTS.filter((entry) => entry.wellMode === "WISHING_WELL")) {
      expect(Object.keys(event.wellConfig)).toEqual(["message"]);
    }
  });

  it("writes the memorial samples in Memorial Mode", () => {
    const memorials = DEMO_EVENTS.filter((event) => event.templateSlug.startsWith("memorial-"));
    expect(memorials.map((event) => event.ceremonySlug)).toEqual([
      "celebration-of-life",
      "memorial-service",
    ]);
    for (const event of memorials) {
      expect(event.wellMode).toBe("TRIBUTE_BOOK");
      expect(event.wellConfig.tributePrompt).toBeTruthy();
      expect(event.rsvpConfig.songPrompt).not.toBe("STANDARD");
      expect(event.content.honoureeName).toBeTruthy();
      // Calm and plain: no exclamation marks, no celebration vocabulary, nothing about gifts.
      const text = JSON.stringify([event.title, event.content, event.wellConfig]);
      expect(text).not.toContain("!");
      expect(text).not.toMatch(/\b(party|confetti|dancing|cheers|countdown|registry|gift)\b/i);
    }
  });

  it("starts every sample at 4 pm Perth time, 120 days ahead", () => {
    const now = new Date("2026-11-12T03:00:00.000Z");
    const startsAt = demoStartsAt(now);
    expect(utcToZonedWallTime(startsAt, "Australia/Perth")).toBe("2027-03-12T16:00");
    expect(startsAt.toISOString()).toBe("2027-03-12T08:00:00.000Z");
  });
});

describe.skipIf(!dbAvailable)("seed-demo (database)", () => {
  const deps = createDefaultDeps({ queue: new InMemoryJobQueue() });
  const slugs = DEMO_EVENTS.map((event) => event.eventSlug);
  let staff: TestUser;

  const loadSamples = () =>
    db.invitation.findMany({
      where: { eventSlug: { in: slugs } },
      include: {
        event: { include: { coHosts: true, owner: { include: { accounts: true } } } },
        parties: {
          where: { deletedAt: null },
          include: { guests: { where: { deletedAt: null } } },
        },
      },
      orderBy: { eventSlug: "asc" },
    });

  beforeAll(async () => {
    staff = await createTestUser(["PLANNER_STAFF"]);
  });

  afterAll(async () => {
    await staff?.cleanup();
  });

  it("is idempotent: a second run updates in place and keeps every salt and guest link", async () => {
    const first = await seedDemo(deps);
    const afterFirst = await loadSamples();
    const second = await seedDemo(deps);
    const afterSecond = await loadSamples();

    expect(first.map((result) => result.eventSlug)).toEqual(slugs);
    expect(second.map((result) => result.created)).toEqual(slugs.map(() => false));
    expect(second.map((result) => result.guestPath)).toEqual(
      first.map((result) => result.guestPath),
    );
    expect(second.map((result) => result.eventId)).toEqual(first.map((result) => result.eventId));

    expect(afterSecond).toHaveLength(6);
    expect(afterSecond.map((row) => row.id)).toEqual(afterFirst.map((row) => row.id));
    expect(afterSecond.map((row) => row.salt)).toEqual(afterFirst.map((row) => row.salt));
    expect(afterSecond.map((row) => row.publishedAt)).toEqual(
      afterFirst.map((row) => row.publishedAt),
    );
    expect(afterSecond.map((row) => row.parties.map((party) => party.id))).toEqual(
      afterFirst.map((row) => row.parties.map((party) => party.id)),
    );
    // One sample host for all six, and exactly one row for that address.
    expect(await db.user.count({ where: { email: DEMO_OWNER.email } })).toBe(1);
  });

  it("stores six published, Premium, read-only samples owned by a host who cannot sign in", async () => {
    const samples = await loadSamples();
    expect(samples).toHaveLength(6);

    for (const sample of samples) {
      const definition = DEMO_EVENTS.find((event) => event.eventSlug === sample.eventSlug);
      const template = INVITATION_TEMPLATES.find(
        (entry) => entry.slug === definition?.templateSlug,
      );
      expect(definition && template).toBeTruthy();
      const memorial = template?.mode === "MEMORIAL";

      expect(sample).toMatchObject({
        isDemo: true,
        plan: "PREMIUM",
        templateSlug: template?.slug,
        themeId: template?.defaultThemeId,
        gateStyle: memorial ? "plain-fade" : template?.defaultGateStyle,
        wellMode: memorial ? "TRIBUTE_BOOK" : "WISHING_WELL",
        languages: ["en"],
        pinHash: null,
        deletedAt: null,
      });
      expect(sample.publishedAt).toBeInstanceOf(Date);
      expect(sample.salt).toMatch(/^[0-9a-f]{64}$/);
      expect(await db.payment.count({ where: { invitationId: sample.id } })).toBe(0);
      expect(InvitationContentSchema.parse(sample.contentJson).headline).toBe(
        definition?.content.headline,
      );

      expect(sample.event).toMatchObject({
        status: "LIVE",
        ceremonySlug: definition?.ceremonySlug,
        experienceMode: memorial ? "MEMORIAL" : "CELEBRATION",
        timeZone: "Australia/Perth",
        title: { en: definition?.title },
        deletedAt: null,
      });
      expect(utcToZonedWallTime(sample.event.startsAt, "Australia/Perth")).toMatch(/T16:00$/);
      const daysAhead = (sample.event.startsAt.getTime() - Date.now()) / DAY_MS;
      expect(daysAhead).toBeGreaterThan(119);
      expect(daysAhead).toBeLessThan(121);

      expect(sample.event.owner).toMatchObject({
        email: DEMO_OWNER.email,
        name: "Managevent Sample Host",
        roles: ["CUSTOMER_HOST"],
      });
      // No credential account: there is no password to sign in with.
      expect(sample.event.owner.accounts).toEqual([]);
      expect(sample.event.coHosts).toMatchObject([
        { userId: sample.event.ownerUserId, role: "OWNER" },
      ]);

      expect(sample.parties).toHaveLength(1);
      const party = sample.parties[0];
      expect(party).toMatchObject({
        displayName: { en: "Sample Guest Family" },
        maxSeats: 3,
        tokenRevokedAt: null,
      });
      expect(GuestTokenSchema.safeParse(party?.token).success).toBe(true);
      expect(party?.token).toBe(
        buildPartyToken(DEMO_PARTY.displayName, sample.salt, party?.stableId ?? "", 0),
      );
      expect(party?.guests).toHaveLength(3);
      expect(party?.guests.filter((guest) => guest.isChild)).toHaveLength(1);
      expect(party?.guests.every((guest) => guest.email === null && guest.phone === null)).toBe(
        true,
      );
    }
  });

  it("answers DEMO_READ_ONLY when even staff try to change a sample", async () => {
    const { app, actAs } = createHostTestApp();
    const asStaff = actAs(staff);
    const [sample] = await loadSamples();
    const eventId = sample?.eventId ?? "";

    const read = await app.request(`/v1/events/${eventId}`, { headers: asStaff });
    expect(read.status).toBe(200);

    for (const res of [
      await app.request(
        `/v1/events/${eventId}`,
        jsonRequest("PATCH", { title: "Edited" }, asStaff),
      ),
      await app.request(
        `/v1/events/${eventId}/invitation`,
        jsonRequest("PATCH", { allowForwarding: false }, asStaff),
      ),
      await app.request(`/v1/events/${eventId}/invitation/unpublish`, {
        method: "POST",
        headers: asStaff,
      }),
      await app.request(`/v1/events/${eventId}`, { method: "DELETE", headers: asStaff }),
    ]) {
      expect(res.status).toBe(403);
      expect(ApiErrorSchema.parse(await res.json()).error.code).toBe("DEMO_READ_ONLY");
    }
  });
});

describe.skipIf(!dbAvailable)("create-staff (database)", () => {
  const savedEnv = {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
  };
  process.env.BETTER_AUTH_URL = "http://localhost:4000";
  process.env.AUTH_COOKIE_DOMAIN = "localhost";

  const deps = createDefaultDeps({ queue: new InMemoryJobQueue() });
  const app = createApiApp({ deps: { queue: new InMemoryJobQueue() }, disableRateLimits: true });
  const emails: string[] = [];
  const newEmail = () => {
    const email = `staff-test+${uniqueTestSuffix()}@managevent.invalid`;
    emails.push(email);
    return email;
  };
  const password = `Bootstrap-${uniqueTestSuffix()}`;

  afterAll(async () => {
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    const users = await db.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    await db.auditLog.deleteMany({ where: { entity: "User", entityId: { in: ids } } });
    // Sessions, accounts and two-factor secrets cascade from the user.
    await db.user.deleteMany({ where: { id: { in: ids } } });
  });

  it("creates a staff account with two-factor enabled, no live session and an audit entry", async () => {
    const email = newEmail();
    const result = await createStaff(deps, {
      email,
      name: "Test Planner",
      role: "PLANNER_STAFF",
      password,
    });

    expect(result).toMatchObject({
      email,
      role: "PLANNER_STAFF",
      created: true,
      generatedPassword: null,
    });
    expect(result.userId).toMatch(/^usr_/);
    expect(result.totpURI).toMatch(/^otpauth:\/\/totp\/Managevent/);
    expect(result.backupCodes.length).toBeGreaterThan(0);

    const user = await db.user.findUniqueOrThrow({
      where: { id: result.userId },
      include: { sessions: true, twoFactors: true, accounts: true },
    });
    expect(user.roles).toEqual(["PLANNER_STAFF"]);
    expect(user.twoFactorEnabled).toBe(true);
    expect(user.sessions).toEqual([]);
    expect(user.twoFactors).toHaveLength(1);
    // Stored encrypted, never as the readable secret from the URI.
    const readableSecret = new URL(result.totpURI).searchParams.get("secret") ?? "";
    expect(user.twoFactors[0]?.secret).not.toContain(readableSecret);
    expect(user.accounts[0]?.password).not.toContain(password);

    const audit = await db.auditLog.findMany({
      where: { entity: "User", entityId: result.userId, action: "staff.bootstrap" },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.diffJson).toEqual({
      role: "PLANNER_STAFF",
      created: true,
      twoFactorEnrolled: true,
      credentialsReplaced: false,
      via: "cli",
    });

    // The account then works end to end: password, then a TOTP code, then a staff-only route.
    const signIn = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(signIn.status).toBe(200);
    expect(await signIn.json()).toMatchObject({ twoFactorRedirect: true });
    const pendingCookie = signIn.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    // Password alone is not a session.
    expect((await app.request("/v1/leads", { headers: { cookie: pendingCookie } })).status).toBe(
      401,
    );

    const verify = await app.request("/api/auth/two-factor/verify-totp", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: pendingCookie },
      body: JSON.stringify({ code: totpCode(secretFromTotpUri(result.totpURI), Date.now()) }),
    });
    expect(verify.status).toBe(200);
    const cookie = verify.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");

    const me = MeResponseSchema.parse(
      await (await app.request("/v1/me", { headers: { cookie } })).json(),
    );
    expect(me.user).toMatchObject({
      id: result.userId,
      roles: ["PLANNER_STAFF"],
      twoFactorEnabled: true,
    });
    expect((await app.request("/v1/leads", { headers: { cookie } })).status).toBe(200);
  });

  it("refuses an existing email unless --promote is given", async () => {
    const email = emails[0] ?? "";
    await expect(
      createStaff(deps, { email, name: "Again", role: "SUPER_ADMIN", password }),
    ).rejects.toBeInstanceOf(StaffBootstrapError);
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect(user.roles).toEqual(["PLANNER_STAFF"]);

    // Promoting never keeps what the account had, two-factor included: it gets a new password
    // and a new authenticator, and the old ones stop working.
    const before = await db.user.findUniqueOrThrow({
      where: { email },
      include: { twoFactors: true },
    });
    const promoted = await createStaff(deps, { email, role: "SUPER_ADMIN", promote: true });
    expect(promoted).toMatchObject({ created: false, role: "SUPER_ADMIN" });
    expect(promoted.generatedPassword).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(promoted.totpURI).toMatch(/^otpauth:\/\/totp\/Managevent/);
    expect(promoted.backupCodes.length).toBeGreaterThan(0);
    const after = await db.user.findUniqueOrThrow({
      where: { email },
      include: { sessions: true, twoFactors: true },
    });
    expect(after.roles).toEqual(["SUPER_ADMIN"]);
    expect(after.twoFactorEnabled).toBe(true);
    expect(after.sessions).toEqual([]);
    expect(after.twoFactors).toHaveLength(1);
    expect(after.twoFactors[0]?.id).not.toBe(before.twoFactors[0]?.id);

    // The password from the first test no longer opens the account.
    const oldPassword = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(oldPassword.status).toBe(401);
  });

  it("generates a 20 character password when none is supplied", async () => {
    const result = await createStaff(deps, {
      email: newEmail(),
      name: "Generated",
      role: "SUPER_ADMIN",
    });
    expect(result.generatedPassword).toMatch(/^[A-Za-z0-9]{20}$/);
    const user = await db.user.findUniqueOrThrow({ where: { id: result.userId } });
    expect(user.roles).toEqual(["SUPER_ADMIN"]);
    expect(user.twoFactorEnabled).toBe(true);
  });

  it("promotion replaces the credentials of whoever registered the address first", async () => {
    const cookiesOf = (res: Response) =>
      res.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
    const post = (path: string, body: unknown, cookie?: string) =>
      app.request(path, {
        method: "POST",
        headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      });

    // Someone registers a future staff address as an ordinary host, with their own password...
    const email = newEmail();
    const squatterPassword = `Squatter-${uniqueTestSuffix()}`;
    const signUp = await post("/api/auth/sign-up/email", {
      name: "Not The Planner",
      email,
      password: squatterPassword,
    });
    expect(signUp.status).toBe(200);
    const squatterCookie = cookiesOf(signUp);

    // ...and enrols their own authenticator.
    const enable = await post(
      "/api/auth/two-factor/enable",
      { password: squatterPassword },
      squatterCookie,
    );
    expect(enable.status).toBe(200);
    const squatterTotpUri = ((await enable.json()) as { totpURI: string }).totpURI;
    const enrolled = await post(
      "/api/auth/two-factor/verify-totp",
      { code: totpCode(secretFromTotpUri(squatterTotpUri), Date.now()) },
      squatterCookie,
    );
    expect(enrolled.status).toBe(200);
    const squatterSession = cookiesOf(enrolled) || squatterCookie;
    const squatter = await db.user.findUniqueOrThrow({ where: { email } });
    expect(squatter).toMatchObject({ twoFactorEnabled: true, emailVerified: false });

    // The operator promotes the address, with no knowledge of the squatter's password.
    const result = await createStaff(deps, { email, role: "SUPER_ADMIN", promote: true });
    expect(result).toMatchObject({ created: false, role: "SUPER_ADMIN", userId: squatter.id });
    expect(result.generatedPassword).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(result.totpURI).toMatch(/^otpauth:/);
    expect(secretFromTotpUri(result.totpURI)).not.toBe(secretFromTotpUri(squatterTotpUri));

    const user = await db.user.findUniqueOrThrow({
      where: { email },
      include: { sessions: true, twoFactors: true, accounts: true },
    });
    expect(user.roles).toEqual(["SUPER_ADMIN"]);
    expect(user.twoFactorEnabled).toBe(true);
    expect(user.sessions).toEqual([]);
    expect(user.twoFactors).toHaveLength(1);
    expect(user.accounts.filter((account) => account.providerId === "credential")).toHaveLength(1);

    // Nothing the squatter holds works any more: not the session, not the password.
    const stale = MeResponseSchema.parse(
      await (await app.request("/v1/me", { headers: { cookie: squatterSession } })).json(),
    );
    expect(stale.user).toBeNull();
    expect((await app.request("/v1/leads", { headers: { cookie: squatterSession } })).status).toBe(
      401,
    );
    const squatterSignIn = await post("/api/auth/sign-in/email", {
      email,
      password: squatterPassword,
    });
    expect(squatterSignIn.status).toBe(401);
    expect(squatterSignIn.headers.getSetCookie().join(";")).not.toContain("session_token=");

    // The credentials the operator was given do: password, new authenticator, staff route.
    const signIn = await post("/api/auth/sign-in/email", {
      email,
      password: result.generatedPassword,
    });
    expect(signIn.status).toBe(200);
    expect(await signIn.json()).toMatchObject({ twoFactorRedirect: true });
    const pending = cookiesOf(signIn);
    // The squatter's authenticator is not accepted in place of the new one.
    const oldCode = await post(
      "/api/auth/two-factor/verify-totp",
      { code: totpCode(secretFromTotpUri(squatterTotpUri), Date.now()) },
      pending,
    );
    expect(oldCode.status).toBe(401);
    const verify = await post(
      "/api/auth/two-factor/verify-totp",
      { code: totpCode(secretFromTotpUri(result.totpURI), Date.now()) },
      pending,
    );
    expect(verify.status).toBe(200);
    expect(
      (await app.request("/v1/leads", { headers: { cookie: cookiesOf(verify) } })).status,
    ).toBe(200);

    const audit = await db.auditLog.findMany({
      where: { entity: "User", entityId: user.id, action: "staff.bootstrap" },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.diffJson).toMatchObject({ created: false, credentialsReplaced: true });
  });

  it("promotes a host with the supplied password, which becomes the account's password", async () => {
    const email = newEmail();
    const hostPassword = `Host-${uniqueTestSuffix()}`;
    const signUp = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Existing Host", email, password: hostPassword }),
    });
    expect(signUp.status).toBe(200);

    const staffPassword = `Staff-${uniqueTestSuffix()}`;
    const result = await createStaff(deps, {
      email,
      role: "PLANNER_STAFF",
      promote: true,
      password: staffPassword,
    });
    expect(result).toMatchObject({ created: false, generatedPassword: null });
    expect(result.totpURI).toMatch(/^otpauth:/);
    const user = await db.user.findUniqueOrThrow({ where: { email }, include: { sessions: true } });
    expect(user.roles).toEqual(["PLANNER_STAFF"]);
    expect(user.twoFactorEnabled).toBe(true);
    // The host's earlier sessions are gone too: staff must come back through TOTP.
    expect(user.sessions).toEqual([]);

    const signIn = (candidate: string) =>
      app.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: candidate }),
      });
    expect((await signIn(hostPassword)).status).toBe(401);
    expect((await signIn(staffPassword)).status).toBe(200);
  });

  it("validates its input before touching anything", async () => {
    await expect(
      createStaff(deps, { email: "not-an-email", name: "X", role: "PLANNER_STAFF" }),
    ).rejects.toBeInstanceOf(StaffBootstrapError);
    await expect(
      createStaff(deps, { email: newEmail(), name: "X", role: "PLANNER_STAFF", password: "short" }),
    ).rejects.toBeInstanceOf(StaffBootstrapError);
    await expect(
      createStaff(deps, { email: newEmail(), role: "PLANNER_STAFF" }),
    ).rejects.toBeInstanceOf(StaffBootstrapError);
    expect(await db.user.count({ where: { email: { in: emails.slice(-2) } } })).toBe(0);
  });
});

describe("parseStaffArgs", () => {
  it("reads the flags, with or without the leading -- that pnpm passes through", () => {
    const expected = {
      email: "a@example.org",
      name: "A Planner",
      role: "SUPER_ADMIN",
      promote: false,
    };
    const flags = ["--email", "a@example.org", "--name", "A Planner", "--role", "SUPER_ADMIN"];
    expect(parseStaffArgs(flags)).toEqual(expected);
    expect(parseStaffArgs(["--", ...flags])).toEqual(expected);
    expect(parseStaffArgs([...flags, "--promote"])).toEqual({ ...expected, promote: true });
  });

  it("rejects missing or unknown arguments and roles that are not staff roles", () => {
    for (const argv of [
      [],
      ["--email", "a@example.org"],
      ["--role", "SUPER_ADMIN"],
      ["--email", "a@example.org", "--role", "CUSTOMER_HOST"],
      ["--email", "a@example.org", "--role", "SUPER_ADMIN", "--unknown"],
      ["--email", "a@example.org", "--role", "SUPER_ADMIN", "extra"],
    ]) {
      expect(() => parseStaffArgs(argv)).toThrow(StaffBootstrapError);
    }
  });
});
