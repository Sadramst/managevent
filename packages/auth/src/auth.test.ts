import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";
import { describe, expect, it, vi } from "vitest";
import {
  type AuthActor,
  AuthorizationError,
  buildBetterAuthConfig,
  canCoHostPerform,
  createManageventAuth,
  canVendorAccessOrgResource,
  isWithinCrewRosterWindow,
  logAuthEvent,
  MFA_REQUIRED_ROLES,
  type Permission,
  PERMISSIONS,
  requirePermission,
  type ResourceScopeContext,
  TRUSTED_CLIENT_IP_HEADER,
} from "./index.js";

describe("@managevent/auth", () => {
  describe("Better Auth configuration (ADR-0005)", () => {
    it("shares secure cookies across subdomains in production and registers twoFactor + bearer", () => {
      const cfg = buildBetterAuthConfig({
        cookieDomain: ".managevent.com.au",
        baseURL: "https://api.managevent.com.au",
      });

      expect(cfg.appName).toBe("Managevent");
      expect(cfg.advanced?.cookiePrefix).toBe("managevent");
      expect(cfg.advanced?.crossSubDomainCookies?.enabled).toBe(true);
      expect(cfg.advanced?.crossSubDomainCookies?.domain).toBe(".managevent.com.au");
      expect(cfg.advanced?.useSecureCookies).toBe(true);
      // Never x-forwarded-for: its first hop is whatever the caller typed. The host application
      // sets this internal header itself on every request it passes to the auth handler.
      expect(cfg.advanced?.ipAddress?.ipAddressHeaders).toEqual([TRUSTED_CLIENT_IP_HEADER]);
      expect(TRUSTED_CLIENT_IP_HEADER).toBe("x-managevent-client-ip");
      expect(cfg.plugins).toHaveLength(2);
      expect(cfg.plugins?.map((plugin) => plugin.id)).toEqual(["two-factor", "bearer"]);
    });

    it("uses host-only, non-secure cookies on localhost and never keys Secure off NODE_ENV", () => {
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        for (const cookieDomain of [undefined, "localhost", "127.0.0.1", "::1"]) {
          const cfg = buildBetterAuthConfig({
            baseURL: "http://localhost:4000",
            secret: "unit-test-secret-unit-test-secret-1234",
            ...(cookieDomain ? { cookieDomain } : {}),
          });
          expect(cfg.advanced?.crossSubDomainCookies).toBeUndefined();
          expect(cfg.advanced?.useSecureCookies).toBe(false);
        }
      } finally {
        process.env.NODE_ENV = previous;
      }
    });

    it("replaces Better Auth's console logger with one that drops addresses and arguments", () => {
      const cfg = buildBetterAuthConfig();
      expect(cfg.logger?.disabled).not.toBe(true);
      expect(cfg.logger?.log).toBe(logAuthEvent);

      const written: string[] = [];
      const spies = (["error", "warn", "info"] as const).map((method) =>
        vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
          written.push(args.map(String).join(" "));
        }),
      );
      try {
        // Exactly what Better Auth 1.2.12 passes on a failed sign-in and a failed reset.
        logAuthEvent("error", "User not found", { email: "someone@example.com" });
        logAuthEvent("error", "Reset Password: User not found", { email: "other@example.com" });
        logAuthEvent("warn", "Could not email third@example.com today");
        logAuthEvent("error", "INTERNAL_SERVER_ERROR", new TypeError("token=abc123"));
      } finally {
        for (const spy of spies) spy.mockRestore();
      }

      expect(written).toEqual([
        JSON.stringify({ level: "error", msg: "better-auth: User not found" }),
        JSON.stringify({ level: "error", msg: "better-auth: Reset Password: User not found" }),
        JSON.stringify({ level: "warn", msg: "better-auth: Could not email [REDACTED] today" }),
        JSON.stringify({
          level: "error",
          msg: "better-auth: INTERNAL_SERVER_ERROR",
          error: "TypeError",
        }),
      ]);
      expect(written.join(" ")).not.toMatch(/example\.com|abc123/);
    });

    it("guards magic-link verification whenever the magic-link plugin is registered", () => {
      expect(buildBetterAuthConfig().hooks?.before).toBeUndefined();
      expect(
        buildBetterAuthConfig({ sendMagicLink: async () => undefined }).hooks?.before,
      ).toBeTypeOf("function");
      expect(MFA_REQUIRED_ROLES).toEqual(["PLANNER_STAFF", "SUPER_ADMIN"]);
    });

    it("registers magicLink and the reset sender only when a real sender is supplied", () => {
      const without = buildBetterAuthConfig();
      expect(without.plugins?.map((plugin) => plugin.id)).not.toContain("magic-link");
      expect(without.emailAndPassword?.sendResetPassword).toBeUndefined();

      const withSenders = buildBetterAuthConfig({
        sendMagicLink: async () => undefined,
        sendResetPassword: async () => undefined,
      });
      expect(withSenders.plugins).toHaveLength(3);
      expect(withSenders.plugins?.map((plugin) => plugin.id)).toEqual([
        "two-factor",
        "bearer",
        "magic-link",
      ]);
      expect(withSenders.emailAndPassword?.sendResetPassword).toBeTypeOf("function");
    });

    it("enables email + password with the agreed limits, sessions and rate limits", () => {
      const cfg = buildBetterAuthConfig({ trustedOrigins: ["http://localhost:3001"] });
      expect(cfg.emailAndPassword).toMatchObject({
        enabled: true,
        minPasswordLength: 10,
        maxPasswordLength: 128,
        autoSignIn: true,
        requireEmailVerification: false,
        revokeSessionsOnPasswordReset: true,
      });
      expect(cfg.session).toEqual({ expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 });
      expect(cfg.account?.accountLinking?.enabled).toBe(false);
      expect(cfg.trustedOrigins).toEqual(["http://localhost:3001"]);
      expect(cfg.rateLimit?.enabled).toBe(false); // NODE_ENV === "test"
      expect(cfg.rateLimit?.customRules).toMatchObject({
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 3600, max: 20 },
        "/two-factor/verify-totp": { window: 60, max: 10 },
        "/sign-in/magic-link": { window: 3600, max: 10 },
      });
      expect(cfg.user?.additionalFields?.roles).toMatchObject({
        type: "string[]",
        required: false,
        input: false,
        defaultValue: ["CUSTOMER_HOST"],
      });
    });

    it("signs up a real row with roles = [CUSTOMER_HOST] and a usr_ id, whatever the client sends", async () => {
      const store: MemoryDB = {
        user: [],
        session: [],
        account: [],
        verification: [],
        twoFactor: [],
      };
      let counter = 0;
      const auth = createManageventAuth({
        baseURL: "http://localhost:4000",
        secret: "unit-test-secret-unit-test-secret-1234",
        database: memoryAdapter(store),
        generateId: ({ model }) => {
          counter += 1;
          return (model === "user" ? "usr_" : "row_") + String(counter);
        },
      });
      const signUp = (body: Record<string, unknown>) =>
        auth.handler(
          new Request("http://localhost:4000/api/auth/sign-up/email", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
        );

      // A client that tries to choose its own role is either rejected or has the field dropped.
      // Either way no stored row may carry a client-chosen role.
      const forged = await signUp({
        name: "Forged Admin",
        email: "forged-admin@example.com",
        password: "correct horse battery",
        roles: ["SUPER_ADMIN"],
      });
      for (const row of store.user ?? []) {
        expect((row as { roles: string[] }).roles).toEqual(["CUSTOMER_HOST"]);
      }
      expect(forged.status === 200 || (store.user ?? []).length === 0).toBe(true);

      const response = await signUp({
        name: "Test Host",
        email: "roles-hook@example.com",
        password: "correct horse battery",
      });
      expect(response.status).toBe(200);
      // Auto sign-in: a host-only session cookie with the managevent prefix, no Domain, no Secure.
      const cookie = response.headers.get("set-cookie") ?? "";
      expect(cookie).toContain("managevent.session_token=");
      expect(cookie).not.toMatch(/Domain=/i);
      expect(cookie).not.toMatch(/;\s*Secure/i);
      expect(cookie).toMatch(/SameSite=Lax/i);

      const row = (store.user ?? []).find(
        (candidate) => (candidate as { email: string }).email === "roles-hook@example.com",
      ) as { id: string; roles: string[] } | undefined;
      expect(row?.id).toMatch(/^usr_/);
      expect(row?.roles).toEqual(["CUSTOMER_HOST"]);
    });
  });

  describe("Resource scoping helpers (co-host, vendor organisation, crew roster window)", () => {
    it("evaluates co-host sub-roles (OWNER, EDITOR, VIEWER) accurately", () => {
      expect(canCoHostPerform("OWNER", "payment:create")).toBe(true);
      expect(canCoHostPerform("EDITOR", "payment:create")).toBe(false);
      expect(canCoHostPerform("EDITOR", "guest:write")).toBe(true);
      expect(canCoHostPerform("VIEWER", "guest:write")).toBe(false);
      expect(canCoHostPerform("VIEWER", "event:read")).toBe(true);
      expect(canCoHostPerform("VIEWER", "health:read")).toBe(false);
      expect(canCoHostPerform("OWNER", "checkin:scan")).toBe(true);
      expect(canCoHostPerform("EDITOR", "checkin:scan")).toBe(true);
      expect(canCoHostPerform("VIEWER", "checkin:scan")).toBe(false);
    });

    it("evaluates vendor organisation and caterer booking checks", () => {
      expect(canVendorAccessOrgResource("org_1", "org_1")).toBe(true);
      expect(canVendorAccessOrgResource("org_1", "org_2")).toBe(false);
      expect(
        canVendorAccessOrgResource("org_1", "org_1", {
          requireCatererBooking: true,
          isCatererOnBooking: false,
        }),
      ).toBe(false);
      expect(
        canVendorAccessOrgResource("org_1", "org_1", {
          requireCatererBooking: true,
          isCatererOnBooking: true,
        }),
      ).toBe(true);
    });

    it("evaluates crew roster window (event day ± 1)", () => {
      const eventStart = new Date("2026-12-15T08:00:00.000Z");
      const eventEnd = new Date("2026-12-15T14:00:00.000Z");

      // 12 hours before start -> allowed
      expect(
        isWithinCrewRosterWindow(new Date("2026-12-14T20:00:00.000Z"), eventStart, eventEnd),
      ).toBe(true);

      // 3 days before start -> denied
      expect(
        isWithinCrewRosterWindow(new Date("2026-12-12T08:00:00.000Z"), eventStart, eventEnd),
      ).toBe(false);

      // 2 days after end -> denied
      expect(
        isWithinCrewRosterWindow(new Date("2026-12-17T15:00:00.000Z"), eventStart, eventEnd),
      ).toBe(false);
    });
  });

  describe("Exhaustive allowed and denied tests for every permission in PERMISSIONS.md", () => {
    const eventStartsAt = new Date("2026-12-15T08:00:00.000Z");
    const duringEvent = new Date("2026-12-15T09:00:00.000Z");

    const cases: ReadonlyArray<{
      permission: Permission;
      allowedActor: AuthActor;
      allowedResource: ResourceScopeContext;
      deniedActor: AuthActor;
      deniedResource: ResourceScopeContext;
    }> = [
      {
        permission: "event:read",
        allowedActor: { userId: "usr_host", roles: ["CUSTOMER_HOST"] },
        allowedResource: { eventOwnerUserId: "usr_host" },
        deniedActor: { userId: "usr_other", roles: ["CUSTOMER_HOST"] },
        deniedResource: { eventOwnerUserId: "usr_host" },
      },
      {
        permission: "event:update",
        allowedActor: { userId: "usr_editor", roles: ["CUSTOMER_HOST"] },
        allowedResource: { eventOwnerUserId: "usr_host", actorCoHostRole: "EDITOR" },
        deniedActor: { userId: "usr_viewer", roles: ["CUSTOMER_HOST"] },
        deniedResource: { eventOwnerUserId: "usr_host", actorCoHostRole: "VIEWER" },
      },
      {
        permission: "guest:read",
        allowedActor: { partyId: "pty_1", roles: ["GUEST"] },
        allowedResource: { partyId: "pty_1" },
        deniedActor: { organisationId: "org_1", roles: ["VENDOR"] },
        deniedResource: { organisationId: "org_1" },
      },
      {
        permission: "guest:write",
        allowedActor: { userId: "usr_host", roles: ["CUSTOMER_HOST"] },
        allowedResource: { eventOwnerUserId: "usr_host" },
        deniedActor: { userId: "usr_crew", roles: ["CHECKIN_CREW"] },
        deniedResource: { isAssignedToRoster: true, eventStartsAt, now: duringEvent },
      },
      {
        permission: "rsvp:submit",
        allowedActor: { partyId: "pty_1", roles: ["GUEST"] },
        allowedResource: { partyId: "pty_1" },
        deniedActor: { partyId: "pty_2", roles: ["GUEST"] },
        deniedResource: { partyId: "pty_1" },
      },
      {
        permission: "health:read",
        allowedActor: { organisationId: "org_cat", roles: ["VENDOR"] },
        allowedResource: { organisationId: "org_cat", isCatererOnBooking: true },
        deniedActor: { organisationId: "org_dj", roles: ["VENDOR"] },
        deniedResource: { organisationId: "org_dj", isCatererOnBooking: false },
      },
      {
        permission: "order:read",
        allowedActor: { organisationId: "org_1", roles: ["VENDOR"] },
        allowedResource: { organisationId: "org_1" },
        deniedActor: { partyId: "pty_1", roles: ["GUEST"] },
        deniedResource: { partyId: "pty_1" },
      },
      {
        permission: "order:apply_recommendation",
        allowedActor: { userId: "usr_host", roles: ["CUSTOMER_HOST"] },
        allowedResource: { eventOwnerUserId: "usr_host" },
        deniedActor: { userId: "usr_editor", roles: ["CUSTOMER_HOST"] },
        deniedResource: { eventOwnerUserId: "usr_host", actorCoHostRole: "EDITOR" },
      },
      {
        permission: "payment:create",
        allowedActor: { userId: "usr_host", roles: ["CUSTOMER_HOST"] },
        allowedResource: { eventOwnerUserId: "usr_host" },
        deniedActor: { userId: "usr_editor", roles: ["CUSTOMER_HOST"] },
        deniedResource: { eventOwnerUserId: "usr_host", actorCoHostRole: "EDITOR" },
      },
      {
        permission: "payment:refund",
        allowedActor: { userId: "usr_admin", roles: ["SUPER_ADMIN"] },
        allowedResource: {},
        deniedActor: { userId: "usr_staff", roles: ["PLANNER_STAFF"] },
        deniedResource: {},
      },
      {
        permission: "payout:release",
        allowedActor: { userId: "usr_admin", roles: ["SUPER_ADMIN"] },
        allowedResource: {},
        deniedActor: { userId: "usr_staff", roles: ["PLANNER_STAFF"] },
        deniedResource: {},
      },
      {
        permission: "vendor:verify",
        allowedActor: { userId: "usr_staff", roles: ["PLANNER_STAFF"] },
        allowedResource: {},
        deniedActor: { organisationId: "org_1", roles: ["VENDOR"] },
        deniedResource: { organisationId: "org_1" },
      },
      {
        permission: "vendor_service:write",
        allowedActor: { organisationId: "org_1", roles: ["VENDOR"] },
        allowedResource: { organisationId: "org_1" },
        deniedActor: { organisationId: "org_1", roles: ["VENDOR"] },
        deniedResource: { organisationId: "org_2" },
      },
      {
        permission: "booking:respond",
        allowedActor: { organisationId: "org_1", roles: ["VENDOR"] },
        allowedResource: { organisationId: "org_1" },
        deniedActor: { userId: "usr_host", roles: ["CUSTOMER_HOST"] },
        deniedResource: { eventOwnerUserId: "usr_host" },
      },
      {
        permission: "inventory:write",
        allowedActor: { userId: "usr_staff", roles: ["PLANNER_STAFF"] },
        allowedResource: {},
        deniedActor: { userId: "usr_crew", roles: ["CHECKIN_CREW"] },
        deniedResource: { isAssignedToRoster: true, eventStartsAt, now: duringEvent },
      },
      {
        permission: "checkin:scan",
        allowedActor: { userId: "usr_crew", roles: ["CHECKIN_CREW"] },
        allowedResource: { isAssignedToRoster: true, eventStartsAt, now: duringEvent },
        deniedActor: { userId: "usr_crew", roles: ["CHECKIN_CREW"] },
        deniedResource: { isAssignedToRoster: false, eventStartsAt, now: duringEvent },
      },
      {
        permission: "media:upload",
        allowedActor: { partyId: "pty_1", roles: ["GUEST"] },
        allowedResource: { partyId: "pty_1" },
        deniedActor: { partyId: "pty_1", roles: ["GUEST"] },
        deniedResource: { partyId: "pty_2" },
      },
      {
        permission: "media:moderate",
        allowedActor: { userId: "usr_host", roles: ["CUSTOMER_HOST"] },
        allowedResource: { eventOwnerUserId: "usr_host" },
        deniedActor: { partyId: "pty_1", roles: ["GUEST"] },
        deniedResource: { partyId: "pty_1" },
      },
      {
        permission: "lead:read",
        allowedActor: { userId: "usr_staff", roles: ["PLANNER_STAFF"] },
        allowedResource: {},
        deniedActor: { userId: "usr_host", roles: ["CUSTOMER_HOST"] },
        deniedResource: {},
      },
      {
        permission: "lead:write",
        allowedActor: { userId: "usr_staff", roles: ["PLANNER_STAFF"] },
        allowedResource: {},
        deniedActor: { organisationId: "org_1", roles: ["VENDOR"] },
        deniedResource: { organisationId: "org_1" },
      },
      {
        permission: "site_settings:manage",
        allowedActor: { userId: "usr_staff", roles: ["PLANNER_STAFF"] },
        allowedResource: {},
        deniedActor: { userId: "usr_host", roles: ["CUSTOMER_HOST"] },
        deniedResource: {},
      },
      {
        permission: "user:manage_roles",
        allowedActor: { organisationId: "org_1", roles: ["VENDOR"] },
        allowedResource: { organisationId: "org_1" },
        deniedActor: { userId: "usr_staff", roles: ["PLANNER_STAFF"] },
        deniedResource: {},
      },
      {
        permission: "audit:read",
        allowedActor: { userId: "usr_admin", roles: ["SUPER_ADMIN"] },
        allowedResource: {},
        deniedActor: { userId: "usr_staff", roles: ["PLANNER_STAFF"] },
        deniedResource: {},
      },
    ];

    it("covers all 23 permissions defined in PERMISSIONS", () => {
      expect(cases.map((c) => c.permission)).toEqual([...PERMISSIONS]);
    });

    for (const testCase of cases) {
      it(`allows and denies '${testCase.permission}' accurately`, () => {
        const decision = requirePermission(
          testCase.allowedActor,
          testCase.permission,
          testCase.allowedResource,
        );
        expect(decision.allowed).toBe(true);

        expect(() =>
          requirePermission(testCase.deniedActor, testCase.permission, testCase.deniedResource),
        ).toThrow(AuthorizationError);
      });
    }

    it("lets a self-serve host scan at their own event only", () => {
      const host: AuthActor = { userId: "usr_host", roles: ["CUSTOMER_HOST"] };
      expect(requirePermission(host, "checkin:scan", { eventOwnerUserId: "usr_host" }).scope).toBe(
        "own",
      );
      expect(() =>
        requirePermission(host, "checkin:scan", { eventOwnerUserId: "usr_someone_else" }),
      ).toThrow(AuthorizationError);
      expect(() =>
        requirePermission(host, "checkin:scan", {
          eventOwnerUserId: "usr_someone_else",
          actorCoHostRole: "VIEWER",
        }),
      ).toThrow(AuthorizationError);
    });

    it("throws 401 UNAUTHENTICATED when actor is null or has no roles", () => {
      try {
        requirePermission(null, "event:read");
        expect.unreachable("Should have thrown 401");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthorizationError);
        expect((err as AuthorizationError).statusCode).toBe(401);
      }
    });
  });
});
