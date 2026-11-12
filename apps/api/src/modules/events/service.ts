/**
 * Host events: create, read, edit, delete, and the invitation's design, content, settings and
 * publish state. Authorisation always goes through `requireEventAccess` / `requirePermission`.
 */
import { isDeepStrictEqual } from "node:util";
import { type AuthActor, canCoHostPerform, requirePermission } from "@managevent/auth";
import type { Prisma } from "@managevent/db";
import { getExperienceMode } from "@managevent/i18n";
import { getInvitationPlan } from "@managevent/payments";
import {
  type HostEventCreate,
  type HostEventDetail,
  type HostEventList,
  type HostEventUpdate,
  type HostInvitationUpdate,
  type InvitationContent,
  InvitationContentSchema,
  RsvpConfigSchema,
} from "@managevent/validators";
import { type EventAccess, requireEntitlement, requireEventAccess } from "../../lib/access.js";
import { writeAudit } from "../../lib/audit.js";
import type { ApiDeps } from "../../lib/deps.js";
import { ApiProblem, isUniqueViolation, notFound, unauthenticated } from "../../lib/errors.js";
import { generateEventSalt, generateEventSlug } from "../../lib/guest-tokens.js";
import { toLocalized } from "../../lib/localized.js";
import { utcToZonedWallTime, zonedWallTimeToUtc } from "../../lib/time.js";
import {
  readInvitationContent,
  readRsvpConfig,
  readWellConfig,
  roleOnEvent,
  toHostEventDetail,
  toHostEventSummary,
} from "./mappers.js";
import {
  createEventGraph,
  findEventsForUser,
  findHostEvent,
  hasEverBeenPublished,
  markPublished,
  markUnpublished,
  moveEventStatus,
  softDeleteEvent,
  updateEventRow,
  updateInvitationRow,
} from "./repo.js";
import {
  assertRsvpConfigAllowed,
  assertWellAllowed,
  missingPublishRequirements,
  replaceEventSlugWords,
  resolveInvitationDesign,
  validationProblem,
} from "./rules.js";

const SLUG_ATTEMPTS = 6;

export interface RequestMeta {
  /** Client IP for the audit trail, when known. */
  ip?: string;
}

/** Sample invitations are read-only for everyone, staff included. */
export function assertNotDemo(access: Pick<EventAccess, "invitation">): void {
  if (access.invitation.isDemo) {
    throw new ApiProblem(403, "DEMO_READ_ONLY", "Sample invitations cannot be changed");
  }
}

async function loadDetail(
  deps: ApiDeps,
  eventId: string,
  access: Pick<EventAccess, "coHostRole">,
): Promise<HostEventDetail> {
  const row = await findHostEvent(deps.db, eventId);
  if (!row) throw notFound("Event not found");
  // Staff have no co-host row and hold `guest:write` on every event. A co-host sees the guest
  // link only when their sub-role may write to the guest list (a VIEWER may not).
  const showGuestLink =
    access.coHostRole === null || canCoHostPerform(access.coHostRole, "guest:write");
  return toHostEventDetail(row, access.coHostRole ?? "OWNER", showGuestLink);
}

export async function listEvents(deps: ApiDeps, actor: AuthActor | null): Promise<HostEventList> {
  const userId = actor?.userId;
  if (!actor || !userId) throw unauthenticated();
  const rows = await findEventsForUser(deps.db, userId);
  return { items: rows.map((row) => toHostEventSummary(row, roleOnEvent(row, userId))) };
}

export async function getEvent(
  deps: ApiDeps,
  actor: AuthActor | null,
  eventId: string,
): Promise<HostEventDetail> {
  const access = await requireEventAccess(deps, actor, eventId, "event:read");
  return loadDetail(deps, eventId, access);
}

export async function createEvent(
  deps: ApiDeps,
  actor: AuthActor | null,
  input: HostEventCreate,
  meta: RequestMeta = {},
): Promise<HostEventDetail> {
  const userId = actor?.userId;
  if (!actor || !userId) throw unauthenticated();
  requirePermission(actor, "event:update", { eventOwnerUserId: userId });

  // The mode follows the occasion. It is never supplied by the client and never changes.
  const experienceMode = getExperienceMode({ ceremonySlug: input.ceremonySlug });
  // A new invitation is FREE; memorial events get the complimentary plan from the first moment.
  const design = resolveInvitationDesign({
    mode: experienceMode,
    plan: getInvitationPlan("FREE", experienceMode),
    current: null,
    change: {
      templateSlug: input.templateSlug,
      ...(input.themeId !== undefined ? { themeId: input.themeId } : {}),
    },
  });

  const startsAt = zonedWallTimeToUtc(input.startsAtLocal, input.timeZone);
  const endsAt = input.endsAtLocal ? zonedWallTimeToUtc(input.endsAtLocal, input.timeZone) : null;
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw validationProblem({ endsAtLocal: ["The end must be after the start"] });
  }

  const honoureeName = input.honoureeName?.trim();
  const content: InvitationContent = InvitationContentSchema.parse({
    version: 1,
    headline: input.title,
    hosts: input.hosts,
    ...(honoureeName ? { honoureeName } : {}),
    venue: input.venue ?? null,
    coverImageUrl: null,
    music: { enabled: false, url: null, title: null, rightsAttested: false },
  });
  const rsvpConfig = RsvpConfigSchema.parse({
    songPrompt: experienceMode === "MEMORIAL" ? "HIDDEN" : "STANDARD",
  });

  for (let attempt = 1; ; attempt += 1) {
    try {
      const { eventId } = await deps.db.$transaction(async (tx) => {
        const created = await createEventGraph(tx, {
          ownerUserId: userId,
          title: toLocalized(input.title),
          ceremonySlug: input.ceremonySlug,
          experienceMode,
          startsAt,
          endsAt,
          timeZone: input.timeZone,
          invitation: {
            eventSlug: generateEventSlug(input.title),
            salt: generateEventSalt(),
            ...design,
            contentJson: content as Prisma.InputJsonValue,
            rsvpConfigJson: rsvpConfig as Prisma.InputJsonValue,
          },
        });
        await writeAudit(tx, {
          actor,
          action: "event.create",
          entity: "Event",
          entityId: created.eventId,
          diff: {
            invitationId: created.invitationId,
            ceremonySlug: input.ceremonySlug,
            experienceMode,
            templateSlug: design.templateSlug,
            themeId: design.themeId,
          },
          ...(meta.ip ? { ip: meta.ip } : {}),
        });
        return created;
      });
      return await loadDetail(deps, eventId, { coHostRole: "OWNER" });
    } catch (err) {
      // The only unique value we generate is the slug; a clash just needs a new random suffix.
      if (!isUniqueViolation(err) || attempt >= SLUG_ATTEMPTS) throw err;
    }
  }
}

export async function updateEvent(
  deps: ApiDeps,
  actor: AuthActor | null,
  eventId: string,
  input: HostEventUpdate,
  meta: RequestMeta = {},
): Promise<HostEventDetail> {
  const access = await requireEventAccess(deps, actor, eventId, "event:update");
  assertNotDemo(access);
  const { event, invitation } = access;

  const timeZone = input.timeZone ?? event.timeZone;
  const timeZoneChanged = timeZone !== event.timeZone;

  // Times are wall-clock values in the event's zone. Changing the zone keeps the wall clock
  // (4 pm stays 4 pm), so the instants move with it.
  const rezone = (instant: Date): Date =>
    zonedWallTimeToUtc(utcToZonedWallTime(instant, event.timeZone), timeZone);

  let startsAt = event.startsAt;
  if (input.startsAtLocal !== undefined) {
    startsAt = zonedWallTimeToUtc(input.startsAtLocal, timeZone);
  } else if (timeZoneChanged) {
    startsAt = rezone(event.startsAt);
  }

  let endsAt = event.endsAt;
  if (input.endsAtLocal !== undefined) {
    endsAt = input.endsAtLocal === null ? null : zonedWallTimeToUtc(input.endsAtLocal, timeZone);
  } else if (timeZoneChanged && event.endsAt) {
    endsAt = rezone(event.endsAt);
  }
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw validationProblem({ endsAtLocal: ["The end must be after the start"] });
  }

  const data: Prisma.EventUpdateManyMutationInput = {};
  const changed: string[] = [];
  if (input.title !== undefined && input.title !== event.title) {
    data.title = toLocalized(input.title);
    changed.push("title");
  }
  if (startsAt.getTime() !== event.startsAt.getTime()) {
    data.startsAt = startsAt;
    changed.push("startsAt");
  }
  if ((endsAt?.getTime() ?? null) !== (event.endsAt?.getTime() ?? null)) {
    data.endsAt = endsAt;
    changed.push("endsAt");
  }
  if (timeZoneChanged) {
    data.timeZone = timeZone;
    changed.push("timeZone");
  }

  if (changed.length > 0) {
    const rsvpDeadline =
      timeZoneChanged && invitation.rsvpDeadline ? rezone(invitation.rsvpDeadline) : null;
    await deps.db.$transaction(async (tx) => {
      await updateEventRow(tx, eventId, data);
      if (rsvpDeadline) await updateInvitationRow(tx, invitation.id, { rsvpDeadline });
      await writeAudit(tx, {
        actor,
        action: "event.update",
        entity: "Event",
        entityId: eventId,
        diff: { changed },
        ...(meta.ip ? { ip: meta.ip } : {}),
      });
    });
  }
  return loadDetail(deps, eventId, access);
}

export async function deleteEvent(
  deps: ApiDeps,
  actor: AuthActor | null,
  eventId: string,
  meta: RequestMeta = {},
): Promise<void> {
  const access = await requireEventAccess(deps, actor, eventId, "event:update");
  // Editors can change an event but only its owner (or staff acting on any event) can remove it.
  if (access.coHostRole !== "OWNER" && access.decision.scope !== "all") {
    throw new ApiProblem(403, "FORBIDDEN", "Only the event owner can delete this event");
  }
  assertNotDemo(access);

  await deps.db.$transaction(async (tx) => {
    await softDeleteEvent(tx, eventId, access.invitation.id, deps.now());
    await writeAudit(tx, {
      actor,
      action: "event.delete",
      entity: "Event",
      entityId: eventId,
      diff: {
        invitationId: access.invitation.id,
        wasPublished: access.invitation.publishedAt !== null,
      },
      ...(meta.ip ? { ip: meta.ip } : {}),
    });
  });
}

export async function updateInvitation(
  deps: ApiDeps,
  actor: AuthActor | null,
  eventId: string,
  input: HostInvitationUpdate,
  meta: RequestMeta = {},
): Promise<HostEventDetail> {
  const access = await requireEventAccess(deps, actor, eventId, "event:update");
  assertNotDemo(access);
  const { event, invitation } = access;
  const mode = event.experienceMode;

  const expectedUpdatedAt =
    input.expectedUpdatedAt !== undefined ? new Date(input.expectedUpdatedAt) : undefined;
  const stale = () =>
    new ApiProblem(
      409,
      "STALE_WRITE",
      "The invitation was changed somewhere else. Reload it and try again.",
      { updatedAt: invitation.updatedAt.toISOString() },
    );
  if (expectedUpdatedAt && expectedUpdatedAt.getTime() !== invitation.updatedAt.getTime()) {
    throw stale();
  }

  const data: Prisma.InvitationUpdateManyMutationInput = {};
  const changed: string[] = [];

  if (
    input.templateSlug !== undefined ||
    input.themeId !== undefined ||
    input.gateStyle !== undefined
  ) {
    const design = resolveInvitationDesign({
      mode,
      plan: access.effectivePlan,
      current: invitation,
      change: {
        ...(input.templateSlug !== undefined ? { templateSlug: input.templateSlug } : {}),
        ...(input.themeId !== undefined ? { themeId: input.themeId } : {}),
        ...(input.gateStyle !== undefined ? { gateStyle: input.gateStyle } : {}),
      },
    });
    for (const key of ["templateSlug", "themeId", "gateStyle"] as const) {
      if (design[key] !== invitation[key]) {
        data[key] = design[key];
        changed.push(key);
      }
    }
  }

  if (input.content !== undefined) {
    if (!isDeepStrictEqual(input.content, readInvitationContent(invitation.contentJson))) {
      data.contentJson = input.content as Prisma.InputJsonValue;
      changed.push("content");
    }
  }

  if (input.rsvpDeadlineLocal !== undefined) {
    const rsvpDeadline =
      input.rsvpDeadlineLocal === null
        ? null
        : zonedWallTimeToUtc(input.rsvpDeadlineLocal, event.timeZone);
    if ((rsvpDeadline?.getTime() ?? null) !== (invitation.rsvpDeadline?.getTime() ?? null)) {
      data.rsvpDeadline = rsvpDeadline;
      changed.push("rsvpDeadline");
    }
  }

  if (input.rsvpConfig !== undefined) {
    assertRsvpConfigAllowed(mode, input.rsvpConfig);
    if (!isDeepStrictEqual(input.rsvpConfig, readRsvpConfig(invitation.rsvpConfigJson))) {
      data.rsvpConfigJson = input.rsvpConfig as Prisma.InputJsonValue;
      changed.push("rsvpConfig");
    }
  }

  if (input.allowForwarding !== undefined && input.allowForwarding !== invitation.allowForwarding) {
    data.allowForwarding = input.allowForwarding;
    changed.push("allowForwarding");
  }

  if (input.wellMode !== undefined || input.wellConfig !== undefined) {
    const currentWellConfig = readWellConfig(invitation.wellConfigJson);
    const wellMode = input.wellMode ?? invitation.wellMode;
    const wellConfig = input.wellConfig ?? currentWellConfig;
    assertWellAllowed(mode, wellMode, wellConfig);
    if (wellMode !== invitation.wellMode) {
      data.wellMode = wellMode;
      changed.push("wellMode");
    }
    if (!isDeepStrictEqual(wellConfig, currentWellConfig)) {
      data.wellConfigJson = wellConfig as Prisma.InputJsonValue;
      changed.push("wellConfig");
    }
  }

  if (input.eventSlugWords !== undefined) {
    const eventSlug = replaceEventSlugWords(invitation.eventSlug, input.eventSlugWords);
    if (eventSlug !== invitation.eventSlug) {
      requireEntitlement(access, "customEventSlug");
      // Links may already be in guests' hands once an invitation has been published, even if it
      // was unpublished again, so the address is fixed from the first publish onwards.
      if (invitation.publishedAt !== null || (await hasEverBeenPublished(deps.db, invitation.id))) {
        throw new ApiProblem(
          409,
          "CONFLICT",
          "The invitation link cannot be changed after the invitation has been published",
        );
      }
      data.eventSlug = eventSlug;
      changed.push("eventSlug");
    }
  }

  if (changed.length > 0) {
    try {
      await deps.db.$transaction(async (tx) => {
        const written = await updateInvitationRow(tx, invitation.id, data, expectedUpdatedAt);
        if (!written) throw stale();
        // Which fields changed, never their values: wording and bank details stay out of the log.
        await writeAudit(tx, {
          actor,
          action: "invitation.update",
          entity: "Invitation",
          entityId: invitation.id,
          diff: { changed },
          ...(meta.ip ? { ip: meta.ip } : {}),
        });
      });
    } catch (err) {
      if (data.eventSlug !== undefined && isUniqueViolation(err)) {
        throw new ApiProblem(409, "SLUG_TAKEN", "That invitation link is already in use");
      }
      throw err;
    }
  }
  return loadDetail(deps, eventId, access);
}

export async function publishInvitation(
  deps: ApiDeps,
  actor: AuthActor | null,
  eventId: string,
  meta: RequestMeta = {},
): Promise<HostEventDetail> {
  const access = await requireEventAccess(deps, actor, eventId, "event:update");
  assertNotDemo(access);
  const { event, invitation } = access;

  // Publishing twice is a no-op: `publishedAt` keeps the moment of the first publish.
  if (invitation.publishedAt === null) {
    const now = deps.now();
    const missing = missingPublishRequirements(
      readInvitationContent(invitation.contentJson),
      event.startsAt,
      now,
    );
    if (missing.length > 0) {
      throw new ApiProblem(
        422,
        "PUBLISH_REQUIREMENTS_NOT_MET",
        "The invitation is not ready to publish",
        { missing },
      );
    }
    await deps.db.$transaction(async (tx) => {
      if (!(await markPublished(tx, invitation.id, now))) return;
      await moveEventStatus(tx, eventId, "DRAFT", "LIVE");
      await writeAudit(tx, {
        actor,
        action: "invitation.publish",
        entity: "Invitation",
        entityId: invitation.id,
        diff: { eventId },
        ...(meta.ip ? { ip: meta.ip } : {}),
      });
    });
  }
  return loadDetail(deps, eventId, access);
}

export async function unpublishInvitation(
  deps: ApiDeps,
  actor: AuthActor | null,
  eventId: string,
  meta: RequestMeta = {},
): Promise<HostEventDetail> {
  const access = await requireEventAccess(deps, actor, eventId, "event:update");
  assertNotDemo(access);
  const { invitation } = access;

  if (invitation.publishedAt !== null) {
    await deps.db.$transaction(async (tx) => {
      if (!(await markUnpublished(tx, invitation.id))) return;
      await moveEventStatus(tx, eventId, "LIVE", "DRAFT");
      await writeAudit(tx, {
        actor,
        action: "invitation.unpublish",
        entity: "Invitation",
        entityId: invitation.id,
        diff: { eventId },
        ...(meta.ip ? { ip: meta.ip } : {}),
      });
    });
  }
  return loadDetail(deps, eventId, access);
}
