import { describe, expect, it } from "vitest";
import {
  ADMIN_STAFF_ROLES,
  assertAdminStaffRole,
  hasAdminStaffRole,
  isAdminStaffRole,
} from "./index.js";

describe("@managevent/admin staff roles", () => {
  it("names exactly the two internal staff roles", () => {
    expect(ADMIN_STAFF_ROLES).toEqual(["PLANNER_STAFF", "SUPER_ADMIN"]);
  });

  it("recognises a staff role", () => {
    expect(isAdminStaffRole("PLANNER_STAFF")).toBe(true);
    expect(isAdminStaffRole("SUPER_ADMIN")).toBe(true);
    for (const role of ["CUSTOMER_HOST", "GUEST", "VENDOR", "CHECKIN_CREW", "", "super_admin"]) {
      expect(isAdminStaffRole(role), role).toBe(false);
    }
  });

  it("checks the roles array as GET /v1/me returns it", () => {
    expect(hasAdminStaffRole(["CUSTOMER_HOST", "PLANNER_STAFF"])).toBe(true);
    expect(hasAdminStaffRole(["SUPER_ADMIN"])).toBe(true);
    expect(hasAdminStaffRole(["CUSTOMER_HOST"])).toBe(false);
    expect(hasAdminStaffRole([])).toBe(false);
  });

  it("rejects non-staff roles", () => {
    expect(() => assertAdminStaffRole("PLANNER_STAFF")).not.toThrow();
    expect(() => assertAdminStaffRole("SUPER_ADMIN")).not.toThrow();
    expect(() => assertAdminStaffRole("GUEST")).toThrow(/not authorised/i);
    expect(() => assertAdminStaffRole("CUSTOMER_HOST")).toThrow(/not authorised/i);
  });
});
