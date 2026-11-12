/**
 * Host guest list: parties, guests, guest links, host RSVP entry, CSV import and export.
 *
 * Every operation resolves the event through `requireEventAccess`, so an event the actor cannot
 * read is a 404 and a missing permission is a 403. Writes run in one transaction that takes a row
 * lock on the invitation; changes that affect numbers also record a headcount snapshot there and
 * enqueue `headcount.changed` after the commit (the bridge to catering and logistics).
 */
import type { AuthActor } from "@managevent/auth";
import { generateId, type Prisma, type RsvpStatus } from "@managevent/db";
import { canAddGuestsUnderPlan } from "@managevent/payments";
import type {
  GuestImport,
  GuestImportResult,
  HostGuestInputParsed,
  HostGuestUpdate,
  HostParty,
  HostPartyCreate,
  HostPartyList,
  HostPartyListQuery,
  HostPartyUpdate,
  HostRsvpEntry,
} from "@managevent/validators";
import {
  checkHostPermission,
  type EventAccess,
  requireEventAccess,
  requireHostPermission,
} from "../../lib/access.js";
import { writeAudit } from "../../lib/audit.js";
import type { ApiDeps, DbTx } from "../../lib/deps.js";
import { ApiProblem, isUniqueViolation, notFound } from "../../lib/errors.js";
import { buildPartyToken, generateStableId } from "../../lib/guest-tokens.js";
import { fromLocalized, toLocalized } from "../../lib/localized.js";
import { utcToZonedWallTime } from "../../lib/time.js";
import { syncPassesForParty } from "../checkin/pass.js";
import { enqueueHeadcountChanged, recordHeadcountSnapshot } from "../headcount/service.js";
import { hashEmailAddress } from "../messaging/unsubscribe-token.js";
import {
  buildGuestExportCsv,
  type ExportGuestRow,
  MAX_IMPORT_ROWS,
  MAX_PARTY_GUESTS,
  planGuestImport,
} from "./csv.js";
import * as repo from "./repo.js";
import { invitePath, partyMatchesQuery, toHostParty } from "./view.js";

/** Who is calling and from where (the IP goes on audit rows only). */
export interface RequestContext {
  actor: AuthActor | null;
  ip?: string;
}

const IMPORT_TX_OPTIONS = { maxWait: 10_000, timeout: 60_000 } as const;
const MAX_TOKEN_ATTEMPTS = 25;
/** How many times one import key can be reused for a file whose parties were deleted again. */
const MAX_IMPORT_GENERATIONS = 20;

/**
 * A guest link is the whole credential for answering as that party (RSVP, contact details,
 * wishes). Read-only callers therefore never receive it: only `guest:write` shows links.
 */
function canSeeGuestLinks(ctx: RequestContext, access: EventAccess): boolean {
  return checkHostPermission(ctx.actor, "guest:write", access.scope).allowed;
}

function assertWritable(access: EventAccess): void {
  if (access.invitation.isDemo) {
    throw new ApiProblem(403, "DEMO_READ_ONLY", "Sample invitations cannot be changed");
  }
}

function validationProblem(message: string, fieldErrors: Record<string, string[]>): ApiProblem {
  return new ApiProblem(400, "VALIDATION_ERROR", message, { formErrors: [], fieldErrors });
}

/** The plan's guest limit, or null when unlimited. */
export function guestLimitOf(access: EventAccess): number | null {
  const max = access.effectivePlan.maxGuests;
  return max === "unlimited" ? null : max;
}

function assertGuestCap(access: EventAccess, current: number, adding: number): void {
  const total = current + adding;
  if (!canAddGuestsUnderPlan(access.invitation.plan, total, access.event.experienceMode)) {
    throw new ApiProblem(403, "PLAN_LIMIT_EXCEEDED", "The guest limit of this plan is reached", {
      limit: guestLimitOf(access),
      current,
      requested: adding,
    });
  }
}

function logAfterCommitFailure(event: string, err: unknown): void {
  if (process.env.NODE_ENV === "test") return;
  console.error(
    JSON.stringify({
      level: "error",
      msg: event,
      error: err instanceof Error ? err.name : "UnknownError",
    }),
  );
}

/**
 * Picks a free token for each new party. A candidate that collides with a token on this
 * invitation (or with another candidate in the batch) gets the next `tokenVersion`.
 */
async function assignTokens(
  tx: DbTx,
  invitation: { id: string; salt: string },
  parties: ReadonlyArray<{ displayName: string; stableId: string; startVersion?: number }>,
): Promise<Array<{ token: string; tokenVersion: number }>> {
  const versions = parties.map((party) => party.startVersion ?? 0);
  const assigned: Array<{ token: string; tokenVersion: number } | undefined> = parties.map(
    () => undefined,
  );
  const used = new Set<string>();
  let pending = parties.map((_, index) => index);

  for (let attempt = 0; pending.length > 0; attempt += 1) {
    if (attempt >= MAX_TOKEN_ATTEMPTS) throw new Error("Could not allocate a unique guest token");
    const candidates = pending.map((index) => {
      const party = parties[index] as (typeof parties)[number];
      return buildPartyToken(
        party.displayName,
        invitation.salt,
        party.stableId,
        versions[index] as number,
      );
    });
    const taken = await repo.findTakenTokens(tx, invitation.id, candidates);
    const next: number[] = [];
    pending.forEach((index, position) => {
      const token = candidates[position] as string;
      if (taken.has(token) || used.has(token)) {
        versions[index] = (versions[index] as number) + 1;
        next.push(index);
      } else {
        used.add(token);
        assigned[index] = { token, tokenVersion: versions[index] as number };
      }
    });
    pending = next;
  }
  return assigned as Array<{ token: string; tokenVersion: number }>;
}

function formatLocal(at: Date | null, timeZone: string): string {
  if (!at) return "";
  // en-AU: DD/MM/YYYY HH:mm in the event's time zone.
  const [date = "", time = ""] = utcToZonedWallTime(at, timeZone).split("T");
  const [year = "", month = "", day = ""] = date.split("-");
  return `${day}/${month}/${year} ${time}`;
}

export function createGuestListService(deps: ApiDeps) {
  async function notifyHeadcount(eventId: string, headcountId: string | null): Promise<void> {
    if (!headcountId) return;
    try {
      await enqueueHeadcountChanged(deps.queue, eventId, headcountId);
    } catch (err) {
      // The change is committed and the snapshot row exists, so the job can be re-driven.
      logAfterCommitFailure("headcount.changed enqueue failed", err);
    }
  }

  async function present(
    ctx: RequestContext,
    access: EventAccess,
    rows: repo.PartyRow[],
  ): Promise<HostParty[]> {
    const hashes = rows.flatMap((row) =>
      row.guests.flatMap((guest) => (guest.email ? [hashEmailAddress(guest.email)] : [])),
    );
    const emailActivity = await repo.loadEmailActivity(deps.db, access.event.id, hashes);
    const showLink = canSeeGuestLinks(ctx, access);
    return rows.map((row) =>
      toHostParty(row, { eventSlug: access.invitation.eventSlug, showLink, emailActivity }),
    );
  }

  async function presentOne(
    ctx: RequestContext,
    access: EventAccess,
    partyId: string,
  ): Promise<HostParty> {
    const row = await repo.findParty(deps.db, access.invitation.id, partyId);
    if (!row) throw notFound("Party not found");
    const [party] = await present(ctx, access, [row]);
    return party as HostParty;
  }

  return {
    async listParties(
      ctx: RequestContext,
      eventId: string,
      query: HostPartyListQuery,
    ): Promise<HostPartyList> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:read");
      const invitationId = access.invitation.id;
      const [rows, parties, guests] = await Promise.all([
        repo.listParties(deps.db, invitationId, query.tag ? { tag: query.tag } : {}),
        repo.countLiveParties(deps.db, invitationId),
        repo.countLiveGuests(deps.db, invitationId),
      ]);

      // Status is derived from the guests' RSVPs and the name is stored as JSON, so those two
      // filters run here. A guest list is bounded by the plan and by the import limit.
      const matching = (await present(ctx, access, rows)).filter(
        (party) =>
          (!query.status || party.status === query.status) &&
          (!query.q || partyMatchesQuery(party, query.q)) &&
          (!query.cursor || party.id > query.cursor),
      );
      const items = matching.slice(0, query.limit);
      const hasMore = matching.length > items.length;
      return {
        items,
        nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
        totals: { parties, guests },
      };
    },

    /** Creates a party. With an idempotency key, a repeat returns the party made the first time. */
    async createParty(
      ctx: RequestContext,
      eventId: string,
      input: HostPartyCreate,
      idempotencyKey?: string,
    ): Promise<{ party: HostParty; created: boolean }> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:write");
      assertWritable(access);
      const invitation = access.invitation;
      const stableId = generateStableId(idempotencyKey);

      const guests: repo.NewGuest[] = (
        input.guests.length > 0 ? input.guests : [{ name: input.displayName, isChild: false }]
      ).map((guest) => ({
        name: guest.name,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
        isChild: guest.isChild,
      }));
      const maxSeats = Math.max(input.maxSeats ?? 1, guests.length);

      const replay = async (tx: DbTx): Promise<string | null> => {
        if (!idempotencyKey) return null;
        const [existing] = await repo.findPartiesByStableIds(tx, invitation.id, [stableId]);
        if (!existing) return null;
        if (existing.deletedAt) {
          throw new ApiProblem(
            409,
            "CONFLICT",
            "This Idempotency-Key was used for a party that has since been deleted",
          );
        }
        return existing.id;
      };

      let outcome: { partyId: string; headcountId: string | null };
      try {
        outcome = await deps.db.$transaction(async (tx) => {
          await repo.lockInvitation(tx, invitation.id);
          const replayed = await replay(tx);
          if (replayed) return { partyId: replayed, headcountId: null };

          assertGuestCap(access, await repo.countLiveGuests(tx, invitation.id), guests.length);
          const [assigned] = await assignTokens(tx, invitation, [
            { displayName: input.displayName, stableId },
          ]);
          const partyId = generateId("pty_");
          await repo.insertParties(tx, invitation.id, [
            {
              id: partyId,
              stableId,
              displayName: input.displayName,
              token: (assigned as { token: string }).token,
              tokenVersion: (assigned as { tokenVersion: number }).tokenVersion,
              maxSeats,
              allowPlusOnes: input.allowPlusOnes,
              childrenAllowed: input.childrenAllowed,
              tags: input.tags,
              tableLabel: input.tableLabel?.trim() || null,
              guests,
            },
          ]);
          const headcount = await recordHeadcountSnapshot(tx, eventId, "HOST_EDIT");
          return { partyId, headcountId: headcount.id };
        });
      } catch (err) {
        // Lost a race with the same Idempotency-Key: the other request created the party.
        if (!isUniqueViolation(err)) throw err;
        const replayed = await replay(deps.db);
        if (!replayed) throw err;
        outcome = { partyId: replayed, headcountId: null };
      }

      await notifyHeadcount(eventId, outcome.headcountId);
      return {
        party: await presentOne(ctx, access, outcome.partyId),
        created: outcome.headcountId !== null,
      };
    },

    async updateParty(
      ctx: RequestContext,
      eventId: string,
      partyId: string,
      input: HostPartyUpdate,
    ): Promise<HostParty> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:write");
      assertWritable(access);

      await deps.db.$transaction(async (tx) => {
        await repo.lockInvitation(tx, access.invitation.id);
        // Also excludes the party's own RSVP, which can add plus-ones up to `maxSeats`.
        await repo.lockParty(tx, partyId);
        const party = await repo.findParty(tx, access.invitation.id, partyId);
        if (!party) throw notFound("Party not found");
        if (input.maxSeats !== undefined && input.maxSeats < party.guests.length) {
          throw validationProblem("Seats cannot be fewer than the guests already in the party", {
            maxSeats: [`Must be at least ${party.guests.length}`],
          });
        }
        // The guest link is not recomputed on rename: links already sent keep working.
        const data: Prisma.PartyUpdateInput = {
          ...(input.displayName !== undefined
            ? { displayName: toLocalized(input.displayName) }
            : {}),
          ...(input.maxSeats !== undefined ? { maxSeats: input.maxSeats } : {}),
          ...(input.allowPlusOnes !== undefined ? { allowPlusOnes: input.allowPlusOnes } : {}),
          ...(input.childrenAllowed !== undefined
            ? { childrenAllowed: input.childrenAllowed }
            : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.tableLabel !== undefined
            ? { tableLabel: input.tableLabel?.trim() || null }
            : {}),
        };
        if (Object.keys(data).length > 0) await repo.updateParty(tx, partyId, data);
      });
      return presentOne(ctx, access, partyId);
    },

    /** Soft-deletes a party and its guests. Deleting it again is a no-op. */
    async removeParty(ctx: RequestContext, eventId: string, partyId: string): Promise<void> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:write");
      assertWritable(access);

      const headcountId = await deps.db.$transaction(async (tx) => {
        await repo.lockInvitation(tx, access.invitation.id);
        await repo.lockParty(tx, partyId);
        const party = await repo.findPartyState(tx, access.invitation.id, partyId);
        if (!party) throw notFound("Party not found");
        if (party.deletedAt) return null;

        const guestCount = await repo.softDeleteParty(tx, partyId, deps.now());
        await writeAudit(tx, {
          actor: ctx.actor,
          action: "party.delete",
          entity: "Party",
          entityId: partyId,
          diff: { eventId, guestCount },
          ...(ctx.ip ? { ip: ctx.ip } : {}),
        });
        return (await recordHeadcountSnapshot(tx, eventId, "HOST_EDIT")).id;
      });
      await notifyHeadcount(eventId, headcountId);
    },

    /** Stops the party's link from working. Revoking a revoked link changes nothing. */
    async revokeLink(ctx: RequestContext, eventId: string, partyId: string): Promise<HostParty> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:write");
      assertWritable(access);

      await deps.db.$transaction(async (tx) => {
        await repo.lockInvitation(tx, access.invitation.id);
        await repo.lockParty(tx, partyId);
        const party = await repo.findParty(tx, access.invitation.id, partyId);
        if (!party) throw notFound("Party not found");
        if (party.tokenRevokedAt) return;
        await repo.updateParty(tx, partyId, { tokenRevokedAt: deps.now() });
        await writeAudit(tx, {
          actor: ctx.actor,
          action: "party.link_revoke",
          entity: "Party",
          entityId: partyId,
          diff: { eventId },
          ...(ctx.ip ? { ip: ctx.ip } : {}),
        });
      });
      return presentOne(ctx, access, partyId);
    },

    /** Replaces the party's link. The old link answers `410 LINK_REVOKED` from then on. */
    async reissueLink(ctx: RequestContext, eventId: string, partyId: string): Promise<HostParty> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:write");
      assertWritable(access);

      await deps.db.$transaction(async (tx) => {
        await repo.lockInvitation(tx, access.invitation.id);
        await repo.lockParty(tx, partyId);
        const party = await repo.findParty(tx, access.invitation.id, partyId);
        if (!party) throw notFound("Party not found");
        const [assigned] = await assignTokens(tx, access.invitation, [
          {
            displayName: fromLocalized(party.displayName),
            stableId: party.stableId,
            startVersion: party.tokenVersion + 1,
          },
        ]);
        const next = assigned as { token: string; tokenVersion: number };
        await repo.updateParty(tx, partyId, {
          token: next.token,
          tokenVersion: next.tokenVersion,
          revokedTokens: { push: party.token },
          tokenRevokedAt: null,
        });
        await writeAudit(tx, {
          actor: ctx.actor,
          action: "party.link_reissue",
          entity: "Party",
          entityId: partyId,
          // Versions only: a token never goes into the audit trail.
          diff: { eventId, fromVersion: party.tokenVersion, toVersion: next.tokenVersion },
          ...(ctx.ip ? { ip: ctx.ip } : {}),
        });
      });
      return presentOne(ctx, access, partyId);
    },

    async addGuest(
      ctx: RequestContext,
      eventId: string,
      partyId: string,
      input: HostGuestInputParsed,
    ): Promise<HostParty> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:write");
      assertWritable(access);

      const headcountId = await deps.db.$transaction(async (tx) => {
        await repo.lockInvitation(tx, access.invitation.id);
        // The party's own RSVP adds plus-ones under this lock: without it both sides would count
        // the seats before the other's guest exists and the party would exceed `maxSeats`.
        await repo.lockParty(tx, partyId);
        const party = await repo.findParty(tx, access.invitation.id, partyId);
        if (!party) throw notFound("Party not found");
        if (party.guests.length >= MAX_PARTY_GUESTS) {
          throw validationProblem(`A party can have at most ${MAX_PARTY_GUESTS} guests`, {
            name: [`This party already has ${MAX_PARTY_GUESTS} guests`],
          });
        }
        assertGuestCap(access, await repo.countLiveGuests(tx, access.invitation.id), 1);

        await repo.insertGuest(tx, partyId, {
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          isChild: input.isChild,
        });
        const seatsNeeded = party.guests.length + 1;
        if (seatsNeeded > party.maxSeats) {
          await repo.updateParty(tx, partyId, { maxSeats: seatsNeeded });
        }
        return (await recordHeadcountSnapshot(tx, eventId, "HOST_EDIT")).id;
      });
      await notifyHeadcount(eventId, headcountId);
      return presentOne(ctx, access, partyId);
    },

    async updateGuest(
      ctx: RequestContext,
      eventId: string,
      partyId: string,
      guestId: string,
      input: HostGuestUpdate,
    ): Promise<HostParty> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:write");
      assertWritable(access);

      const headcountId = await deps.db.$transaction(async (tx) => {
        await repo.lockInvitation(tx, access.invitation.id);
        // The guest's own RSVP can write contact details on the primary guest.
        await repo.lockParty(tx, partyId);
        const party = await repo.findParty(tx, access.invitation.id, partyId);
        const guest = party?.guests.find((candidate) => candidate.id === guestId);
        if (!party || !guest) throw notFound("Guest not found");

        const data: Prisma.GuestUpdateInput = {
          ...(input.name !== undefined ? { name: toLocalized(input.name) } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.isChild !== undefined ? { isChild: input.isChild } : {}),
        };
        if (Object.keys(data).length > 0) await repo.updateGuest(tx, guestId, data);

        // Adult or child changes the catering numbers; a name or contact change does not.
        if (input.isChild === undefined || input.isChild === guest.isChild) return null;
        return (await recordHeadcountSnapshot(tx, eventId, "HOST_EDIT")).id;
      });
      await notifyHeadcount(eventId, headcountId);
      return presentOne(ctx, access, partyId);
    },

    /** Soft-deletes a guest and revokes their pass. Deleting them again is a no-op. */
    async removeGuest(
      ctx: RequestContext,
      eventId: string,
      partyId: string,
      guestId: string,
    ): Promise<void> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:write");
      assertWritable(access);

      const headcountId = await deps.db.$transaction(async (tx) => {
        await repo.lockInvitation(tx, access.invitation.id);
        await repo.lockParty(tx, partyId);
        const party = await repo.findPartyState(tx, access.invitation.id, partyId);
        if (!party || party.deletedAt) throw notFound("Guest not found");
        const guest = await repo.findGuestState(tx, partyId, guestId);
        if (!guest) throw notFound("Guest not found");
        if (guest.deletedAt) return null;

        await repo.softDeleteGuest(tx, guestId, deps.now());
        await syncPassesForParty(
          tx,
          { invitation: access.invitation, event: access.event },
          partyId,
        );
        await writeAudit(tx, {
          actor: ctx.actor,
          action: "guest.delete",
          entity: "Guest",
          entityId: guestId,
          diff: { eventId, partyId },
          ...(ctx.ip ? { ip: ctx.ip } : {}),
        });
        return (await recordHeadcountSnapshot(tx, eventId, "HOST_EDIT")).id;
      });
      await notifyHeadcount(eventId, headcountId);
    },

    /** Records the party's answers on its behalf (phone or paper replies). No health data. */
    async setRsvp(
      ctx: RequestContext,
      eventId: string,
      partyId: string,
      input: HostRsvpEntry,
    ): Promise<HostParty> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "rsvp:submit");
      assertWritable(access);

      const guestIds = input.members.map((member) => member.guestId);
      if (new Set(guestIds).size !== guestIds.length) {
        throw validationProblem("Each guest can appear only once", {
          members: ["Duplicate guestId"],
        });
      }

      const headcountId = await deps.db.$transaction(async (tx) => {
        await repo.lockInvitation(tx, access.invitation.id);
        // The guests' own submission writes the same Rsvp rows and issues the same passes.
        await repo.lockParty(tx, partyId);
        const party = await repo.findParty(tx, access.invitation.id, partyId);
        if (!party) throw notFound("Party not found");
        const partyGuestIds = new Set(party.guests.map((guest) => guest.id));
        if (guestIds.some((guestId) => !partyGuestIds.has(guestId))) {
          throw validationProblem("Every guest must belong to this party", {
            members: ["Unknown guestId for this party"],
          });
        }

        const now = deps.now();
        const changes: Array<{ guestId: string; from: RsvpStatus; to: RsvpStatus }> = [];
        for (const member of input.members) {
          const from = await repo.setHostRsvp(tx, member.guestId, member.status, now);
          if (from !== member.status) {
            changes.push({ guestId: member.guestId, from, to: member.status });
          }
        }
        if (changes.length === 0) return null;

        await syncPassesForParty(
          tx,
          { invitation: access.invitation, event: access.event },
          partyId,
        );
        await writeAudit(tx, {
          actor: ctx.actor,
          action: "rsvp.host_entry",
          entity: "Party",
          entityId: partyId,
          diff: { eventId, changes },
          ...(ctx.ip ? { ip: ctx.ip } : {}),
        });
        return (await recordHeadcountSnapshot(tx, eventId, "HOST_EDIT")).id;
      });
      await notifyHeadcount(eventId, headcountId);
      return presentOne(ctx, access, partyId);
    },

    /**
     * Plans (dry run) or commits a CSV import. With an `Idempotency-Key`, group `n` of the file
     * always maps to the same party, so a repeated commit creates nothing twice.
     *
     * A party made by an earlier import with the same key that the host has since DELETED does
     * not count as imported: the group is created again under the next stable id derived from the
     * key, and a repeat of that second import finds it. Deleted parties are never reported as
     * created.
     */
    async importGuests(
      ctx: RequestContext,
      eventId: string,
      input: GuestImport,
      idempotencyKey?: string,
      /** Runs once the caller is authorised and before a commit (the `bulk` rate limit). */
      beforeCommit?: () => Promise<void>,
    ): Promise<GuestImportResult> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:write");
      const invitation = access.invitation;
      const plan = planGuestImport(input.csv);
      const limit = guestLimitOf(access);

      // Without a key every group gets a fresh random id, once, so a dry run and the commit of
      // one request agree.
      const randomStableIds = plan.parties.map(() => generateStableId());

      /**
       * The stable id of every group and the live parties an earlier attempt already created.
       * Group `n` starts at `key:n`; while that id belongs to a deleted party it moves on to
       * `key:n:g1`, `key:n:g2`, ... so the outcome is the same however often it is repeated.
       */
      const resolveStableIds = async (tx: DbTx) => {
        const existingByStableId = new Map<string, { id: string }>();
        if (!idempotencyKey) return { stableIds: randomStableIds, existingByStableId };

        const stableIds = plan.parties.map((_, index) =>
          generateStableId(`${idempotencyKey}:${index}`),
        );
        let unresolved = stableIds.map((_, index) => index);
        for (let generation = 1; unresolved.length > 0; generation += 1) {
          const rows = await repo.findPartiesByStableIds(
            tx,
            invitation.id,
            unresolved.map((index) => stableIds[index] as string),
          );
          const byStableId = new Map(rows.map((row) => [row.stableId, row]));
          const deleted: number[] = [];
          for (const index of unresolved) {
            const row = byStableId.get(stableIds[index] as string);
            if (!row) continue;
            if (row.deletedAt === null) {
              existingByStableId.set(row.stableId, row);
              continue;
            }
            if (generation > MAX_IMPORT_GENERATIONS) {
              throw new ApiProblem(
                409,
                "CONFLICT",
                "This Idempotency-Key has been used for too many imports that were deleted again",
              );
            }
            stableIds[index] = generateStableId(`${idempotencyKey}:${index}:g${generation}`);
            deleted.push(index);
          }
          unresolved = deleted;
        }
        return { stableIds, existingByStableId };
      };

      const measure = async (tx: DbTx) => {
        const { stableIds, existingByStableId } = await resolveStableIds(tx);
        const current = await repo.countLiveGuests(tx, invitation.id);
        const adding = plan.parties.reduce(
          (sum, party, index) =>
            existingByStableId.has(stableIds[index] as string) ? sum : sum + party.guests.length,
          0,
        );
        const afterImport = current + adding;
        return {
          stableIds,
          existingByStableId,
          current,
          adding,
          planView: {
            limit,
            current,
            afterImport,
            exceeds: !canAddGuestsUnderPlan(
              invitation.plan,
              afterImport,
              access.event.experienceMode,
            ),
          },
        };
      };

      const result = (
        measured: Awaited<ReturnType<typeof measure>>,
        createdPartyIds: string[],
      ): GuestImportResult => ({
        dryRun: input.dryRun,
        parties: plan.parties.map((party) => ({
          displayName: party.displayName,
          maxSeats: party.maxSeats,
          tableLabel: party.tableLabel,
          tags: party.tags,
          guests: party.guests,
        })),
        createdPartyIds,
        summary: {
          partyCount: plan.parties.length,
          guestCount: plan.guestCount,
          skippedRows: plan.skippedRows,
        },
        errors: plan.errors,
        plan: measured.planView,
      });

      if (input.dryRun) return result(await measure(deps.db), []);

      assertWritable(access);
      await beforeCommit?.();
      if (plan.tooManyRows) {
        throw new ApiProblem(
          400,
          "VALIDATION_ERROR",
          `A file can hold at most ${MAX_IMPORT_ROWS} guests`,
          { code: "TOO_MANY_ROWS", max: MAX_IMPORT_ROWS },
        );
      }

      const committed = await deps.db.$transaction(async (tx) => {
        await repo.lockInvitation(tx, invitation.id);
        const measured = await measure(tx);
        if (measured.planView.exceeds) {
          throw new ApiProblem(
            403,
            "PLAN_LIMIT_EXCEEDED",
            "The guest limit of this plan is reached",
            { limit, current: measured.current, requested: measured.adding },
          );
        }

        const { stableIds } = measured;
        const fresh = plan.parties
          .map((party, index) => ({ party, stableId: stableIds[index] as string }))
          .filter(({ stableId }) => !measured.existingByStableId.has(stableId));
        const tokens = await assignTokens(
          tx,
          invitation,
          fresh.map(({ party, stableId }) => ({ displayName: party.displayName, stableId })),
        );
        const created = fresh.map(({ party, stableId }, index): repo.NewParty => {
          const assigned = tokens[index] as { token: string; tokenVersion: number };
          return {
            id: generateId("pty_"),
            stableId,
            displayName: party.displayName,
            token: assigned.token,
            tokenVersion: assigned.tokenVersion,
            maxSeats: party.maxSeats,
            allowPlusOnes: party.allowPlusOnes,
            childrenAllowed: true,
            tags: party.tags,
            tableLabel: party.tableLabel,
            guests: party.guests,
          };
        });
        await repo.insertParties(tx, invitation.id, created);

        // Ids in file order: parties made now, and parties an earlier attempt already made.
        const createdByStableId = new Map(created.map((party) => [party.stableId, party.id]));
        const partyIds = stableIds.flatMap((stableId) => {
          const id =
            createdByStableId.get(stableId) ?? measured.existingByStableId.get(stableId)?.id;
          return id ? [id] : [];
        });

        let headcountId: string | null = null;
        if (created.length > 0) {
          await writeAudit(tx, {
            actor: ctx.actor,
            action: "guest.import",
            entity: "Invitation",
            entityId: invitation.id,
            // Counts only: no names or contact details.
            diff: {
              eventId,
              partiesCreated: created.length,
              guestsCreated: measured.adding,
              skippedRows: plan.skippedRows,
              rowErrors: plan.errors.length,
            },
            ...(ctx.ip ? { ip: ctx.ip } : {}),
          });
          headcountId = (await recordHeadcountSnapshot(tx, eventId, "HOST_EDIT")).id;
        }
        return { measured, partyIds, headcountId };
      }, IMPORT_TX_OPTIONS);

      await notifyHeadcount(eventId, committed.headcountId);
      return result(committed.measured, committed.partyIds);
    },

    /**
     * The guest list as CSV. Health columns need `health:read` on top of `guest:read`, and reading
     * them is always written to the audit trail.
     */
    async exportCsv(
      ctx: RequestContext,
      eventId: string,
      includeHealth: boolean,
    ): Promise<{ filename: string; csv: string }> {
      const access = await requireEventAccess(deps, ctx.actor, eventId, "guest:read");
      // Never satisfied by a roster-scope grant: door crew see flags at the door, not notes.
      if (includeHealth) requireHostPermission(ctx.actor, "health:read", access.scope);
      const showLinks = canSeeGuestLinks(ctx, access);

      const parties = await repo.listExportParties(deps.db, access.invitation.id, includeHealth);
      const rows: ExportGuestRow[] = parties.flatMap((party) =>
        party.guests.map((guest) => ({
          partyName: fromLocalized(party.displayName),
          guestName: fromLocalized(guest.name),
          isChild: guest.isChild,
          isPlusOne: guest.isPlusOne,
          status: guest.status,
          respondedAt: formatLocal(guest.respondedAt, access.event.timeZone),
          table: party.tableLabel ?? "",
          seats: party.maxSeats,
          tags: party.tags,
          email: guest.email ?? "",
          phone: guest.phone ?? "",
          checkedIn: guest.checkedIn,
          // The link is a credential: blank for a caller who may not write to the guest list.
          invitePath: showLinks ? invitePath(access.invitation.eventSlug, party.token) : "",
          ...(guest.health
            ? {
                health: {
                  dietary: guest.health.dietary,
                  allergySeverity: guest.health.allergySeverity ?? "",
                  allergyNotes: guest.health.allergyNotes ?? "",
                  accessibilityNotes: guest.health.accessibilityNotes ?? "",
                },
              }
            : {}),
        })),
      );

      await deps.db.$transaction(async (tx) => {
        const base = {
          actor: ctx.actor,
          entity: "Event",
          entityId: eventId,
          ...(ctx.ip ? { ip: ctx.ip } : {}),
        };
        await writeAudit(tx, {
          ...base,
          action: "guest.export",
          diff: { guests: rows.length, includeHealth },
        });
        if (includeHealth) {
          await writeAudit(tx, {
            ...base,
            action: "health.read",
            diff: { via: "guest.export", guests: rows.length },
          });
        }
      });

      const stamp = utcToZonedWallTime(deps.now(), access.event.timeZone).slice(0, 10);
      return {
        filename: `guests-${access.invitation.eventSlug}-${stamp}.csv`,
        csv: buildGuestExportCsv(rows, includeHealth),
      };
    },
  };
}

export type GuestListService = ReturnType<typeof createGuestListService>;
