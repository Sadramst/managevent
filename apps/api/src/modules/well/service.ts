/**
 * Host moderation of wishing-well and tribute-book entries (`media:moderate`).
 *
 * Guests write entries through the guest site; they start `PENDING`. Only `APPROVED` entries the
 * author chose to share (`WALL`) ever appear on the invitation.
 */
import type { AuthActor } from "@managevent/auth";
import type { MediaModeration } from "@managevent/db";
import type { HostWellEntry, HostWellEntryList, WellEntryModerate } from "@managevent/validators";
import { requireEventAccess } from "../../lib/access.js";
import { writeAudit } from "../../lib/audit.js";
import type { ApiDeps } from "../../lib/deps.js";
import { notFound } from "../../lib/errors.js";
import { fromLocalized } from "../../lib/localized.js";
import { assertNotDemo } from "../events/service.js";
import {
  findWellEntry,
  type HostWellEntryRow,
  listWellEntries,
  setWellEntryModeration,
  softDeleteWellEntry,
} from "./repo.js";

export function toHostWellEntry(row: HostWellEntryRow): HostWellEntry {
  return {
    id: row.id,
    partyDisplayName: row.party ? fromLocalized(row.party.displayName) : null,
    authorName: row.authorName,
    message: row.message,
    visibility: row.visibility,
    moderation: row.moderation,
    createdAt: row.createdAt.toISOString(),
  };
}

export class WellService {
  constructor(private readonly deps: ApiDeps) {}

  async list(
    actor: AuthActor | null,
    eventId: string,
    moderation?: MediaModeration,
  ): Promise<HostWellEntryList> {
    const access = await requireEventAccess(this.deps, actor, eventId, "media:moderate");
    const rows = await listWellEntries(this.deps.db, access.invitation.id, moderation);
    return { items: rows.map(toHostWellEntry) };
  }

  async moderate(
    actor: AuthActor | null,
    eventId: string,
    entryId: string,
    input: WellEntryModerate,
    ip?: string,
  ): Promise<HostWellEntry> {
    const access = await requireEventAccess(this.deps, actor, eventId, "media:moderate");
    // Sample invitations are read-only for everyone, staff included.
    assertNotDemo(access);
    const existing = await findWellEntry(this.deps.db, access.invitation.id, entryId);
    if (!existing || existing.deletedAt !== null) throw notFound("Entry not found");
    // Setting the same decision again changes nothing and is not audited twice.
    if (existing.moderation === input.moderation) return toHostWellEntry(existing);

    const updated = await this.deps.db.$transaction(async (tx) => {
      const row = await setWellEntryModeration(tx, existing.id, input.moderation);
      await writeAudit(tx, {
        actor,
        action: "well.moderate",
        entity: "WellEntry",
        entityId: existing.id,
        // Decision only: never the author or the message.
        diff: { eventId: access.event.id, from: existing.moderation, to: input.moderation },
        ...(ip ? { ip } : {}),
      });
      return row;
    });
    return toHostWellEntry(updated);
  }

  /** Soft delete. Removing an entry that is already removed is a no-op. */
  async remove(
    actor: AuthActor | null,
    eventId: string,
    entryId: string,
    ip?: string,
  ): Promise<void> {
    const access = await requireEventAccess(this.deps, actor, eventId, "media:moderate");
    assertNotDemo(access);
    const existing = await findWellEntry(this.deps.db, access.invitation.id, entryId);
    if (!existing) throw notFound("Entry not found");
    if (existing.deletedAt !== null) return;

    const now = this.deps.now();
    await this.deps.db.$transaction(async (tx) => {
      await softDeleteWellEntry(tx, existing.id, now);
      await writeAudit(tx, {
        actor,
        action: "well.delete",
        entity: "WellEntry",
        entityId: existing.id,
        diff: { eventId: access.event.id, moderation: existing.moderation },
        ...(ip ? { ip } : {}),
      });
    });
  }
}
