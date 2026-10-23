import { describe, expect, it } from "vitest";
import {
  type AuthActor,
  AuthorizationError,
  buildBetterAuthConfig,
  canCoHostPerform,
  canVendorAccessOrgResource,
  isWithinCrewRosterWindow,
  type Permission,
  PERMISSIONS,
  requirePermission,
  type ResourceScopeContext,
} from "./index.js";

describe("@managevent/auth", () => {
  describe("Better Auth configuration (ADR-0005)", () => {
    it("configures organization, twoFactor, magicLink and bearer plugins with cookie domain from env", () => {
      const cfg = buildBetterAuthConfig({
        cookieDomain: ".managevent.com.au",
        baseURL: "https://api.managevent.com.au",
      });

      expect(cfg.appName).toBe("Managevent");
      expect(cfg.advanced?.crossSubDomainCookies?.enabled).toBe(true);
      expect(cfg.advanced?.crossSubDomainCookies?.domain).toBe(".managevent.com.au");
      expect(cfg.advanced?.useSecureCookies).toBe(true);
      expect(cfg.plugins).toHaveLength(4);
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

    it("covers all 22 permissions defined in PERMISSIONS", () => {
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
