/**
 * Database access for host moderation of wishing-well and tribute-book entries.
 *
 * These are top-level `wellEntry` queries, so the encryption extension decrypts hosts-only
 * messages on the way out.
 */
import type { MediaModeration, Prisma } from "@managevent/db";
import type { DbTx } from "../../lib/deps.js";

export const hostWellEntrySelect = {
  id: true,
  authorName: true,
  message: true,
  visibility: true,
  moderation: true,
  createdAt: true,
  deletedAt: true,
  party: { select: { displayName: true } },
} satisfies Prisma.WellEntrySelect;

export type HostWellEntryRow = Prisma.WellEntryGetPayload<{ select: typeof hostWellEntrySelect }>;

export async function listWellEntries(
  db: DbTx,
  invitationId: string,
  moderation?: MediaModeration,
  take = 500,
): Promise<HostWellEntryRow[]> {
  return db.wellEntry.findMany({
    where: { invitationId, deletedAt: null, ...(moderation ? { moderation } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: hostWellEntrySelect,
  });
}

/** An entry of this invitation, including a removed one (the caller decides what that means). */
export async function findWellEntry(
  db: DbTx,
  invitationId: string,
  entryId: string,
): Promise<HostWellEntryRow | null> {
  return db.wellEntry.findFirst({
    where: { id: entryId, invitationId },
    select: hostWellEntrySelect,
  });
}

export async function setWellEntryModeration(
  tx: DbTx,
  entryId: string,
  moderation: MediaModeration,
): Promise<HostWellEntryRow> {
  return tx.wellEntry.update({
    where: { id: entryId },
    data: { moderation },
    select: hostWellEntrySelect,
  });
}

export async function softDeleteWellEntry(tx: DbTx, entryId: string, at: Date): Promise<void> {
  await tx.wellEntry.updateMany({
    where: { id: entryId, deletedAt: null },
    data: { deletedAt: at },
  });
}
