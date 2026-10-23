/**
 * RBAC roles, permission matrix (`packages/auth/PERMISSIONS.md`), resource scoping helpers,
 * and `requirePermission()`.
 */
import type { CoHostRole, Role } from "@managevent/types";

export const ROLES: readonly Role[] = [
  "CUSTOMER_HOST",
  "GUEST",
  "VENDOR",
  "PLANNER_STAFF",
  "CHECKIN_CREW",
  "SUPER_ADMIN",
] as const;

export const CO_HOST_ROLES: readonly CoHostRole[] = ["OWNER", "EDITOR", "VIEWER"] as const;

export const PERMISSIONS = [
  "event:read",
  "event:update",
  "guest:read",
  "guest:write",
  "rsvp:submit",
  "health:read",
  "order:read",
  "order:apply_recommendation",
  "payment:create",
  "payment:refund",
  "payout:release",
  "vendor:verify",
  "vendor_service:write",
  "booking:respond",
  "inventory:write",
  "checkin:scan",
  "media:upload",
  "media:moderate",
  "lead:read",
  "lead:write",
  "user:manage_roles",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type PermissionScope = "none" | "own" | "self" | "org" | "roster" | "all";

export interface RolePermissionRule {
  scope: PermissionScope;
  /** Allowed co-host sub-roles when scope is `"own"`. */
  coHostRoles?: readonly CoHostRole[];
  /** Whether vendor access requires being the caterer on the booking (`health:read`). */
  requireCatererBooking?: boolean;
  /** Whether access must write an AuditLog entry (`health:read` by staff/admin). */
  auditLogged?: boolean;
}

/**
 * Authoritative permission matrix matching `packages/auth/PERMISSIONS.md`.
 */
export const PERMISSION_MATRIX: Readonly<
  Record<Permission, Readonly<Record<Role, RolePermissionRule>>>
> = {
  "event:read": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER", "EDITOR", "VIEWER"] },
    GUEST: { scope: "self" },
    VENDOR: { scope: "org" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "roster" },
    SUPER_ADMIN: { scope: "all" },
  },
  "event:update": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER", "EDITOR"] },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "guest:read": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER", "EDITOR", "VIEWER"] },
    GUEST: { scope: "self" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "roster" },
    SUPER_ADMIN: { scope: "all" },
  },
  "guest:write": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER", "EDITOR"] },
    GUEST: { scope: "self" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "rsvp:submit": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER", "EDITOR"] },
    GUEST: { scope: "self" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "health:read": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER", "EDITOR"] }, // VIEWER excluded per PERMISSIONS.md
    GUEST: { scope: "self" },
    VENDOR: { scope: "org", requireCatererBooking: true },
    PLANNER_STAFF: { scope: "all", auditLogged: true },
    CHECKIN_CREW: { scope: "roster" },
    SUPER_ADMIN: { scope: "all", auditLogged: true },
  },
  "order:read": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER", "EDITOR", "VIEWER"] },
    GUEST: { scope: "none" },
    VENDOR: { scope: "org" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "order:apply_recommendation": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER"] },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "payment:create": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER"] },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "payment:refund": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "none" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "payout:release": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "none" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "vendor:verify": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "vendor_service:write": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "org" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "booking:respond": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "org" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "inventory:write": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "checkin:scan": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "roster" },
    SUPER_ADMIN: { scope: "all" },
  },
  "media:upload": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER", "EDITOR"] },
    GUEST: { scope: "self" },
    VENDOR: { scope: "org" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "roster" },
    SUPER_ADMIN: { scope: "all" },
  },
  "media:moderate": {
    CUSTOMER_HOST: { scope: "own", coHostRoles: ["OWNER", "EDITOR"] },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "lead:read": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "lead:write": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "all" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "user:manage_roles": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "org" },
    PLANNER_STAFF: { scope: "none" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
  "audit:read": {
    CUSTOMER_HOST: { scope: "none" },
    GUEST: { scope: "none" },
    VENDOR: { scope: "none" },
    PLANNER_STAFF: { scope: "none" },
    CHECKIN_CREW: { scope: "none" },
    SUPER_ADMIN: { scope: "all" },
  },
};

// ─── Resource Scoping Helpers ───────────────────────────────────────────────

/**
 * Checks whether a co-host sub-role (`OWNER`, `EDITOR`, `VIEWER`) is allowed to perform
 * an `"own"`-scoped permission (`packages/auth/PERMISSIONS.md`).
 */
export function canCoHostPerform(coHostRole: CoHostRole, permission: Permission): boolean {
  const rule = PERMISSION_MATRIX[permission].CUSTOMER_HOST;
  if (rule.scope !== "own" || !rule.coHostRoles) {
    return false;
  }
  return rule.coHostRoles.includes(coHostRole);
}

/**
 * Checks whether a vendor belongs to the target organisation (and satisfies caterer requirements if needed).
 */
export function canVendorAccessOrgResource(
  actorOrganisationId: string | undefined,
  resourceOrganisationId: string | undefined,
  options?: { isCatererOnBooking?: boolean; requireCatererBooking?: boolean },
): boolean {
  if (!actorOrganisationId || !resourceOrganisationId) {
    return false;
  }
  if (actorOrganisationId !== resourceOrganisationId) {
    return false;
  }
  if (options?.requireCatererBooking && !options.isCatererOnBooking) {
    return false;
  }
  return true;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Checks whether `now` falls within the `event day ± 1` window (`[startsAt - 24h, (endsAt ?? startsAt) + 24h]`)
 * for `CHECKIN_CREW` roster access (`ARCHITECTURE.md` §5 and `PERMISSIONS.md`).
 */
export function isWithinCrewRosterWindow(
  now: Date,
  eventStartsAt: Date,
  eventEndsAt?: Date | null,
): boolean {
  const nowMs = now.getTime();
  const windowStartMs = eventStartsAt.getTime() - TWENTY_FOUR_HOURS_MS;
  const endBasisMs = (eventEndsAt ?? eventStartsAt).getTime();
  const windowEndMs = endBasisMs + TWENTY_FOUR_HOURS_MS;
  return nowMs >= windowStartMs && nowMs <= windowEndMs;
}

// ─── Actor & Resource Context ───────────────────────────────────────────────

export interface AuthActor {
  userId?: string;
  roles: readonly Role[];
  organisationId?: string;
  partyId?: string;
  guestId?: string;
  mfaVerified?: boolean;
}

export interface ResourceScopeContext {
  /** Event owner user ID. */
  eventOwnerUserId?: string;
  /** Co-host map or role for the current actor on this event. */
  actorCoHostRole?: CoHostRole;
  /** Target organisation ID (for vendor-scoped operations). */
  organisationId?: string;
  /** Whether the vendor is the assigned caterer on the booking (`health:read`). */
  isCatererOnBooking?: boolean;
  /** Target party ID (for guest token operations). */
  partyId?: string;
  /** Target guest ID (for guest token operations). */
  guestId?: string;
  /** Whether the crew member is assigned on the event's `CrewRoster`. */
  isAssignedToRoster?: boolean;
  /** Event start timestamp (for crew roster window check). */
  eventStartsAt?: Date;
  /** Event end timestamp (for crew roster window check). */
  eventEndsAt?: Date | null;
  /** Current timestamp override (defaults to `new Date()`). */
  now?: Date;
}

export interface PermissionDecision {
  allowed: boolean;
  matchedRole?: Role;
  scope?: PermissionScope;
  auditLogged?: boolean;
  reason?: string;
}

/**
 * Evaluates whether `actor` holds `permission` for the given `resource` context.
 */
export function checkPermission(
  actor: AuthActor | null | undefined,
  permission: Permission,
  resource: ResourceScopeContext = {},
): PermissionDecision {
  if (!actor || actor.roles.length === 0) {
    return { allowed: false, reason: "Unauthenticated actor" };
  }

  for (const role of actor.roles) {
    const rule = PERMISSION_MATRIX[permission][role];
    if (!rule || rule.scope === "none") {
      continue;
    }

    if (rule.scope === "all") {
      return {
        allowed: true,
        matchedRole: role,
        scope: "all",
        ...(rule.auditLogged ? { auditLogged: true } : {}),
      };
    }

    if (rule.scope === "own") {
      const isDirectOwner =
        Boolean(actor.userId) &&
        Boolean(resource.eventOwnerUserId) &&
        actor.userId === resource.eventOwnerUserId;
      const effectiveCoHostRole: CoHostRole | undefined = isDirectOwner
        ? "OWNER"
        : resource.actorCoHostRole;

      if (effectiveCoHostRole && canCoHostPerform(effectiveCoHostRole, permission)) {
        return {
          allowed: true,
          matchedRole: role,
          scope: "own",
        };
      }
    }

    if (rule.scope === "self") {
      const matchesParty =
        Boolean(actor.partyId) && Boolean(resource.partyId) && actor.partyId === resource.partyId;
      const matchesGuest =
        Boolean(actor.guestId) && Boolean(resource.guestId) && actor.guestId === resource.guestId;
      if (matchesParty || matchesGuest) {
        return {
          allowed: true,
          matchedRole: role,
          scope: "self",
        };
      }
    }

    if (rule.scope === "org") {
      const ok = canVendorAccessOrgResource(actor.organisationId, resource.organisationId, {
        ...(resource.isCatererOnBooking !== undefined
          ? { isCatererOnBooking: resource.isCatererOnBooking }
          : {}),
        ...(rule.requireCatererBooking !== undefined
          ? { requireCatererBooking: rule.requireCatererBooking }
          : {}),
      });
      if (ok) {
        return {
          allowed: true,
          matchedRole: role,
          scope: "org",
        };
      }
    }

    if (rule.scope === "roster") {
      const now = resource.now ?? new Date();
      if (
        resource.isAssignedToRoster &&
        resource.eventStartsAt &&
        isWithinCrewRosterWindow(now, resource.eventStartsAt, resource.eventEndsAt)
      ) {
        return {
          allowed: true,
          matchedRole: role,
          scope: "roster",
        };
      }
    }
  }

  return {
    allowed: false,
    reason: `Actor roles [${actor.roles.join(", ")}] do not satisfy permission '${permission}' in this resource scope`,
  };
}

/**
 * Error thrown by `requirePermission` when authentication or RBAC authorization fails.
 */
export class AuthorizationError extends Error {
  public readonly statusCode: 401 | 403;
  public readonly code: "UNAUTHENTICATED" | "FORBIDDEN";
  public readonly permission: Permission;

  constructor(
    statusCode: 401 | 403,
    code: "UNAUTHENTICATED" | "FORBIDDEN",
    permission: Permission,
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
    this.code = code;
    this.permission = permission;
  }
}

/**
 * Asserts that `actor` has `permission` on `resource`, throwing `AuthorizationError` (401 or 403) if not.
 */
export function requirePermission(
  actor: AuthActor | null | undefined,
  permission: Permission,
  resource: ResourceScopeContext = {},
): PermissionDecision {
  if (!actor || actor.roles.length === 0) {
    throw new AuthorizationError(
      401,
      "UNAUTHENTICATED",
      permission,
      `Authentication is required for '${permission}'`,
    );
  }

  const decision = checkPermission(actor, permission, resource);
  if (!decision.allowed) {
    throw new AuthorizationError(
      403,
      "FORBIDDEN",
      permission,
      decision.reason ?? `Forbidden: missing permission '${permission}'`,
    );
  }

  return decision;
}
