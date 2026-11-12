/**
 * Guest-list persistence. Every function takes the client or a transaction client (`DbTx`), so
 * the service decides what runs atomically. Soft-deleted parties and guests are never returned
 * unless a function says so.
 */
import { decryptRsvpRecord, generateId, type Prisma, type RsvpStatus } from "@managevent/db";
import type { DbTx } from "../../lib/deps.js";
import { generateStableId } from "../../lib/guest-tokens.js";
import { toLocalized } from "../../lib/localized.js";
import type { AddressEmailActivity } from "./view.js";

export const INVITE_TEMPLATE_KEY = "invitation.send";
export const REMINDER_TEMPLATE_KEY = "rsvp.reminder";

const liveGuestOrder = [
  { createdAt: "asc" },
  { id: "asc" },
] satisfies Prisma.GuestOrderByWithRelationInput[];

/** A party with its live guests, their RSVP status (no health fields) and check-in times. */
export const PARTY_INCLUDE = {
  guests: {
    where: { deletedAt: null },
    orderBy: liveGuestOrder,
    include: {
      rsvp: { select: { status: true, respondedAt: true } },
      passes: {
        where: { checkedInAt: { not: null }, revokedAt: null },
        select: { checkedInAt: true },
      },
    },
  },
} satisfies Prisma.PartyInclude;

export type PartyRow = Prisma.PartyGetPayload<{ include: typeof PARTY_INCLUDE }>;

/**
 * Serialises guest-list writes for one invitation (row lock held until the transaction ends), so
 * the plan guest cap and token uniqueness checks cannot race.
 */
export async function lockInvitation(tx: DbTx, invitationId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "Invitation" WHERE "id" = ${invitationId} FOR NO KEY UPDATE`;
}

/**
 * Takes the same row lock on the party that a guest's RSVP takes (`guest-site/repo.ts`), so a
 * host edit of one party and that party's own submission run one after the other. Always taken
 * AFTER `lockInvitation`; the guest path takes only this lock, so the order cannot deadlock.
 * Read the party after this call, not before.
 */
export async function lockParty(tx: DbTx, partyId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Party" WHERE "id" = ${partyId} FOR NO KEY UPDATE`;
}

/** Non-deleted guests of non-deleted parties: the number the plan guest cap applies to. */
export function countLiveGuests(tx: DbTx, invitationId: string): Promise<number> {
  return tx.guest.count({
    where: { deletedAt: null, party: { invitationId, deletedAt: null } },
  });
}

export function countLiveParties(tx: DbTx, invitationId: string): Promise<number> {
  return tx.party.count({ where: { invitationId, deletedAt: null } });
}

export function findParty(
  tx: DbTx,
  invitationId: string,
  partyId: string,
): Promise<PartyRow | null> {
  return tx.party.findFirst({
    where: { id: partyId, invitationId, deletedAt: null },
    include: PARTY_INCLUDE,
  });
}

/** Includes soft-deleted parties: used to make a repeated DELETE a no-op instead of a 404. */
export function findPartyState(
  tx: DbTx,
  invitationId: string,
  partyId: string,
): Promise<{ id: string; deletedAt: Date | null } | null> {
  return tx.party.findFirst({
    where: { id: partyId, invitationId },
    select: { id: true, deletedAt: true },
  });
}

/** Includes soft-deleted guests, for the same reason as `findPartyState`. */
export function findGuestState(
  tx: DbTx,
  partyId: string,
  guestId: string,
): Promise<{ id: string; deletedAt: Date | null; isChild: boolean } | null> {
  return tx.guest.findFirst({
    where: { id: guestId, partyId },
    select: { id: true, deletedAt: true, isChild: true },
  });
}

/** Parties already created from these stable ids (idempotent create and import). Includes deleted ones. */
export function findPartiesByStableIds(
  tx: DbTx,
  invitationId: string,
  stableIds: readonly string[],
): Promise<Array<{ id: string; stableId: string; deletedAt: Date | null }>> {
  if (stableIds.length === 0) return Promise.resolve([]);
  return tx.party.findMany({
    where: { invitationId, stableId: { in: [...stableIds] } },
    select: { id: true, stableId: true, deletedAt: true },
  });
}

export function listParties(
  tx: DbTx,
  invitationId: string,
  filter: { tag?: string; partyIds?: readonly string[] } = {},
): Promise<PartyRow[]> {
  return tx.party.findMany({
    where: {
      invitationId,
      deletedAt: null,
      ...(filter.tag ? { tags: { has: filter.tag } } : {}),
      ...(filter.partyIds ? { id: { in: [...filter.partyIds] } } : {}),
    },
    // Ids are UUIDv7, so id order is creation order and makes a stable cursor.
    orderBy: { id: "asc" },
    include: PARTY_INCLUDE,
  });
}

/**
 * Which of `tokens` are unavailable on this invitation: in use by any party (deleted ones still
 * hold their unique slot) or on a party's revoked list, where reuse would make the lookup ambiguous.
 */
export async function findTakenTokens(
  tx: DbTx,
  invitationId: string,
  tokens: readonly string[],
): Promise<Set<string>> {
  const wanted = new Set(tokens);
  const taken = new Set<string>();
  if (wanted.size === 0) return taken;
  const rows = await tx.party.findMany({
    where: {
      invitationId,
      OR: [{ token: { in: [...wanted] } }, { revokedTokens: { hasSome: [...wanted] } }],
    },
    select: { token: true, revokedTokens: true },
  });
  for (const row of rows) {
    if (wanted.has(row.token)) taken.add(row.token);
    for (const revoked of row.revokedTokens) if (wanted.has(revoked)) taken.add(revoked);
  }
  return taken;
}

export interface NewGuest {
  name: string;
  email: string | null;
  phone: string | null;
  isChild: boolean;
}

export interface NewParty {
  id: string;
  stableId: string;
  displayName: string;
  token: string;
  tokenVersion: number;
  maxSeats: number;
  allowPlusOnes: boolean;
  childrenAllowed: boolean;
  tags: string[];
  tableLabel: string | null;
  guests: NewGuest[];
}

function guestRow(partyId: string, guest: NewGuest): Prisma.GuestCreateManyInput {
  return {
    id: generateId("gst_"),
    partyId,
    stableId: generateStableId(),
    name: toLocalized(guest.name),
    email: guest.email,
    phone: guest.phone,
    isChild: guest.isChild,
    isPlusOne: false,
  };
}

/** Inserts parties and their guests in two statements (used for one party and for an import). */
export async function insertParties(
  tx: DbTx,
  invitationId: string,
  parties: readonly NewParty[],
): Promise<void> {
  if (parties.length === 0) return;
  await tx.party.createMany({
    data: parties.map((party) => ({
      id: party.id,
      invitationId,
      stableId: party.stableId,
      displayName: toLocalized(party.displayName),
      token: party.token,
      tokenVersion: party.tokenVersion,
      maxSeats: party.maxSeats,
      allowPlusOnes: party.allowPlusOnes,
      childrenAllowed: party.childrenAllowed,
      tags: party.tags,
      tableLabel: party.tableLabel,
    })),
  });
  await tx.guest.createMany({
    data: parties.flatMap((party) => party.guests.map((guest) => guestRow(party.id, guest))),
  });
}

export async function insertGuest(tx: DbTx, partyId: string, guest: NewGuest): Promise<string> {
  const row = guestRow(partyId, guest);
  await tx.guest.create({ data: row });
  return row.id;
}

export async function updateParty(
  tx: DbTx,
  partyId: string,
  data: Prisma.PartyUpdateInput,
): Promise<void> {
  await tx.party.update({ where: { id: partyId }, data });
}

export async function updateGuest(
  tx: DbTx,
  guestId: string,
  data: Prisma.GuestUpdateInput,
): Promise<void> {
  await tx.guest.update({ where: { id: guestId }, data });
}

/** Soft-deletes the party and its guests, and revokes the party's passes so they cannot be scanned. */
export async function softDeleteParty(tx: DbTx, partyId: string, now: Date): Promise<number> {
  const guests = await tx.guest.updateMany({
    where: { partyId, deletedAt: null },
    data: { deletedAt: now },
  });
  await tx.pass.updateMany({ where: { partyId, revokedAt: null }, data: { revokedAt: now } });
  await tx.party.update({ where: { id: partyId }, data: { deletedAt: now } });
  return guests.count;
}

export async function softDeleteGuest(tx: DbTx, guestId: string, now: Date): Promise<void> {
  await tx.guest.update({ where: { id: guestId }, data: { deletedAt: now } });
}

/**
 * Records a host-entered status. Health fields are never touched here. A guest with no RSVP row
 * who is set to `PENDING` stays without one. Returns the previous status.
 */
export async function setHostRsvp(
  tx: DbTx,
  guestId: string,
  status: RsvpStatus,
  now: Date,
): Promise<RsvpStatus> {
  const existing = await tx.rsvp.findUnique({
    where: { guestId },
    select: { id: true, status: true },
  });
  if (!existing && status === "PENDING") return "PENDING";
  if (existing?.status === status) return existing.status;
  // An upsert, so a row that appears between the read and the write (the caller holds the party
  // lock, but nothing else should be able to turn this into a unique violation) is updated.
  await tx.rsvp.upsert({
    where: { guestId },
    create: {
      id: generateId("rsvp_"),
      guestId,
      status,
      respondedAt: now,
      songRequests: [],
      source: "HOST_ENTRY",
      idempotencyKey: `host:${generateId("rsvp_")}:${guestId}`,
    },
    update: { status, respondedAt: now, source: "HOST_ENTRY" },
  });
  return existing?.status ?? "PENDING";
}

/** What has been sent to each address hash for this event (successful sends only). */
export async function loadEmailActivity(
  tx: DbTx,
  eventId: string,
  addressHashes: readonly string[],
): Promise<Map<string, AddressEmailActivity>> {
  const activity = new Map<string, AddressEmailActivity>();
  const hashes = [...new Set(addressHashes)];
  if (hashes.length === 0) return activity;
  const messages = await tx.message.findMany({
    where: {
      eventId,
      channel: "EMAIL",
      status: "SENT",
      templateKey: { in: [INVITE_TEMPLATE_KEY, REMINDER_TEMPLATE_KEY] },
      to: { in: hashes },
    },
    select: { to: true, templateKey: true, sentAt: true, createdAt: true },
  });
  for (const message of messages) {
    const entry = activity.get(message.to) ?? { inviteSentAt: null, remindersSent: 0 };
    if (message.templateKey === INVITE_TEMPLATE_KEY) {
      const at = message.sentAt ?? message.createdAt;
      if (!entry.inviteSentAt || at < entry.inviteSentAt) entry.inviteSentAt = at;
    } else {
      entry.remindersSent += 1;
    }
    activity.set(message.to, entry);
  }
  return activity;
}

const EXPORT_BASE_RSVP_SELECT = { status: true, respondedAt: true } satisfies Prisma.RsvpSelect;
const EXPORT_HEALTH_RSVP_SELECT = {
  ...EXPORT_BASE_RSVP_SELECT,
  dietaryEncrypted: true,
  allergySeverityEncrypted: true,
  allergyNotes: true,
  accessibilityNotes: true,
} satisfies Prisma.RsvpSelect;

export interface ExportHealth {
  dietary: string[];
  allergySeverity: string | null;
  allergyNotes: string | null;
  accessibilityNotes: string | null;
}

export interface ExportParty {
  displayName: unknown;
  token: string;
  maxSeats: number;
  tags: string[];
  tableLabel: string | null;
  guests: Array<{
    name: unknown;
    email: string | null;
    phone: string | null;
    isChild: boolean;
    isPlusOne: boolean;
    status: RsvpStatus;
    respondedAt: Date | null;
    checkedIn: boolean;
    /** Present only when health data was requested. */
    health?: ExportHealth;
  }>;
}

/**
 * Parties and guests for the CSV export. Health columns are selected, and decrypted, only when
 * `includeHealth` is true: a nested `rsvp` row comes back as ciphertext, because the field
 * encryption extension only handles top-level `rsvp` queries.
 */
export async function listExportParties(
  tx: DbTx,
  invitationId: string,
  includeHealth: boolean,
): Promise<ExportParty[]> {
  const parties = await tx.party.findMany({
    where: { invitationId, deletedAt: null },
    orderBy: { id: "asc" },
    select: {
      displayName: true,
      token: true,
      maxSeats: true,
      tags: true,
      tableLabel: true,
      guests: {
        where: { deletedAt: null },
        orderBy: liveGuestOrder,
        select: {
          name: true,
          email: true,
          phone: true,
          isChild: true,
          isPlusOne: true,
          rsvp: { select: includeHealth ? EXPORT_HEALTH_RSVP_SELECT : EXPORT_BASE_RSVP_SELECT },
          passes: {
            where: { checkedInAt: { not: null }, revokedAt: null },
            select: { id: true },
          },
        },
      },
    },
  });

  return parties.map((party) => ({
    displayName: party.displayName,
    token: party.token,
    maxSeats: party.maxSeats,
    tags: party.tags,
    tableLabel: party.tableLabel,
    guests: party.guests.map((guest) => {
      const status: RsvpStatus = guest.rsvp?.status ?? "PENDING";
      const base = {
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        isChild: guest.isChild,
        isPlusOne: guest.isPlusOne,
        status,
        respondedAt: guest.rsvp && status !== "PENDING" ? guest.rsvp.respondedAt : null,
        checkedIn: guest.passes.length > 0,
      };
      if (!includeHealth) return base;
      return { ...base, health: readHealth(guest.rsvp) };
    }),
  }));
}

/** Decrypts the health fields of a nested RSVP row. */
export function readHealth(rsvp: unknown): ExportHealth {
  const empty: ExportHealth = {
    dietary: [],
    allergySeverity: null,
    allergyNotes: null,
    accessibilityNotes: null,
  };
  if (!rsvp || typeof rsvp !== "object") return empty;
  const plain = decryptRsvpRecord(rsvp as Record<string, unknown>);
  return {
    dietary: Array.isArray(plain.dietary)
      ? plain.dietary.filter((tag): tag is string => typeof tag === "string")
      : [],
    allergySeverity: typeof plain.allergySeverity === "string" ? plain.allergySeverity : null,
    allergyNotes:
      typeof plain.allergyNotes === "string" && plain.allergyNotes.length > 0
        ? plain.allergyNotes
        : null,
    accessibilityNotes:
      typeof plain.accessibilityNotes === "string" && plain.accessibilityNotes.length > 0
        ? plain.accessibilityNotes
        : null,
  };
}
