/**
 * Event-scoped authorisation. Every host route resolves its event through `requireEventAccess`,
 * which loads the event and invitation, works out the actor's relationship to it, and checks the
 * permission from `@managevent/auth`. Roles are never compared inline in a module.
 */
import {
  type AuthActor,
  AuthorizationError,
  checkPermission,
  type Permission,
  type PermissionDecision,
  requirePermission,
  type ResourceScopeContext,
} from "@managevent/auth";
import type { CoHostRole, EventStatus, ExperienceMode, Invitation } from "@managevent/db";
import {
  type BooleanEntitlementKey,
  getInvitationPlan,
  type InvitationPlanEntitlements,
} from "@managevent/payments";
import type { ApiDeps } from "./deps.js";
import { ApiProblem, notFound, unauthenticated } from "./errors.js";
import { fromLocalized } from "./localized.js";

export interface EventAccess {
  event: {
    id: string;
    ownerUserId: string;
    title: string;
    ceremonySlug: string;
    experienceMode: ExperienceMode;
    status: EventStatus;
    startsAt: Date;
    endsAt: Date | null;
    timeZone: string;
  };
  /** The Prisma row, including `salt`. Never return it from a route. */
  invitation: Invitation;
  /** `OWNER` for the event owner, the co-host row's role otherwise, null for staff and crew. */
  coHostRole: CoHostRole | null;
  scope: ResourceScopeContext;
  effectivePlan: InvitationPlanEntitlements;
  /** The decision for the requested permission (`decision.auditLogged` drives `health.read`). */
  decision: PermissionDecision;
}

export interface EventAccessOptions {
  /**
   * Accept a grant that only exists at `roster` scope (door crew on the event day ±1).
   *
   * The matrix gives `CHECKIN_CREW` `event:read`, `guest:read` and `health:read` at roster scope,
   * but only as far as the door needs: names, tables and flags (PERMISSIONS.md). The check-in
   * module returns exactly that and is the only caller that sets this. Everywhere else a roster
   * grant is not enough, so door crew never reach the guest list, the export, the responses, the
   * dietary notes, messaging or the event settings.
   */
  allowRosterScope?: boolean;
}

/**
 * `checkPermission` for the host surfaces: a grant that exists only at `roster` scope does not
 * count. A person who is door crew AND a host or staff member is judged on those other roles.
 */
export function checkHostPermission(
  actor: AuthActor | null,
  permission: Permission,
  scope: ResourceScopeContext,
): PermissionDecision {
  const decision = checkPermission(actor, permission, scope);
  if (!actor || !decision.allowed || decision.scope !== "roster") return decision;
  const otherRoles = actor.roles.filter((role) => role !== decision.matchedRole);
  const denied: PermissionDecision = {
    allowed: false,
    reason: `Door crew access to '${permission}' is limited to check-in`,
  };
  if (otherRoles.length === 0) return denied;
  const other = checkPermission({ ...actor, roles: otherRoles }, permission, scope);
  return other.allowed && other.scope === "roster" ? denied : other;
}

/** `requirePermission` for the host surfaces (see `checkHostPermission`): 401 or 403 on failure. */
export function requireHostPermission(
  actor: AuthActor | null,
  permission: Permission,
  scope: ResourceScopeContext,
): PermissionDecision {
  if (!actor || actor.roles.length === 0) throw unauthenticated();
  const decision = checkHostPermission(actor, permission, scope);
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

/**
 * Loads an event the actor may act on.
 *
 * - no actor → 401 `UNAUTHENTICATED`
 * - event missing, deleted, without an invitation, or not readable by the actor → 404 `NOT_FOUND`
 * - readable, but `permission` is not granted → 403 `FORBIDDEN`
 * - granted only at `roster` scope, and the caller did not ask for it → 403 `FORBIDDEN`
 */
export async function requireEventAccess(
  deps: ApiDeps,
  actor: AuthActor | null,
  eventId: string,
  permission: Permission,
  options: EventAccessOptions = {},
): Promise<EventAccess> {
  if (!actor || actor.roles.length === 0) throw unauthenticated();

  const row = await deps.db.event.findFirst({
    where: { id: eventId, deletedAt: null },
    include: {
      invitation: true,
      coHosts: actor.userId ? { where: { userId: actor.userId } } : false,
    },
  });
  if (!row || !row.invitation || row.invitation.deletedAt) throw notFound("Event not found");

  const isOwner = Boolean(actor.userId) && actor.userId === row.ownerUserId;
  const coHostRows = (row.coHosts ?? []) as Array<{ role: CoHostRole }>;
  const coHostRole: CoHostRole | null = isOwner ? "OWNER" : (coHostRows[0]?.role ?? null);

  let isAssignedToRoster = false;
  if (actor.userId && actor.roles.includes("CHECKIN_CREW")) {
    const roster = await deps.db.crewRoster.findFirst({
      where: { eventId: row.id, userId: actor.userId },
      select: { id: true },
    });
    isAssignedToRoster = roster !== null;
  }

  const scope: ResourceScopeContext = {
    eventOwnerUserId: row.ownerUserId,
    ...(coHostRole ? { actorCoHostRole: coHostRole } : {}),
    eventStartsAt: row.startsAt,
    eventEndsAt: row.endsAt,
    isAssignedToRoster,
    now: deps.now(),
  };

  // Not being allowed to read an event is indistinguishable from the event not existing.
  if (!checkPermission(actor, "event:read", scope).allowed) throw notFound("Event not found");
  const decision = options.allowRosterScope
    ? requirePermission(actor, permission, scope)
    : requireHostPermission(actor, permission, scope);

  return {
    event: {
      id: row.id,
      ownerUserId: row.ownerUserId,
      title: fromLocalized(row.title),
      ceremonySlug: row.ceremonySlug,
      experienceMode: row.experienceMode,
      status: row.status,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      timeZone: row.timeZone,
    },
    invitation: row.invitation,
    coHostRole,
    scope,
    effectivePlan: getInvitationPlan(row.invitation.plan, row.experienceMode),
    decision,
  };
}

/** Throws `403 FEATURE_NOT_IN_PLAN` (with `details.feature`) unless the event's plan includes `key`. */
export function requireEntitlement(access: EventAccess, key: BooleanEntitlementKey): void {
  if (!access.effectivePlan[key]) {
    throw new ApiProblem(403, "FEATURE_NOT_IN_PLAN", "This feature is not included in the plan", {
      feature: key,
    });
  }
}

/** The actor a guest link stands for: no account, scoped to exactly one party. */
export const guestActor = (partyId: string): AuthActor => ({ roles: ["GUEST"], partyId });
