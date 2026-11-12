/**
 * Database access for door check-in.
 *
 * Health columns on nested `rsvp` rows are still encrypted here (the encryption extension only
 * handles top-level `rsvp` queries); the service decrypts the two flags the door may see.
 */
import type { Prisma, ScanResult } from "@managevent/db";
import { generateId } from "@managevent/db";
import type { DbTx } from "../../lib/deps.js";

export const checkInGuestInclude = {
  rsvp: { select: { status: true, dietaryEncrypted: true, allergySeverityEncrypted: true } },
  passes: {
    where: { revokedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, checkedInAt: true },
  },
  party: {
    select: {
      id: true,
      displayName: true,
      tableLabel: true,
      _count: { select: { guests: { where: { deletedAt: null } } } },
    },
  },
} satisfies Prisma.GuestInclude;

export type CheckInGuestRow = Prisma.GuestGetPayload<{ include: typeof checkInGuestInclude }>;

/** Every active guest of the event's active parties, attending or not (the door list is searchable). */
export async function listRosterGuests(db: DbTx, invitationId: string): Promise<CheckInGuestRow[]> {
  return db.guest.findMany({
    where: { deletedAt: null, party: { deletedAt: null, invitationId } },
    include: checkInGuestInclude,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

/** An active guest of this invitation, or null. */
export async function findRosterGuest(
  db: DbTx,
  invitationId: string,
  guestId: string,
): Promise<CheckInGuestRow | null> {
  return db.guest.findFirst({
    where: { id: guestId, deletedAt: null, party: { deletedAt: null, invitationId } },
    include: checkInGuestInclude,
  });
}

export const passScanInclude = {
  guest: { select: { id: true, deletedAt: true } },
  party: {
    select: {
      id: true,
      deletedAt: true,
      invitation: { select: { id: true, eventId: true, salt: true } },
    },
  },
} satisfies Prisma.PassInclude;

export type PassScanRow = Prisma.PassGetPayload<{ include: typeof passScanInclude }>;

export async function findPassForScan(db: DbTx, passId: string): Promise<PassScanRow | null> {
  return db.pass.findUnique({ where: { id: passId }, include: passScanInclude });
}

/** Serialises concurrent scans of one pass for the rest of the transaction. */
export async function lockPass(tx: DbTx, passId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Pass" WHERE "id" = ${passId} FOR UPDATE`;
}

/** Serialises concurrent manual check-ins of one guest (so only one pass is ever issued). */
export async function lockGuest(tx: DbTx, guestId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Guest" WHERE "id" = ${guestId} FOR NO KEY UPDATE`;
}

export async function findLivePassId(tx: DbTx, guestId: string): Promise<string | null> {
  const pass = await tx.pass.findFirst({
    where: { guestId, revokedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return pass?.id ?? null;
}

/**
 * The atomic check-in: succeeds for exactly one caller. Returns false when the pass was already
 * checked in (or revoked) by the time the update ran.
 */
export async function markPassCheckedIn(
  tx: DbTx,
  input: { passId: string; at: Date; byUserId: string | null; deviceId: string },
): Promise<boolean> {
  const updated = await tx.pass.updateMany({
    where: { id: input.passId, checkedInAt: null, revokedAt: null },
    data: { checkedInAt: input.at, checkedInBy: input.byUserId, deviceId: input.deviceId },
  });
  return updated.count === 1;
}

export const storedScanInclude = {
  pass: {
    select: {
      guestId: true,
      checkedInAt: true,
      party: { select: { invitation: { select: { eventId: true } } } },
    },
  },
} satisfies Prisma.ScanEventInclude;

export type StoredScanRow = Prisma.ScanEventGetPayload<{ include: typeof storedScanInclude }>;

export async function findScanByClientUuid(
  db: DbTx,
  clientUuid: string,
): Promise<StoredScanRow | null> {
  return db.scanEvent.findUnique({ where: { clientUuid }, include: storedScanInclude });
}

export async function createScanEvent(
  tx: DbTx,
  input: {
    passId: string;
    eventId: string;
    deviceId: string;
    scannedAt: Date;
    clientUuid: string;
    result: ScanResult;
  },
): Promise<string> {
  const id = generateId("scn_");
  await tx.scanEvent.create({ data: { id, ...input } });
  return id;
}
