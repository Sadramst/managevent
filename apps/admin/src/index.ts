/**
 * @managevent/admin
 *
 * Domain helpers for the Managevent staff console. Today that is one rule: who counts as staff.
 *
 * The console itself (`/admin` in `apps/marketing`) reads and changes enquiries through the API,
 * which owns the lead stages, the audit trail and every permission check. Nothing here keeps
 * state, creates records or calculates money; earlier helpers that did so for a mock screen
 * (in-memory lead records, pipeline totals, a dietary reveal) were removed with that screen.
 */
import type { Role } from "@managevent/types";

/** The roles allowed into the staff console (root `AGENTS.md` §4). */
export const ADMIN_STAFF_ROLES = ["PLANNER_STAFF", "SUPER_ADMIN"] as const;

export type AdminStaffRole = (typeof ADMIN_STAFF_ROLES)[number];

/** True when `role` is an internal staff role. */
export function isAdminStaffRole(role: string): role is AdminStaffRole {
  return (ADMIN_STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * True when an account holds at least one staff role. Takes the `roles` array exactly as
 * `GET /v1/me` returns it.
 */
export function hasAdminStaffRole(roles: readonly string[]): boolean {
  return roles.some(isAdminStaffRole);
}

/**
 * Ensures the caller holds an authorised internal staff role (`PLANNER_STAFF` or `SUPER_ADMIN`).
 */
export function assertAdminStaffRole(role: Role): asserts role is AdminStaffRole {
  if (!isAdminStaffRole(role)) {
    throw new Error(`Role ${role} is not authorised for the staff console.`);
  }
}
