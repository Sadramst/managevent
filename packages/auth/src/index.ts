/**
 * @managevent/auth
 *
 * Self-hosted Better Auth configuration (`ADR-0005`), RBAC roles, the `PERMISSIONS.md` matrix,
 * `requirePermission()`, and resource scoping helpers.
 */

export {
  buildBetterAuthConfig,
  createManageventAuth,
  type ManageventAuthConfigOptions,
} from "./better-auth.js";

export { prismaAdapter } from "better-auth/adapters/prisma";

export {
  type AuthActor,
  AuthorizationError,
  canCoHostPerform,
  canVendorAccessOrgResource,
  checkPermission,
  CO_HOST_ROLES,
  isWithinCrewRosterWindow,
  PERMISSION_MATRIX,
  type Permission,
  type PermissionDecision,
  PERMISSIONS,
  type PermissionScope,
  requirePermission,
  type ResourceScopeContext,
  type RolePermissionRule,
  ROLES,
} from "./permissions.js";
