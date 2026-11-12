/**
 * Shared infrastructure against the real database: event access, audit trail, sessions and the
 * pg-boss producer. Every row is created with a fresh unique id and removed by the test that
 * made it; nothing else in the shared database is touched.
 */
import PgBoss from "pg-boss";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AuthActor, AuthorizationError } from "@managevent/auth";
import { db, generateId } from "@managevent/db";
import { createApiApp } from "../app.js";
import {
  createEventFixture,
  dbAvailable,
  type EventFixture,
  uniqueTestSuffix,
} from "../test/db.js";
import {
  checkHostPermission,
  guestActor,
  requireEntitlement,
  requireEventAccess,
} from "./access.js";
import { writeAudit } from "./audit.js";
import { createDefaultDeps } from "./deps.js";
import { ApiProblem } from "./errors.js";
import { InMemoryJobQueue, type JobName, PgBossJobQueue } from "./queue.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!dbAvailable)("shared infrastructure (database)", () => {
  const deps = createDefaultDeps({ queue: new InMemoryJobQueue() });

  describe("requireEventAccess", () => {
    let fixture: EventFixture;
    let memorial: EventFixture;
    const extraUserIds: string[] = [];

    async function createUser(): Promise<string> {
      const id = generateId("usr_");
      await db.user.create({
        data: {
          id,
          email: `cohost-${uniqueTestSuffix()}@test.managevent.invalid`,
          name: "Test Co-host",
          roles: ["CUSTOMER_HOST"],
        },
      });
      extraUserIds.push(id);
      return id;
    }

    beforeAll(async () => {
      fixture = await createEventFixture({ startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000) });
      memorial = await createEventFixture({ experienceMode: "MEMORIAL" });
    });

    afterAll(async () => {
      await fixture.cleanup();
      await memorial.cleanup();
      await db.user.deleteMany({ where: { id: { in: extraUserIds } } });
    });

    it("answers 401 without an actor", async () => {
      for (const actor of [null, { roles: [] } satisfies AuthActor]) {
        const attempt = requireEventAccess(deps, actor, fixture.eventId, "event:read");
        await expect(attempt).rejects.toBeInstanceOf(ApiProblem);
        await expect(attempt).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
      }
    });

    it("gives the owner full access with a plain-string title and the effective plan", async () => {
      const owner: AuthActor = { userId: fixture.userId, roles: ["CUSTOMER_HOST"] };
      const access = await requireEventAccess(deps, owner, fixture.eventId, "payment:create");
      expect(access.event).toMatchObject({
        id: fixture.eventId,
        ownerUserId: fixture.userId,
        title: "Test Event",
        ceremonySlug: "wedding",
        experienceMode: "CELEBRATION",
        status: "LIVE",
        timeZone: "Australia/Perth",
        endsAt: null,
      });
      expect(access.event.startsAt).toBeInstanceOf(Date);
      expect(access.invitation.id).toBe(fixture.invitationId);
      expect(access.invitation.eventSlug).toBe(fixture.eventSlug);
      expect(access.coHostRole).toBe("OWNER");
      expect(access.scope.eventOwnerUserId).toBe(fixture.userId);
      expect(access.scope.actorCoHostRole).toBe("OWNER");
      expect(access.effectivePlan.plan).toBe("FREE");
      expect(access.effectivePlan.maxGuests).toBe(30);
      expect(access.decision).toMatchObject({ allowed: true, scope: "own" });
    });

    it("hides the event (404) from a host with no relationship to it, and for unknown ids", async () => {
      const stranger: AuthActor = { userId: await createUser(), roles: ["CUSTOMER_HOST"] };
      await expect(
        requireEventAccess(deps, stranger, fixture.eventId, "event:read"),
      ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

      const owner: AuthActor = { userId: fixture.userId, roles: ["CUSTOMER_HOST"] };
      for (const eventId of [generateId("evt_"), "not-an-id", ""]) {
        await expect(requireEventAccess(deps, owner, eventId, "event:read")).rejects.toMatchObject({
          status: 404,
          code: "NOT_FOUND",
        });
      }
      // A guest-link actor is never a host.
      await expect(
        requireEventAccess(deps, guestActor(generateId("pty_")), fixture.eventId, "event:read"),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("applies co-host roles: VIEWER reads only, EDITOR edits but cannot pay", async () => {
      const viewerId = await createUser();
      const editorId = await createUser();
      await db.coHost.createMany({
        data: [
          { id: generateId("coh_"), eventId: fixture.eventId, userId: viewerId, role: "VIEWER" },
          { id: generateId("coh_"), eventId: fixture.eventId, userId: editorId, role: "EDITOR" },
        ],
      });
      const viewer: AuthActor = { userId: viewerId, roles: ["CUSTOMER_HOST"] };
      const editor: AuthActor = { userId: editorId, roles: ["CUSTOMER_HOST"] };

      const read = await requireEventAccess(deps, viewer, fixture.eventId, "guest:read");
      expect(read.coHostRole).toBe("VIEWER");
      for (const permission of [
        "guest:write",
        "event:update",
        "health:read",
        "checkin:scan",
      ] as const) {
        const attempt = requireEventAccess(deps, viewer, fixture.eventId, permission);
        await expect(attempt).rejects.toBeInstanceOf(AuthorizationError);
        await expect(attempt).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
      }

      const edit = await requireEventAccess(deps, editor, fixture.eventId, "guest:write");
      expect(edit.coHostRole).toBe("EDITOR");
      await expect(
        requireEventAccess(deps, editor, fixture.eventId, "checkin:scan"),
      ).resolves.toMatchObject({ coHostRole: "EDITOR" });
      await expect(
        requireEventAccess(deps, editor, fixture.eventId, "payment:create"),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("lets staff act on any event, with health reads flagged for the audit log", async () => {
      const staff: AuthActor = { userId: generateId("usr_"), roles: ["PLANNER_STAFF"] };
      const access = await requireEventAccess(deps, staff, fixture.eventId, "health:read");
      expect(access.coHostRole).toBeNull();
      expect(access.decision).toMatchObject({ allowed: true, scope: "all", auditLogged: true });
      await expect(
        requireEventAccess(deps, staff, fixture.eventId, "payment:refund"),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("admits check-in crew only when rostered on the event, within the event window", async () => {
      const crewId = await createUser();
      const crew: AuthActor = { userId: crewId, roles: ["CHECKIN_CREW"] };
      await expect(
        requireEventAccess(deps, crew, fixture.eventId, "checkin:scan"),
      ).rejects.toMatchObject({ status: 404 });

      const rosterId = generateId("rst_");
      await db.crewRoster.create({
        data: {
          id: rosterId,
          eventId: fixture.eventId,
          userId: crewId,
          role: "DOOR",
          shiftStart: new Date(),
          shiftEnd: new Date(Date.now() + 6 * 60 * 60 * 1000),
          deviceIds: [],
        },
      });
      const door = { allowRosterScope: true };
      const access = await requireEventAccess(deps, crew, fixture.eventId, "checkin:scan", door);
      expect(access.scope.isAssignedToRoster).toBe(true);
      expect(access.decision.scope).toBe("roster");
      await expect(
        requireEventAccess(deps, crew, fixture.eventId, "guest:write", door),
      ).rejects.toMatchObject({ statusCode: 403 });

      // A roster grant only counts where the caller asks for it (the check-in module). On every
      // host surface door crew are refused, although the matrix lists these at roster scope.
      for (const permission of [
        "event:read",
        "guest:read",
        "health:read",
        "checkin:scan",
      ] as const) {
        const attempt = requireEventAccess(deps, crew, fixture.eventId, permission);
        await expect(attempt).rejects.toBeInstanceOf(AuthorizationError);
        await expect(attempt).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
        expect(checkHostPermission(crew, permission, access.scope).allowed).toBe(false);
      }

      // Someone who is door crew AND the event's owner is judged as the owner, whichever role
      // comes first in the list.
      const ownerOnTheDoor: AuthActor = {
        userId: fixture.userId,
        roles: ["CHECKIN_CREW", "CUSTOMER_HOST"],
      };
      const rosterForOwner = generateId("rst_");
      await db.crewRoster.create({
        data: {
          id: rosterForOwner,
          eventId: fixture.eventId,
          userId: fixture.userId,
          role: "DOOR",
          shiftStart: new Date(),
          shiftEnd: new Date(Date.now() + 6 * 60 * 60 * 1000),
          deviceIds: [],
        },
      });
      const asOwner = await requireEventAccess(
        deps,
        ownerOnTheDoor,
        fixture.eventId,
        "health:read",
      );
      expect(asOwner.decision).toMatchObject({ allowed: true, scope: "own" });
      await db.crewRoster.delete({ where: { id: rosterForOwner } });

      // A week later the roster window has closed: the injected clock decides, not the wall clock.
      const later = createDefaultDeps({
        queue: new InMemoryJobQueue(),
        now: () => new Date(Date.now() + 7 * DAY_MS),
      });
      await expect(
        requireEventAccess(later, crew, fixture.eventId, "checkin:scan", door),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("treats a memorial event as complimentary Premium and gates features by plan", async () => {
      const celebrationOwner: AuthActor = { userId: fixture.userId, roles: ["CUSTOMER_HOST"] };
      const free = await requireEventAccess(deps, celebrationOwner, fixture.eventId, "event:read");
      expect(() => requireEntitlement(free, "rsvpAndDietary")).not.toThrow();
      let problem: unknown;
      try {
        requireEntitlement(free, "qrPassesAndCheckin");
      } catch (err) {
        problem = err;
      }
      expect(problem).toBeInstanceOf(ApiProblem);
      expect(problem).toMatchObject({
        status: 403,
        code: "FEATURE_NOT_IN_PLAN",
        details: { feature: "qrPassesAndCheckin" },
      });

      const memorialOwner: AuthActor = { userId: memorial.userId, roles: ["CUSTOMER_HOST"] };
      const premium = await requireEventAccess(deps, memorialOwner, memorial.eventId, "event:read");
      expect(premium.event.experienceMode).toBe("MEMORIAL");
      expect(premium.invitation.plan).toBe("FREE");
      expect(premium.effectivePlan.plan).toBe("PREMIUM");
      expect(premium.effectivePlan.priceIncGstCents).toBe(0);
      expect(() => requireEntitlement(premium, "qrPassesAndCheckin")).not.toThrow();
      expect(() => requireEntitlement(premium, "rsvpReminders")).not.toThrow();
      expect(() => requireEntitlement(premium, "automaticLogisticsBridge")).toThrow(ApiProblem);
    });

    it("answers 404 once the event is soft-deleted", async () => {
      const doomed = await createEventFixture();
      try {
        const owner: AuthActor = { userId: doomed.userId, roles: ["CUSTOMER_HOST"] };
        await expect(
          requireEventAccess(deps, owner, doomed.eventId, "event:read"),
        ).resolves.toBeTruthy();
        await db.event.update({ where: { id: doomed.eventId }, data: { deletedAt: new Date() } });
        await expect(
          requireEventAccess(deps, owner, doomed.eventId, "event:read"),
        ).rejects.toMatchObject({ status: 404 });
      } finally {
        await doomed.cleanup();
      }
    });
  });

  describe("writeAudit", () => {
    const entityId = generateId("evt_");

    afterAll(async () => {
      await db.auditLog.deleteMany({ where: { entityId } });
    });

    it("stores the actor, action and a redacted diff, inside the caller's transaction", async () => {
      const actorUserId = generateId("usr_");
      await db.$transaction(async (tx) => {
        await writeAudit(tx, {
          actor: { userId: actorUserId, roles: ["CUSTOMER_HOST"] },
          action: "invitation.update",
          entity: "Invitation",
          entityId,
          diff: {
            changed: ["themeId", "content"],
            email: "guest@example.com",
            guestToken: "the-smith-family-7kq2m9xp",
            nested: { allergyNotes: "peanuts", count: 2 },
            link: "/i/some-event-7kq2/the-smith-family-7kq2m9xp",
          },
          ip: "203.0.113.7",
        });
      });

      const rows = await db.auditLog.findMany({ where: { entityId } });
      expect(rows).toHaveLength(1);
      const row = rows[0];
      expect(row?.id).toMatch(/^aud_/);
      expect(row).toMatchObject({
        actorUserId,
        actorRole: "CUSTOMER_HOST",
        action: "invitation.update",
        entity: "Invitation",
        ip: "203.0.113.7",
      });
      expect(row?.diffJson).toEqual({
        changed: ["themeId", "content"],
        email: "[REDACTED]",
        guestToken: "[REDACTED]",
        nested: { allergyNotes: "[REDACTED]", count: 2 },
        link: "/i/some-event-7kq2/[REDACTED]",
      });
      const stored = JSON.stringify(row?.diffJson);
      expect(stored).not.toContain("guest@example.com");
      expect(stored).not.toContain("7kq2m9xp");
      expect(stored).not.toContain("peanuts");
    });

    it("records a guest or system action without a user and rolls back with the transaction", async () => {
      await writeAudit(db, {
        actor: null,
        action: "plan.upgrade",
        entity: "Invitation",
        entityId,
        diff: { from: "FREE", to: "PREMIUM" },
      });
      const systemRow = await db.auditLog.findFirst({
        where: { entityId, action: "plan.upgrade" },
      });
      expect(systemRow).toMatchObject({ actorUserId: null, actorRole: "GUEST", ip: null });

      await expect(
        db.$transaction(async (tx) => {
          await writeAudit(tx, {
            actor: null,
            action: "rolled.back",
            entity: "Invitation",
            entityId,
            diff: {},
          });
          throw new Error("abort");
        }),
      ).rejects.toThrow("abort");
      expect(await db.auditLog.count({ where: { entityId, action: "rolled.back" } })).toBe(0);
    });
  });

  describe("Better Auth sign-up and session resolution", () => {
    const email = `signup-${uniqueTestSuffix()}@test.managevent.invalid`;
    // Local-development auth settings, whatever the developer's .env says: http base URL and no
    // shared cookie domain, so the cookie assertions below describe the localhost behaviour.
    const savedEnv = {
      url: process.env.BETTER_AUTH_URL,
      domain: process.env.AUTH_COOKIE_DOMAIN,
    };
    process.env.BETTER_AUTH_URL = "http://localhost:4000";
    process.env.AUTH_COOKIE_DOMAIN = "localhost";
    const app = createApiApp({ deps: { queue: new InMemoryJobQueue() }, disableRateLimits: true });
    let cookie = "";
    let userId = "";

    afterAll(async () => {
      if (savedEnv.url === undefined) delete process.env.BETTER_AUTH_URL;
      else process.env.BETTER_AUTH_URL = savedEnv.url;
      if (savedEnv.domain === undefined) delete process.env.AUTH_COOKIE_DOMAIN;
      else process.env.AUTH_COOKIE_DOMAIN = savedEnv.domain;
      // Sessions and accounts cascade from the user.
      await db.user.deleteMany({ where: { email } });
    });

    it("creates a usr_ row with roles = [CUSTOMER_HOST], whatever the client asks for", async () => {
      const res = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Sign-up Test", email, password: "correct horse battery" }),
      });
      expect(res.status).toBe(200);

      const setCookies = res.headers.getSetCookie();
      const sessionCookie = setCookies.find((value) =>
        value.startsWith("managevent.session_token="),
      );
      expect(sessionCookie).toBeTruthy();
      // Host-only on localhost: no Domain attribute, not Secure, Lax, HttpOnly.
      expect(sessionCookie).not.toMatch(/Domain=/i);
      expect(sessionCookie).not.toMatch(/;\s*Secure/i);
      expect(sessionCookie).toMatch(/HttpOnly/i);
      expect(sessionCookie).toMatch(/SameSite=Lax/i);
      cookie = setCookies.map((value) => value.split(";")[0]).join("; ");

      const row = await db.user.findUnique({ where: { email }, include: { accounts: true } });
      expect(row).not.toBeNull();
      userId = row?.id ?? "";
      expect(userId).toMatch(
        /^usr_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(row?.roles).toEqual(["CUSTOMER_HOST"]);
      expect(row?.twoFactorEnabled).toBe(false);
      // The credential account stores a hash, never the password.
      expect(row?.accounts).toHaveLength(1);
      expect(row?.accounts[0]?.providerId).toBe("credential");
      expect(row?.accounts[0]?.password).toBeTruthy();
      expect(row?.accounts[0]?.password).not.toContain("correct horse battery");
    });

    it("never lets a sign-up choose its own role", async () => {
      const forgedEmail = `forged-${uniqueTestSuffix()}@test.managevent.invalid`;
      try {
        await app.request("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Forged",
            email: forgedEmail,
            password: "correct horse battery",
            roles: ["SUPER_ADMIN"],
          }),
        });
        const row = await db.user.findUnique({ where: { email: forgedEmail } });
        // Either the request was refused (no row) or the role was overwritten by the server.
        if (row) expect(row.roles).toEqual(["CUSTOMER_HOST"]);
      } finally {
        await db.user.deleteMany({ where: { email: forgedEmail } });
      }
    });

    it("resolves the session cookie to a host actor; headers alone are never trusted", async () => {
      expect(cookie).not.toBe("");
      // lead:read is staff-only: an authenticated host gets 403, an anonymous caller 401.
      expect((await app.request("/v1/leads")).status).toBe(401);
      expect((await app.request("/v1/leads", { headers: { cookie } })).status).toBe(403);
      expect(
        (
          await app.request("/v1/leads", {
            headers: { "x-managevent-user-id": userId, "x-managevent-roles": "SUPER_ADMIN" },
          })
        ).status,
      ).toBe(401);
      expect(
        (await app.request("/v1/leads", { headers: { cookie: "managevent.session_token=forged" } }))
          .status,
      ).toBe(401);
    });

    it("refuses staff without two-factor, admits them with it, and drops deleted users", async () => {
      await db.user.update({ where: { id: userId }, data: { roles: ["PLANNER_STAFF"] } });
      expect((await app.request("/v1/leads", { headers: { cookie } })).status).toBe(401);

      await db.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
      expect((await app.request("/v1/leads", { headers: { cookie } })).status).toBe(200);

      await db.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
      expect((await app.request("/v1/leads", { headers: { cookie } })).status).toBe(401);
    });

    it("rejects a wrong password and a too-short password", async () => {
      const wrong = await app.request("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: "not the password" }),
      });
      expect(wrong.status).toBe(401);
      expect(wrong.headers.getSetCookie().some((v) => v.includes("session_token="))).toBe(false);

      const shortEmail = `short-${uniqueTestSuffix()}@test.managevent.invalid`;
      const short = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Short", email: shortEmail, password: "short" }),
      });
      expect(short.status).toBe(400);
      expect(await db.user.count({ where: { email: shortEmail } })).toBe(0);
    });
  });

  describe("PgBossJobQueue", () => {
    it("starts one producer lazily, creates the queue once and delivers jobs to pg-boss", async () => {
      // A private queue name, so no worker picks these jobs up and nothing else is disturbed.
      const queueName = `test.e1.${uniqueTestSuffix()}` as JobName;
      const queue = new PgBossJobQueue();
      const inspector = new PgBoss({
        connectionString:
          process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/managevent",
        schedule: false,
        supervise: false,
        max: 2,
      });
      inspector.on("error", () => undefined);
      await inspector.start();
      const enqueuedIds: string[] = [];
      try {
        const [first, second] = await Promise.all([
          queue.enqueue(queueName, { n: 1 }),
          queue.enqueue(queueName, { n: 2 }),
        ]);
        for (const id of [first, second]) if (id) enqueuedIds.push(id);
        expect(first).toBeTruthy();
        expect(second).toBeTruthy();
        expect(first).not.toBe(second);

        const jobs = await inspector.fetch<{ n: number }>(queueName, { batchSize: 10 });
        expect(jobs.map((job) => job.data.n).sort()).toEqual([1, 2]);
        expect(jobs.map((job) => job.id).sort()).toEqual([first, second].sort());
      } finally {
        await queue.stop();
        // pg-boss refuses to drop a queue that still has jobs, so remove this test's jobs first.
        if (enqueuedIds.length > 0) await inspector.deleteJob(queueName, enqueuedIds);
        await inspector.deleteQueue(queueName);
        const leftover = (await inspector.getQueues()).filter((q) => q.name === queueName);
        await inspector.stop({ graceful: false });
        expect(leftover).toHaveLength(0);
      }
    }, 60_000);
  });
});
