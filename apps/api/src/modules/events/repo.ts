/**
 * Prisma access for host events and their invitation. Every function takes the client (or the
 * transaction client) it should run on.
 */
import { type EventStatus, generateId, type Prisma } from "@managevent/db";
import type { DbTx } from "../../lib/deps.js";
import { hostEventInclude, type HostEventRowWithInvitation } from "./mappers.js";

function withInvitation(
  row: Prisma.EventGetPayload<{ include: typeof hostEventInclude }> | null,
): HostEventRowWithInvitation | null {
  if (!row || !row.invitation || row.invitation.deletedAt) return null;
  return row as HostEventRowWithInvitation;
}

/** Events the user owns or co-hosts, newest first. Deleted events are never listed. */
export async function findEventsForUser(
  db: DbTx,
  userId: string,
): Promise<HostEventRowWithInvitation[]> {
  const rows = await db.event.findMany({
    where: {
      deletedAt: null,
      invitation: { deletedAt: null },
      OR: [{ ownerUserId: userId }, { coHosts: { some: { userId } } }],
    },
    include: hostEventInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return rows.filter((row): row is HostEventRowWithInvitation => withInvitation(row) !== null);
}

export async function findHostEvent(
  db: DbTx,
  eventId: string,
): Promise<HostEventRowWithInvitation | null> {
  const row = await db.event.findFirst({
    where: { id: eventId, deletedAt: null },
    include: hostEventInclude,
  });
  return withInvitation(row);
}

export interface NewEventGraph {
  ownerUserId: string;
  title: Prisma.InputJsonValue;
  ceremonySlug: string;
  experienceMode: "CELEBRATION" | "MEMORIAL";
  startsAt: Date;
  endsAt: Date | null;
  timeZone: string;
  invitation: {
    eventSlug: string;
    salt: string;
    templateSlug: string;
    themeId: string;
    gateStyle: string;
    contentJson: Prisma.InputJsonValue;
    rsvpConfigJson: Prisma.InputJsonValue;
  };
}

/** Event (`DRAFT`), its FREE invitation and the owner's co-host row. Run inside a transaction. */
export async function createEventGraph(
  tx: DbTx,
  data: NewEventGraph,
): Promise<{ eventId: string; invitationId: string }> {
  const eventId = generateId("evt_");
  const invitationId = generateId("inv_");
  await tx.event.create({
    data: {
      id: eventId,
      ownerUserId: data.ownerUserId,
      title: data.title,
      ceremonySlug: data.ceremonySlug,
      experienceMode: data.experienceMode,
      status: "DRAFT",
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      timeZone: data.timeZone,
    },
  });
  await tx.invitation.create({
    data: {
      id: invitationId,
      eventId,
      eventSlug: data.invitation.eventSlug,
      templateSlug: data.invitation.templateSlug,
      themeId: data.invitation.themeId,
      gateStyle: data.invitation.gateStyle,
      contentJson: data.invitation.contentJson,
      languages: ["en"],
      defaultLanguage: "en",
      plan: "FREE",
      pinHash: null,
      rsvpConfigJson: data.invitation.rsvpConfigJson,
      salt: data.invitation.salt,
      wallEnabled: false,
      wallAutoApprove: false,
      wellMode: "NONE",
      wellConfigJson: {},
    },
  });
  await tx.coHost.create({
    data: { id: generateId("coh_"), eventId, userId: data.ownerUserId, role: "OWNER" },
  });
  return { eventId, invitationId };
}

export async function updateEventRow(
  tx: DbTx,
  eventId: string,
  data: Prisma.EventUpdateManyMutationInput,
): Promise<void> {
  await tx.event.updateMany({ where: { id: eventId, deletedAt: null }, data });
}

/**
 * Updates the invitation. With `expectedUpdatedAt` the write only happens when nobody else has
 * saved since the caller loaded it; the return value says whether a row was written.
 */
export async function updateInvitationRow(
  tx: DbTx,
  invitationId: string,
  data: Prisma.InvitationUpdateManyMutationInput,
  expectedUpdatedAt?: Date,
): Promise<boolean> {
  const result = await tx.invitation.updateMany({
    where: {
      id: invitationId,
      deletedAt: null,
      ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
    },
    data,
  });
  return result.count === 1;
}

/** Soft-deletes the event and its invitation, which also retires every guest link. */
export async function softDeleteEvent(
  tx: DbTx,
  eventId: string,
  invitationId: string,
  at: Date,
): Promise<void> {
  await tx.event.updateMany({ where: { id: eventId, deletedAt: null }, data: { deletedAt: at } });
  await tx.invitation.updateMany({
    where: { id: invitationId, deletedAt: null },
    data: { deletedAt: at },
  });
}

/** Sets `publishedAt` once. False when the invitation was already published. */
export async function markPublished(tx: DbTx, invitationId: string, at: Date): Promise<boolean> {
  const result = await tx.invitation.updateMany({
    where: { id: invitationId, deletedAt: null, publishedAt: null },
    data: { publishedAt: at },
  });
  return result.count === 1;
}

/** Clears `publishedAt`. False when the invitation was not published. */
export async function markUnpublished(tx: DbTx, invitationId: string): Promise<boolean> {
  const result = await tx.invitation.updateMany({
    where: { id: invitationId, deletedAt: null, publishedAt: { not: null } },
    data: { publishedAt: null },
  });
  return result.count === 1;
}

/** Moves the event between two statuses, only if it is still in `from`. */
export async function moveEventStatus(
  tx: DbTx,
  eventId: string,
  from: EventStatus,
  to: EventStatus,
): Promise<void> {
  await tx.event.updateMany({ where: { id: eventId, status: from }, data: { status: to } });
}

/**
 * True when the invitation has been published at some point, even if it is unpublished now.
 * `publishedAt` is cleared on unpublish, so the audit trail is the record of a first publish.
 */
export async function hasEverBeenPublished(db: DbTx, invitationId: string): Promise<boolean> {
  const entry = await db.auditLog.findFirst({
    where: { entity: "Invitation", entityId: invitationId, action: "invitation.publish" },
    select: { id: true },
  });
  return entry !== null;
}
