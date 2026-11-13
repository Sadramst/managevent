/**
 * Guest list against the real database. Every row is created by this file with fresh unique ids
 * and removed in `afterAll`; nothing else in the shared database is touched.
 */
import type { AuthActor } from "@managevent/auth";
import { db } from "@managevent/db";
import {
  GuestImportResultSchema,
  GuestInvitationViewSchema,
  type HostParty,
  HostPartyListSchema,
  HostPartySchema,
} from "@managevent/validators";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dbAvailable } from "../../test/db.js";
import { EXPORT_COLUMNS, EXPORT_HEALTH_COLUMNS, parseCsv } from "./csv.js";
import { createTestApi, HostWorld, uniqueTestSuffix } from "./test-fixtures.js";

type ErrorBody = { error: { code: string; details?: Record<string, unknown> } };

const errorCode = async (res: Response): Promise<string> =>
  ((await res.json()) as ErrorBody).error.code;

describe.skipIf(!dbAvailable)("guest list (database)", () => {
  const world = new HostWorld();
  const api = createTestApi();

  afterAll(async () => {
    await world.cleanup();
  });

  async function createParty(
    event: { eventId: string; owner: AuthActor },
    body: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<HostParty> {
    const res = await api.call(
      event.owner,
      "POST",
      `/v1/events/${event.eventId}/parties`,
      body,
      headers,
    );
    expect(res.status).toBe(201);
    return HostPartySchema.parse(await res.json());
  }

  describe("parties and guests", () => {
    let event: Awaited<ReturnType<HostWorld["createEvent"]>>;

    beforeAll(async () => {
      event = await world.createEvent({ plan: "PREMIUM" });
    });

    it("creates a party with one guest named after it, a derived token and a headcount snapshot", async () => {
      const jobsBefore = api.queue.jobs.length;
      const party = await createParty(event, { displayName: "Zoë & André Müller" });

      expect(party.token).toMatch(/^zoe-andre-muller-[23456789abcdefghjkmnpqrstuvwxyz]{8}$/);
      expect(party.invitePath).toBe(`/i/${event.eventSlug}/${party.token}`);
      expect(party).toMatchObject({
        maxSeats: 1,
        allowPlusOnes: false,
        childrenAllowed: true,
        status: "PENDING",
        respondedAt: null,
        tokenRevokedAt: null,
        email: { hasAddress: false, inviteSentAt: null, remindersSent: 0 },
      });
      expect(party.guests).toHaveLength(1);
      expect(party.guests[0]).toMatchObject({
        name: "Zoë & André Müller",
        status: "PENDING",
        isPlusOne: false,
      });

      const stored = await db.party.findUniqueOrThrow({ where: { id: party.id } });
      expect(stored.displayName).toEqual({ en: "Zoë & André Müller" });
      expect(stored.stableId).toMatch(/^s_[0-9a-f]{24}$/);

      const job = api.queue.jobs.at(-1);
      expect(api.queue.jobs.length).toBe(jobsBefore + 1);
      expect(job?.name).toBe("headcount.changed");
      const headcount = await db.eventHeadcount.findUniqueOrThrow({
        where: { id: String(job?.payload.headcountId) },
      });
      expect(headcount).toMatchObject({ eventId: event.eventId, trigger: "HOST_EDIT" });
      expect(job?.opts.singletonKey).toBe(`headcount.changed:${headcount.id}`);
    });

    it("stores the listed guests and sizes the party to them", async () => {
      const party = await createParty(event, {
        displayName: "Lovelace Family",
        maxSeats: 1,
        tags: ["family"],
        tableLabel: "Table 3",
        guests: [
          { name: "Ada Lovelace", email: "ada@example.com", phone: "0412 345 678" },
          { name: "Byron Lovelace", isChild: true },
        ],
      });
      expect(party.maxSeats).toBe(2);
      expect(party.tableLabel).toBe("Table 3");
      expect(party.email.hasAddress).toBe(true);
      expect(party.guests.map((guest) => [guest.name, guest.isChild, guest.email])).toEqual([
        ["Ada Lovelace", false, "ada@example.com"],
        ["Byron Lovelace", true, null],
      ]);
    });

    it("replays a create with the same Idempotency-Key instead of duplicating the party", async () => {
      const key = `party-${uniqueTestSuffix()}`;
      const body = { displayName: "Replay Family", guests: [{ name: "Rae Replay" }] };
      const first = await createParty(event, body, { "idempotency-key": key });
      expect((await db.party.findUniqueOrThrow({ where: { id: first.id } })).stableId).toMatch(
        /^k_[0-9a-f]{24}$/,
      );

      const jobsBefore = api.queue.jobs.length;
      const again = await api.call(
        event.owner,
        "POST",
        `/v1/events/${event.eventId}/parties`,
        body,
        {
          "idempotency-key": key,
        },
      );
      expect(again.status).toBe(200);
      const replay = HostPartySchema.parse(await again.json());
      expect(replay.id).toBe(first.id);
      expect(replay.token).toBe(first.token);
      expect(api.queue.jobs.length).toBe(jobsBefore);
      expect(
        await db.party.count({
          where: {
            invitationId: event.invitationId,
            displayName: { equals: { en: "Replay Family" } },
          },
        }),
      ).toBe(1);
    });

    it("keeps the guest link when a party is renamed and rejects seats below the guest count", async () => {
      const party = await createParty(event, {
        displayName: "Before Rename",
        guests: [{ name: "One" }, { name: "Two" }],
      });
      const path = `/v1/events/${event.eventId}/parties/${party.id}`;

      const renamed = await api.call(event.owner, "PATCH", path, {
        displayName: "After Rename",
        tags: ["work"],
        tableLabel: "Table 9",
        allowPlusOnes: true,
        maxSeats: 4,
      });
      expect(renamed.status).toBe(200);
      const updated = HostPartySchema.parse(await renamed.json());
      expect(updated).toMatchObject({
        displayName: "After Rename",
        token: party.token,
        tags: ["work"],
        tableLabel: "Table 9",
        allowPlusOnes: true,
        maxSeats: 4,
      });

      const tooFew = await api.call(event.owner, "PATCH", path, { maxSeats: 1 });
      expect(tooFew.status).toBe(400);
      expect(await errorCode(tooFew)).toBe("VALIDATION_ERROR");

      const cleared = await api.call(event.owner, "PATCH", path, { tableLabel: null });
      expect(HostPartySchema.parse(await cleared.json()).tableLabel).toBeNull();
    });

    it("revokes and reissues a guest link, and audits both without storing a token", async () => {
      const party = await createParty(event, { displayName: "Link Family" });
      const base = `/v1/events/${event.eventId}/parties/${party.id}`;

      const revoked = HostPartySchema.parse(
        await (await api.call(event.owner, "POST", `${base}/revoke-link`)).json(),
      );
      expect(revoked.tokenRevokedAt).not.toBeNull();
      expect(revoked.token).toBe(party.token);

      // Revoking again changes nothing and writes no second audit row.
      const again = HostPartySchema.parse(
        await (await api.call(event.owner, "POST", `${base}/revoke-link`)).json(),
      );
      expect(again.tokenRevokedAt).toBe(revoked.tokenRevokedAt);

      const reissued = HostPartySchema.parse(
        await (await api.call(event.owner, "POST", `${base}/reissue-link`)).json(),
      );
      expect(reissued.token).not.toBe(party.token);
      expect(reissued.token).toMatch(/^link-family-[23456789abcdefghjkmnpqrstuvwxyz]{8}$/);
      expect(reissued.tokenRevokedAt).toBeNull();

      const stored = await db.party.findUniqueOrThrow({ where: { id: party.id } });
      expect(stored.tokenVersion).toBe(1);
      expect(stored.revokedTokens).toEqual([party.token]);

      const audit = await db.auditLog.findMany({
        where: { entity: "Party", entityId: party.id },
        orderBy: { at: "asc" },
      });
      expect(audit.map((row) => row.action)).toEqual(["party.link_revoke", "party.link_reissue"]);
      expect(audit.every((row) => row.actorUserId === event.userId)).toBe(true);
      expect(JSON.stringify(audit)).not.toContain(party.token);
      expect(JSON.stringify(audit)).not.toContain(reissued.token);
    });

    it("adds, updates and removes guests, raising the seats when the party grows", async () => {
      const party = await createParty(event, { displayName: "Growing Family" });
      const base = `/v1/events/${event.eventId}/parties/${party.id}`;

      const addRes = await api.call(event.owner, "POST", `${base}/guests`, {
        name: "Second Guest",
        email: "second@example.com",
        isChild: true,
      });
      expect(addRes.status).toBe(201);
      const grown = HostPartySchema.parse(await addRes.json());
      expect(grown.maxSeats).toBe(2);
      expect(grown.guests).toHaveLength(2);
      const added = grown.guests[1];
      expect(added).toMatchObject({ name: "Second Guest", isChild: true });

      const jobsBefore = api.queue.jobs.length;
      const patchRes = await api.call(event.owner, "PATCH", `${base}/guests/${added?.id}`, {
        name: "Second Guest Renamed",
        email: null,
        phone: "+61412345678",
      });
      expect(patchRes.status).toBe(200);
      const patched = HostPartySchema.parse(await patchRes.json());
      expect(patched.guests[1]).toMatchObject({
        name: "Second Guest Renamed",
        email: null,
        phone: "+61412345678",
      });
      // A name or contact change does not move the numbers.
      expect(api.queue.jobs.length).toBe(jobsBefore);

      const adult = await api.call(event.owner, "PATCH", `${base}/guests/${added?.id}`, {
        isChild: false,
      });
      expect(adult.status).toBe(200);
      expect(api.queue.jobs.length).toBe(jobsBefore + 1);

      const removeRes = await api.call(event.owner, "DELETE", `${base}/guests/${added?.id}`);
      expect(removeRes.status).toBe(204);
      expect(
        (await db.guest.findUniqueOrThrow({ where: { id: String(added?.id) } })).deletedAt,
      ).not.toBeNull();
      const auditCount = () =>
        db.auditLog.count({ where: { action: "guest.delete", entityId: String(added?.id) } });
      expect(await auditCount()).toBe(1);

      // Repeating the delete is a no-op; an unknown guest is a 404.
      expect((await api.call(event.owner, "DELETE", `${base}/guests/${added?.id}`)).status).toBe(
        204,
      );
      expect(await auditCount()).toBe(1);
      const unknown = await api.call(
        event.owner,
        "DELETE",
        `${base}/guests/gst_00000000-0000-7000-8000-000000000000`,
      );
      expect(unknown.status).toBe(404);

      const after = await api.call(
        event.owner,
        "GET",
        `/v1/events/${event.eventId}/parties?q=growing`,
      );
      const list = HostPartyListSchema.parse(await after.json());
      expect(list.items).toHaveLength(1);
      expect(list.items[0]?.guests).toHaveLength(1);
    });

    it("records host-entered RSVPs, issues and revokes passes, and snapshots the headcount", async () => {
      const party = await createParty(event, {
        displayName: "Phone Reply Family",
        guests: [{ name: "Adult One" }, { name: "Adult Two" }, { name: "Child", isChild: true }],
      });
      const [one, two, child] = party.guests.map((guest) => guest.id) as [string, string, string];
      const path = `/v1/events/${event.eventId}/parties/${party.id}/rsvp`;

      const res = await api.call(event.owner, "PUT", path, {
        members: [
          { guestId: one, status: "YES" },
          { guestId: two, status: "NO" },
          { guestId: child, status: "YES" },
        ],
      });
      expect(res.status).toBe(200);
      const answered = HostPartySchema.parse(await res.json());
      expect(answered.status).toBe("YES");
      expect(answered.respondedAt).not.toBeNull();
      expect(answered.guests.map((guest) => guest.status)).toEqual(["YES", "NO", "YES"]);

      const rsvps = await db.rsvp.findMany({ where: { guestId: { in: [one, two, child] } } });
      expect(rsvps).toHaveLength(3);
      expect(rsvps.every((rsvp) => rsvp.source === "HOST_ENTRY")).toBe(true);
      // No health data can arrive through host entry.
      expect(
        rsvps.every((rsvp) => rsvp.dietaryEncrypted === null && rsvp.allergyNotes === null),
      ).toBe(true);

      // PREMIUM: every attending guest has exactly one live pass.
      const livePasses = () =>
        db.pass.findMany({
          where: { partyId: party.id, revokedAt: null },
          select: { guestId: true },
        });
      expect((await livePasses()).map((pass) => pass.guestId).sort()).toEqual([one, child].sort());

      const job = api.queue.jobs.at(-1);
      const headcount = await db.eventHeadcount.findUniqueOrThrow({
        where: { id: String(job?.payload.headcountId) },
      });
      expect(headcount.trigger).toBe("HOST_EDIT");
      // Other parties in this event are pending or unanswered, so the YES and NO counts are ours.
      expect(headcount).toMatchObject({ adultsYes: 1, childrenYes: 1, no: 1, maybe: 0 });

      const audit = await db.auditLog.findFirstOrThrow({
        where: { action: "rsvp.host_entry", entityId: party.id },
      });
      expect(audit.diffJson).toMatchObject({
        changes: expect.arrayContaining([{ guestId: one, from: "PENDING", to: "YES" }]),
      });

      // Changing a YES to PENDING revokes that guest's pass; a repeat with no change is a no-op.
      const jobsBefore = api.queue.jobs.length;
      const reset = await api.call(event.owner, "PUT", path, {
        members: [{ guestId: one, status: "PENDING" }],
      });
      const afterReset = HostPartySchema.parse(await reset.json());
      expect(afterReset.guests[0]).toMatchObject({ status: "PENDING", respondedAt: null });
      expect((await livePasses()).map((pass) => pass.guestId)).toEqual([child]);
      expect(api.queue.jobs.length).toBe(jobsBefore + 1);

      await api.call(event.owner, "PUT", path, { members: [{ guestId: one, status: "PENDING" }] });
      expect(api.queue.jobs.length).toBe(jobsBefore + 1);

      // A guest from another party is rejected, and so is a duplicate.
      const other = await createParty(event, { displayName: "Someone Else" });
      const foreign = await api.call(event.owner, "PUT", path, {
        members: [{ guestId: other.guests[0]?.id, status: "YES" }],
      });
      expect(foreign.status).toBe(400);
      const duplicate = await api.call(event.owner, "PUT", path, {
        members: [
          { guestId: two, status: "YES" },
          { guestId: two, status: "NO" },
        ],
      });
      expect(duplicate.status).toBe(400);
    });

    it("soft-deletes a party with its guests, revokes its passes and audits the delete", async () => {
      const party = await createParty(event, {
        displayName: "Leaving Family",
        guests: [{ name: "Leaver One" }, { name: "Leaver Two" }],
      });
      const path = `/v1/events/${event.eventId}/parties/${party.id}`;
      await api.call(event.owner, "PUT", `${path}/rsvp`, {
        members: party.guests.map((guest) => ({ guestId: guest.id, status: "YES" })),
      });
      expect(await db.pass.count({ where: { partyId: party.id, revokedAt: null } })).toBe(2);

      const res = await api.call(event.owner, "DELETE", path);
      expect(res.status).toBe(204);

      const stored = await db.party.findUniqueOrThrow({
        where: { id: party.id },
        include: { guests: true },
      });
      expect(stored.deletedAt).not.toBeNull();
      expect(stored.guests.every((guest) => guest.deletedAt !== null)).toBe(true);
      expect(await db.pass.count({ where: { partyId: party.id, revokedAt: null } })).toBe(0);

      const audit = await db.auditLog.findMany({
        where: { action: "party.delete", entityId: party.id },
      });
      expect(audit).toHaveLength(1);
      expect(audit[0]?.diffJson).toMatchObject({ guestCount: 2 });

      // The deleted guests no longer count.
      const headcount = await db.eventHeadcount.findUniqueOrThrow({
        where: { id: String(api.queue.jobs.at(-1)?.payload.headcountId) },
      });
      const live = await db.guest.count({
        where: { deletedAt: null, party: { invitationId: event.invitationId, deletedAt: null } },
      });
      expect(
        headcount.adultsYes +
          headcount.childrenYes +
          headcount.maybe +
          headcount.no +
          headcount.pending,
      ).toBe(live);

      // Gone from the API; deleting again is a no-op; an unknown id is a 404.
      expect((await api.call(event.owner, "PATCH", path, { displayName: "Back" })).status).toBe(
        404,
      );
      expect((await api.call(event.owner, "DELETE", path)).status).toBe(204);
      expect(
        await db.auditLog.count({ where: { action: "party.delete", entityId: party.id } }),
      ).toBe(1);
      const unknown = await api.call(
        event.owner,
        "DELETE",
        `/v1/events/${event.eventId}/parties/pty_00000000-0000-7000-8000-000000000000`,
      );
      expect(unknown.status).toBe(404);
    });

    it("lists with status, tag, search and cursor paging, and reports event totals", async () => {
      const listEvent = await world.createEvent();
      const names = ["Alpha", "Bravo", "Charlie", "Delta"];
      const parties: HostParty[] = [];
      for (const name of names) {
        parties.push(
          await createParty(listEvent, {
            displayName: `${name} Family`,
            tags: name === "Bravo" ? ["vip"] : [],
            guests: [{ name: `${name} Guest`, email: `${name.toLowerCase()}@example.com` }],
          }),
        );
      }
      const [alpha, bravo, charlie, delta] = parties as [
        HostParty,
        HostParty,
        HostParty,
        HostParty,
      ];
      await api.call(
        listEvent.owner,
        "PUT",
        `/v1/events/${listEvent.eventId}/parties/${alpha.id}/rsvp`,
        {
          members: [{ guestId: alpha.guests[0]?.id, status: "YES" }],
        },
      );
      await api.call(
        listEvent.owner,
        "PUT",
        `/v1/events/${listEvent.eventId}/parties/${delta.id}/rsvp`,
        {
          members: [{ guestId: delta.guests[0]?.id, status: "NO" }],
        },
      );

      const list = async (query: string) =>
        HostPartyListSchema.parse(
          await (
            await api.call(
              listEvent.owner,
              "GET",
              `/v1/events/${listEvent.eventId}/parties${query}`,
            )
          ).json(),
        );

      const all = await list("");
      expect(all.items.map((party) => party.id)).toEqual(parties.map((party) => party.id));
      expect(all.totals).toEqual({ parties: 4, guests: 4 });
      expect(all.nextCursor).toBeNull();

      expect((await list("?status=PENDING")).items.map((party) => party.id)).toEqual([
        bravo.id,
        charlie.id,
      ]);
      expect((await list("?status=YES")).items.map((party) => party.id)).toEqual([alpha.id]);
      expect((await list("?status=NO")).items.map((party) => party.id)).toEqual([delta.id]);
      expect((await list("?tag=vip")).items.map((party) => party.id)).toEqual([bravo.id]);
      expect((await list("?q=CHARLIE%40example")).items.map((party) => party.id)).toEqual([
        charlie.id,
      ]);

      const firstPage = await list("?limit=3");
      expect(firstPage.items).toHaveLength(3);
      expect(firstPage.nextCursor).toBe(charlie.id);
      const secondPage = await list(`?limit=3&cursor=${firstPage.nextCursor}`);
      expect(secondPage.items.map((party) => party.id)).toEqual([delta.id]);
      expect(secondPage.nextCursor).toBeNull();
      // Totals describe the event, not the page or the filter.
      expect(secondPage.totals).toEqual({ parties: 4, guests: 4 });

      const invalid = await api.call(
        listEvent.owner,
        "GET",
        `/v1/events/${listEvent.eventId}/parties?limit=0`,
      );
      expect(invalid.status).toBe(400);
    });
  });

  describe("authorisation", () => {
    let eventA: Awaited<ReturnType<HostWorld["createEvent"]>>;
    let eventB: Awaited<ReturnType<HostWorld["createEvent"]>>;
    let partyA: HostParty;

    beforeAll(async () => {
      eventA = await world.createEvent();
      eventB = await world.createEvent();
      partyA = await createParty(eventA, {
        displayName: "Private Family",
        guests: [{ name: "Private Guest", email: "private@example.com" }],
      });
    });

    it("answers 401 without a session", async () => {
      const paths: Array<[string, string, unknown?]> = [
        ["GET", `/v1/events/${eventA.eventId}/parties`],
        ["POST", `/v1/events/${eventA.eventId}/parties`, { displayName: "X" }],
        ["DELETE", `/v1/events/${eventA.eventId}/parties/${partyA.id}`],
        ["GET", `/v1/events/${eventA.eventId}/guests/export.csv`],
        ["POST", `/v1/events/${eventA.eventId}/guests/import`, { csv: "name\nX" }],
      ];
      for (const [method, path, body] of paths) {
        const res = await api.call(null, method, path, body);
        expect(res.status, `${method} ${path}`).toBe(401);
      }
    });

    it("gives host B a 404 on every route of host A's event, and never host A's data", async () => {
      const guestId = partyA.guests[0]?.id;
      const base = `/v1/events/${eventA.eventId}`;
      const attempts: Array<[string, string, unknown?]> = [
        ["GET", `${base}/parties`],
        ["POST", `${base}/parties`, { displayName: "Intruder" }],
        ["PATCH", `${base}/parties/${partyA.id}`, { displayName: "Renamed by B" }],
        ["DELETE", `${base}/parties/${partyA.id}`],
        ["POST", `${base}/parties/${partyA.id}/revoke-link`],
        ["POST", `${base}/parties/${partyA.id}/reissue-link`],
        ["POST", `${base}/parties/${partyA.id}/guests`, { name: "Intruder" }],
        ["PATCH", `${base}/parties/${partyA.id}/guests/${guestId}`, { name: "Renamed by B" }],
        ["DELETE", `${base}/parties/${partyA.id}/guests/${guestId}`],
        ["PUT", `${base}/parties/${partyA.id}/rsvp`, { members: [{ guestId, status: "NO" }] }],
        ["POST", `${base}/guests/import`, { csv: "name\nIntruder", dryRun: false }],
        ["GET", `${base}/guests/export.csv`],
        ["GET", `${base}/guests/export.csv?includeHealth=true`],
      ];
      for (const [method, path, body] of attempts) {
        const res = await api.call(eventB.owner, method, path, body);
        expect(res.status, `${method} ${path}`).toBe(404);
        const text = await res.text();
        expect(text).not.toContain("Private");
        expect(text).not.toContain(partyA.token);
      }

      // Host A's party through host B's own event id is a 404 too (no cross-event party access).
      const crossed = await api.call(
        eventB.owner,
        "PATCH",
        `/v1/events/${eventB.eventId}/parties/${partyA.id}`,
        { displayName: "Renamed by B" },
      );
      expect(crossed.status).toBe(404);
      const crossedGuest = await api.call(
        eventB.owner,
        "PUT",
        `/v1/events/${eventB.eventId}/parties/${partyA.id}/rsvp`,
        { members: [{ guestId, status: "NO" }] },
      );
      expect(crossedGuest.status).toBe(404);

      // Nothing changed for host A.
      const stored = await db.party.findUniqueOrThrow({
        where: { id: partyA.id },
        include: { guests: { include: { rsvp: true } } },
      });
      expect(stored.displayName).toEqual({ en: "Private Family" });
      expect(stored.deletedAt).toBeNull();
      expect(stored.tokenRevokedAt).toBeNull();
      expect(stored.token).toBe(partyA.token);
      expect(stored.guests).toHaveLength(1);
      expect(stored.guests[0]?.rsvp).toBeNull();
      expect(await db.party.count({ where: { invitationId: eventA.invitationId } })).toBe(1);
    });

    it("lets a VIEWER co-host read but not write, and an EDITOR write", async () => {
      const viewer = await world.addCoHost(eventA, "VIEWER");
      const editor = await world.addCoHost(eventA, "EDITOR");
      const base = `/v1/events/${eventA.eventId}`;

      const read = await api.call(viewer, "GET", `${base}/parties`);
      expect(read.status).toBe(200);
      expect(HostPartyListSchema.parse(await read.json()).items).toHaveLength(1);

      const writes: Array<[string, string, unknown?]> = [
        ["POST", `${base}/parties`, { displayName: "Viewer Party" }],
        ["PATCH", `${base}/parties/${partyA.id}`, { displayName: "Viewer Rename" }],
        ["DELETE", `${base}/parties/${partyA.id}`],
        ["POST", `${base}/parties/${partyA.id}/revoke-link`],
        [
          "PUT",
          `${base}/parties/${partyA.id}/rsvp`,
          {
            members: [{ guestId: partyA.guests[0]?.id, status: "YES" }],
          },
        ],
        ["POST", `${base}/guests/import`, { csv: "name\nViewer", dryRun: true }],
      ];
      for (const [method, path, body] of writes) {
        const res = await api.call(viewer, method, path, body);
        expect(res.status, `${method} ${path}`).toBe(403);
        expect(await errorCode(res)).toBe("FORBIDDEN");
      }

      const edit = await api.call(editor, "PATCH", `${base}/parties/${partyA.id}`, {
        tableLabel: "Table 1",
      });
      expect(edit.status).toBe(200);
    });

    it("lets planner staff manage any event's guest list", async () => {
      const staff = await world.createUser(["PLANNER_STAFF"]);
      const res = await api.call(staff, "GET", `/v1/events/${eventA.eventId}/parties`);
      expect(res.status).toBe(200);
    });

    it("refuses changes to a sample (demo) invitation", async () => {
      const demo = await world.createEvent({ isDemo: true, plan: "PREMIUM" });
      const seeded = await world.seedParty(demo, {
        displayName: "Sample Guest Family",
        guests: [{ name: "Sample Guest" }],
      });
      const base = `/v1/events/${demo.eventId}`;
      const writes: Array<[string, string, unknown?]> = [
        ["POST", `${base}/parties`, { displayName: "New" }],
        ["PATCH", `${base}/parties/${seeded.partyId}`, { displayName: "New" }],
        ["DELETE", `${base}/parties/${seeded.partyId}`],
        ["POST", `${base}/parties/${seeded.partyId}/reissue-link`],
        [
          "PUT",
          `${base}/parties/${seeded.partyId}/rsvp`,
          {
            members: [{ guestId: seeded.guestIds[0], status: "YES" }],
          },
        ],
        ["POST", `${base}/guests/import`, { csv: "name\nNew", dryRun: false }],
      ];
      for (const [method, path, body] of writes) {
        const res = await api.call(demo.owner, method, path, body);
        expect(res.status, `${method} ${path}`).toBe(403);
        expect(await errorCode(res)).toBe("DEMO_READ_ONLY");
      }
      expect((await api.call(demo.owner, "GET", `${base}/parties`)).status).toBe(200);
    });
  });

  describe("plan guest cap", () => {
    it("stops a FREE event at 30 guests for party creates and guest adds", async () => {
      const event = await world.createEvent({ plan: "FREE" });
      const base = `/v1/events/${event.eventId}`;
      const twenty = Array.from({ length: 20 }, (_, index) => ({ name: `Guest ${index + 1}` }));
      await createParty(event, { displayName: "Twenty", guests: twenty });
      const nine = await createParty(event, { displayName: "Nine", guests: twenty.slice(0, 9) });

      // 29 guests: two more do not fit, one does.
      const tooMany = await api.call(event.owner, "POST", `${base}/parties`, {
        displayName: "Two More",
        guests: [{ name: "A" }, { name: "B" }],
      });
      expect(tooMany.status).toBe(403);
      const body = (await tooMany.json()) as ErrorBody;
      expect(body.error.code).toBe("PLAN_LIMIT_EXCEEDED");
      expect(body.error.details).toEqual({ limit: 30, current: 29, requested: 2 });
      expect(await db.party.count({ where: { invitationId: event.invitationId } })).toBe(2);

      const thirtieth = await api.call(event.owner, "POST", `${base}/parties/${nine.id}/guests`, {
        name: "Guest 30",
      });
      expect(thirtieth.status).toBe(201);

      const thirtyFirst = await api.call(event.owner, "POST", `${base}/parties/${nine.id}/guests`, {
        name: "Guest 31",
      });
      expect(thirtyFirst.status).toBe(403);
      expect(await errorCode(thirtyFirst)).toBe("PLAN_LIMIT_EXCEEDED");

      // Removing a guest frees a place.
      const removed = await api.call(
        event.owner,
        "DELETE",
        `${base}/parties/${nine.id}/guests/${nine.guests[0]?.id}`,
      );
      expect(removed.status).toBe(204);
      const again = await api.call(event.owner, "POST", `${base}/parties/${nine.id}/guests`, {
        name: "Guest 31",
      });
      expect(again.status).toBe(201);
    });

    it("does not cap a PREMIUM event or a memorial (complimentary) event", async () => {
      const guests = Array.from({ length: 20 }, (_, index) => ({ name: `Guest ${index + 1}` }));
      for (const overrides of [
        { plan: "PREMIUM" as const },
        { plan: "FREE" as const, experienceMode: "MEMORIAL" as const },
      ]) {
        const event = await world.createEvent(overrides);
        await createParty(event, { displayName: "First Twenty", guests });
        const second = await createParty(event, { displayName: "Second Twenty", guests });
        expect(second.guests).toHaveLength(20);
      }
    });

    it("limits a party to 20 guests", async () => {
      const event = await world.createEvent({ plan: "PREMIUM" });
      const guests = Array.from({ length: 20 }, (_, index) => ({ name: `Guest ${index + 1}` }));
      const full = await createParty(event, { displayName: "Full", guests });
      const res = await api.call(
        event.owner,
        "POST",
        `/v1/events/${event.eventId}/parties/${full.id}/guests`,
        { name: "Twenty-first" },
      );
      expect(res.status).toBe(400);
      expect(await errorCode(res)).toBe("VALIDATION_ERROR");
    });
  });

  describe("CSV import", () => {
    const csv = [
      "Guest Name,Party Name,Is Child,Table,Tags,Email,Phone",
      "Ada Lovelace,Lovelace Family,no,Table 3,family,ada@example.com,0412 345 678",
      "Byron Lovelace,Lovelace Family,yes,,,,",
      "Charles Babbage,,,,work,not-an-email,",
      ",Nameless Row,,,,,",
    ].join("\r\n");

    it("previews without writing, then commits once however often the request is repeated", async () => {
      const event = await world.createEvent({ plan: "FREE" });
      const path = `/v1/events/${event.eventId}/guests/import`;

      const dryRes = await api.call(event.owner, "POST", path, { csv });
      expect(dryRes.status).toBe(200);
      const dry = GuestImportResultSchema.parse(await dryRes.json());
      expect(dry.dryRun).toBe(true);
      expect(dry.createdPartyIds).toEqual([]);
      expect(dry.summary).toEqual({ partyCount: 2, guestCount: 3, skippedRows: 1 });
      expect(dry.errors.map((error) => [error.row, error.code])).toEqual([
        [4, "INVALID_EMAIL"],
        [5, "MISSING_NAME"],
      ]);
      expect(dry.plan).toEqual({ limit: 30, current: 0, afterImport: 3, exceeds: false });
      expect(dry.parties.map((party) => [party.displayName, party.guests.length])).toEqual([
        ["Lovelace Family", 2],
        ["Charles Babbage", 1],
      ]);
      expect(await db.party.count({ where: { invitationId: event.invitationId } })).toBe(0);

      const key = `import-${uniqueTestSuffix()}`;
      const jobsBefore = api.queue.jobs.length;
      const commitRes = await api.call(
        event.owner,
        "POST",
        path,
        { csv, dryRun: false },
        {
          "idempotency-key": key,
        },
      );
      expect(commitRes.status).toBe(200);
      const commit = GuestImportResultSchema.parse(await commitRes.json());
      expect(commit.dryRun).toBe(false);
      expect(commit.createdPartyIds).toHaveLength(2);
      expect(commit.plan).toEqual({ limit: 30, current: 0, afterImport: 3, exceeds: false });
      expect(api.queue.jobs.length).toBe(jobsBefore + 1);

      const stored = await db.party.findMany({
        where: { invitationId: event.invitationId },
        orderBy: { id: "asc" },
        include: { guests: { orderBy: { createdAt: "asc" } } },
      });
      expect(stored.map((party) => party.id)).toEqual(commit.createdPartyIds);
      expect(stored[0]).toMatchObject({
        displayName: { en: "Lovelace Family" },
        maxSeats: 2,
        tableLabel: "Table 3",
        tags: ["family"],
      });
      expect(stored[0]?.token).toMatch(/^lovelace-family-[23456789abcdefghjkmnpqrstuvwxyz]{8}$/);
      expect(stored[0]?.guests.map((guest) => [guest.name, guest.isChild, guest.email])).toEqual([
        [{ en: "Ada Lovelace" }, false, "ada@example.com"],
        [{ en: "Byron Lovelace" }, true, null],
      ]);
      expect(stored[1]?.guests[0]?.email).toBeNull();

      // The audit row carries counts only.
      const audit = await db.auditLog.findFirstOrThrow({
        where: { action: "guest.import", entityId: event.invitationId },
      });
      expect(audit.diffJson).toMatchObject({ partiesCreated: 2, guestsCreated: 3, skippedRows: 1 });
      expect(JSON.stringify(audit.diffJson)).not.toContain("Lovelace");

      // Same key again: nothing new, same ids, no second snapshot.
      const replayRes = await api.call(
        event.owner,
        "POST",
        path,
        { csv, dryRun: false },
        {
          "idempotency-key": key,
        },
      );
      const replay = GuestImportResultSchema.parse(await replayRes.json());
      expect(replay.createdPartyIds).toEqual(commit.createdPartyIds);
      expect(replay.plan).toEqual({ limit: 30, current: 3, afterImport: 3, exceeds: false });
      expect(await db.party.count({ where: { invitationId: event.invitationId } })).toBe(2);
      expect(api.queue.jobs.length).toBe(jobsBefore + 1);
    });

    it("imports again after the imported parties were deleted, and never reports deleted ids", async () => {
      const event = await world.createEvent({ plan: "FREE" });
      const path = `/v1/events/${event.eventId}/guests/import`;
      const key = `import-${uniqueTestSuffix()}`;
      const commit = async () => {
        const res = await api.call(
          event.owner,
          "POST",
          path,
          { csv, dryRun: false },
          { "idempotency-key": key },
        );
        expect(res.status).toBe(200);
        return GuestImportResultSchema.parse(await res.json());
      };
      const liveParties = () =>
        db.party.findMany({
          where: { invitationId: event.invitationId, deletedAt: null },
          orderBy: { id: "asc" },
          select: { id: true },
        });

      const first = await commit();
      expect(first.createdPartyIds).toHaveLength(2);

      // The host deletes what was imported (wrong list), then imports the same file again from a
      // client that reuses the key.
      for (const partyId of first.createdPartyIds) {
        const removed = await api.call(
          event.owner,
          "DELETE",
          `/v1/events/${event.eventId}/parties/${partyId}`,
        );
        expect(removed.status).toBe(204);
      }
      expect(await liveParties()).toEqual([]);

      // The preview already says the guests will be created.
      const dry = GuestImportResultSchema.parse(
        await (
          await api.call(event.owner, "POST", path, { csv }, { "idempotency-key": key })
        ).json(),
      );
      expect(dry.plan).toEqual({ limit: 30, current: 0, afterImport: 3, exceeds: false });

      const jobsBefore = api.queue.jobs.length;
      const second = await commit();
      expect(second.createdPartyIds).toHaveLength(2);
      for (const id of second.createdPartyIds) expect(first.createdPartyIds).not.toContain(id);
      expect((await liveParties()).map((party) => party.id)).toEqual(second.createdPartyIds);
      expect(second.plan).toEqual({ limit: 30, current: 0, afterImport: 3, exceeds: false });
      expect(api.queue.jobs.length).toBe(jobsBefore + 1);

      const list = HostPartyListSchema.parse(
        await (await api.call(event.owner, "GET", `/v1/events/${event.eventId}/parties`)).json(),
      );
      expect(list.totals).toEqual({ parties: 2, guests: 3 });
      // The ids that were returned are usable.
      const patched = await api.call(
        event.owner,
        "PATCH",
        `/v1/events/${event.eventId}/parties/${second.createdPartyIds[0]}`,
        { tableLabel: "Table 1" },
      );
      expect(patched.status).toBe(200);

      // Still idempotent: a repeat of the second import creates nothing and returns the same ids.
      const third = await commit();
      expect(third.createdPartyIds).toEqual(second.createdPartyIds);
      expect(await liveParties()).toHaveLength(2);
      expect(api.queue.jobs.length).toBe(jobsBefore + 1);
    });

    it("reports a plan overrun on a dry run and refuses the commit", async () => {
      const event = await world.createEvent({ plan: "FREE" });
      const path = `/v1/events/${event.eventId}/guests/import`;
      const rows = Array.from({ length: 31 }, (_, index) => `Guest ${index + 1}`);
      const big = ["name", ...rows].join("\n");

      const dry = GuestImportResultSchema.parse(
        await (await api.call(event.owner, "POST", path, { csv: big, dryRun: true })).json(),
      );
      expect(dry.plan).toEqual({ limit: 30, current: 0, afterImport: 31, exceeds: true });

      const commit = await api.call(event.owner, "POST", path, { csv: big, dryRun: false });
      expect(commit.status).toBe(403);
      expect(await errorCode(commit)).toBe("PLAN_LIMIT_EXCEEDED");
      expect(await db.party.count({ where: { invitationId: event.invitationId } })).toBe(0);
    });

    it("refuses to commit a file over the row limit and validates the body", async () => {
      const event = await world.createEvent({ plan: "PREMIUM" });
      const path = `/v1/events/${event.eventId}/guests/import`;
      const rows = Array.from({ length: 2001 }, (_, index) => `Guest ${index + 1}`);
      const huge = ["name", ...rows].join("\n");

      const dry = GuestImportResultSchema.parse(
        await (await api.call(event.owner, "POST", path, { csv: huge })).json(),
      );
      expect(dry.errors).toEqual([expect.objectContaining({ row: 2002, code: "TOO_MANY_ROWS" })]);
      expect(dry.plan.limit).toBeNull();

      const commit = await api.call(event.owner, "POST", path, { csv: huge, dryRun: false });
      expect(commit.status).toBe(400);
      expect(await db.party.count({ where: { invitationId: event.invitationId } })).toBe(0);

      expect((await api.call(event.owner, "POST", path, { csv: "" })).status).toBe(400);
      expect((await api.call(event.owner, "POST", path, {})).status).toBe(400);
    });

    it("gives two parties with the same name different links", async () => {
      const event = await world.createEvent({ plan: "PREMIUM" });
      const res = await api.call(event.owner, "POST", `/v1/events/${event.eventId}/guests/import`, {
        csv: "name\nJohn Smith\nJohn Smith",
        dryRun: false,
      });
      expect(res.status).toBe(200);
      const tokens = (
        await db.party.findMany({
          where: { invitationId: event.invitationId },
          select: { token: true },
        })
      ).map((party) => party.token);
      expect(tokens).toHaveLength(2);
      expect(new Set(tokens).size).toBe(2);
    });

    it("counts only authorised commits against the hourly bulk limit", async () => {
      const limited = createTestApi({ rateLimits: true });
      const event = await world.createEvent({ plan: "PREMIUM" });
      const stranger = await world.createUser();
      const path = `/v1/events/${event.eventId}/guests/import`;

      // Requests that are rejected (someone else's event) and dry runs use none of the allowance.
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const res = await limited.call(stranger, "POST", path, { csv: "name\nX", dryRun: false });
        expect(res.status).toBe(404);
        await limited.call(event.owner, "POST", path, { csv: "name\nX", dryRun: true });
      }
      for (let commit = 0; commit < 10; commit += 1) {
        const res = await limited.call(event.owner, "POST", path, {
          csv: `name\nGuest ${commit}`,
          dryRun: false,
        });
        expect(res.status).toBe(200);
      }
      const eleventh = await limited.call(event.owner, "POST", path, {
        csv: "name\nOne Too Many",
        dryRun: false,
      });
      expect(eleventh.status).toBe(429);
      expect(await errorCode(eleventh)).toBe("RATE_LIMITED");
      expect(Number(eleventh.headers.get("retry-after"))).toBeGreaterThan(0);
      expect(await db.party.count({ where: { invitationId: event.invitationId } })).toBe(10);
    });
  });

  describe("host edits and a guest's own RSVP at the same moment", () => {
    let event: Awaited<ReturnType<HostWorld["createEvent"]>>;
    const RUNS = 12;

    beforeAll(async () => {
      event = await world.createEvent({ plan: "PREMIUM" });
    });

    const guestRsvp = (party: HostParty, body: Record<string, unknown>) =>
      api.call(null, "POST", `/v1/i/${event.eventSlug}/${party.token}/rsvp`, body, {
        "idempotency-key": `race-${uniqueTestSuffix()}`,
      });

    it("never lets a party exceed its seats when the host adds a guest as a plus-one arrives", async () => {
      const parties = await Promise.all(
        Array.from({ length: RUNS }, (_, i) =>
          createParty(event, {
            displayName: `Seat Race ${i}`,
            maxSeats: 3,
            allowPlusOnes: true,
            guests: [{ name: "First" }, { name: "Second" }],
          }),
        ),
      );

      const outcomes = await Promise.all(
        parties.map(async (party) => {
          const [guest, host] = await Promise.all([
            guestRsvp(party, {
              members: [{ guestId: party.guests[0]?.id, status: "YES" }],
              plusOnes: [{ name: "Plus One" }],
            }),
            api.call(
              event.owner,
              "POST",
              `/v1/events/${event.eventId}/parties/${party.id}/guests`,
              { name: "Host Added" },
            ),
          ]);
          return { guest: guest.status, host: host.status };
        }),
      );

      for (const [index, party] of parties.entries()) {
        const stored = await db.party.findUniqueOrThrow({
          where: { id: party.id },
          include: { guests: { where: { deletedAt: null } } },
        });
        // Whichever ran first, the seat limit holds: either the plus-one was refused (the host's
        // guest took the last seat) or the host's add raised the seats for its own guest.
        expect(stored.guests.length, JSON.stringify(outcomes[index])).toBeLessThanOrEqual(
          stored.maxSeats,
        );
        expect(outcomes[index]?.host).toBe(201);
        expect([200, 400]).toContain(outcomes[index]?.guest);
      }
    });

    it("never answers 500 when the host records a reply for a guest who is replying", async () => {
      const parties = await Promise.all(
        Array.from({ length: RUNS }, (_, i) =>
          createParty(event, { displayName: `Reply Race ${i}`, guests: [{ name: "Only" }] }),
        ),
      );

      const statuses = await Promise.all(
        parties.map(async (party) => {
          const guestId = party.guests[0]?.id;
          const [guest, host] = await Promise.all([
            guestRsvp(party, { members: [{ guestId, status: "YES" }] }),
            api.call(event.owner, "PUT", `/v1/events/${event.eventId}/parties/${party.id}/rsvp`, {
              members: [{ guestId, status: "NO" }],
            }),
          ]);
          return [guest.status, host.status];
        }),
      );
      expect(statuses).toEqual(Array.from({ length: RUNS }, () => [200, 200]));

      for (const party of parties) {
        // One Rsvp row per guest, and at most one live pass.
        const guestId = party.guests[0]?.id ?? "";
        expect(await db.rsvp.count({ where: { guestId } })).toBe(1);
        expect(await db.pass.count({ where: { guestId, revokedAt: null } })).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("CSV export", () => {
    let event: Awaited<ReturnType<HostWorld["createEvent"]>>;
    const path = () => `/v1/events/${event.eventId}/guests/export.csv`;

    beforeAll(async () => {
      event = await world.createEvent({ plan: "PREMIUM" });
      const family = await world.seedParty(event, {
        displayName: "=SUM(Family)",
        tableLabel: "Table 4",
        tags: ["family", "vip"],
        guests: [
          { name: "Ada Lovelace", email: "ada@example.com" },
          { name: "Byron Lovelace", isChild: true },
        ],
      });
      await world.seedRsvp(family.guestIds[0] as string, {
        status: "YES",
        dietary: ["VEGAN", "NUT_ALLERGY"],
        allergySeverity: "SEVERE_ANAPHYLAXIS",
        allergyNotes: "Carries an adrenaline pen",
        accessibilityNotes: "Step-free access please",
        respondedAt: new Date("2026-11-03T01:30:00.000Z"),
      });
      await world.seedParty(event, {
        displayName: "Quiet Guest",
        guests: [{ name: "Quiet Guest" }],
      });
    });

    it("exports the guest list as CSV with a BOM, CRLF and neutralised formulas", async () => {
      const res = await api.call(event.owner, "GET", path());
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
      expect(res.headers.get("content-disposition")).toMatch(
        new RegExp(`^attachment; filename="guests-${event.eventSlug}-\\d{4}-\\d{2}-\\d{2}\\.csv"$`),
      );
      expect(res.headers.get("cache-control")).toBe("no-store");

      const bytes = new Uint8Array(await res.arrayBuffer());
      expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
      const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
      expect(text.split("\r\n")).toHaveLength(5); // header, three guests, trailing line break

      const rows = parseCsv(text);
      expect(rows[0]).toEqual([...EXPORT_COLUMNS]);
      expect(rows).toHaveLength(4);
      const ada = rows[1] as string[];
      expect(ada[0]).toBe("'=SUM(Family)");
      expect(ada.slice(1, 12)).toEqual([
        "Ada Lovelace",
        "No",
        "No",
        "YES",
        "03/11/2026 09:30", // Australia/Perth
        "Table 4",
        "2",
        "family; vip",
        "ada@example.com",
        "",
        "No",
      ]);
      expect(ada[12]).toMatch(new RegExp(`^/i/${event.eventSlug}/sum-family-[a-z0-9]{8}$`));
      expect(rows[2]?.slice(1, 6)).toEqual(["Byron Lovelace", "Yes", "No", "PENDING", ""]);

      const audit = await db.auditLog.findMany({
        where: { entity: "Event", entityId: event.eventId, actorUserId: event.userId },
      });
      expect(audit.map((row) => row.action)).toEqual(["guest.export"]);
      expect(audit[0]?.diffJson).toEqual({ guests: 3, includeHealth: false });
    });

    it("omits health columns for a co-host without health:read and refuses includeHealth", async () => {
      const viewer = await world.addCoHost(event, "VIEWER");

      const plain = await api.call(viewer, "GET", path());
      expect(plain.status).toBe(200);
      const text = await plain.text();
      const header = parseCsv(text)[0] ?? [];
      expect(header).toEqual([...EXPORT_COLUMNS]);
      for (const column of EXPORT_HEALTH_COLUMNS) expect(header).not.toContain(column);
      for (const secret of [
        "VEGAN",
        "NUT_ALLERGY",
        "SEVERE_ANAPHYLAXIS",
        "adrenaline",
        "Step-free",
      ]) {
        expect(text).not.toContain(secret);
      }

      const withHealth = await api.call(viewer, "GET", `${path()}?includeHealth=true`);
      expect(withHealth.status).toBe(403);
      expect(await errorCode(withHealth)).toBe("FORBIDDEN");
      expect(
        await db.auditLog.count({ where: { action: "health.read", actorUserId: viewer.userId } }),
      ).toBe(0);

      expect((await api.call(viewer, "GET", `${path()}?includeHealth=maybe`)).status).toBe(400);
    });

    it("includes decrypted health columns for the owner and audits the health read", async () => {
      const editor = await world.addCoHost(event, "EDITOR");
      const res = await api.call(editor, "GET", `${path()}?includeHealth=true`);
      expect(res.status).toBe(200);
      const rows = parseCsv(await res.text());
      expect(rows[0]).toEqual([...EXPORT_COLUMNS, ...EXPORT_HEALTH_COLUMNS]);
      expect(rows[1]?.slice(EXPORT_COLUMNS.length)).toEqual([
        "VEGAN; NUT_ALLERGY",
        "SEVERE_ANAPHYLAXIS",
        "Carries an adrenaline pen",
        "Step-free access please",
      ]);
      expect(rows[2]?.slice(EXPORT_COLUMNS.length)).toEqual(["", "", "", ""]);

      // What is stored is ciphertext; the export decrypted it.
      const stored = await db.guest.findFirstOrThrow({
        where: { party: { invitationId: event.invitationId }, email: "ada@example.com" },
        include: { rsvp: true },
      });
      expect(stored.rsvp?.allergyNotes).toMatch(/^enc:v1:/);
      expect(stored.rsvp?.dietaryEncrypted).toMatch(/^enc:v1:/);

      const audit = await db.auditLog.findMany({
        where: { entity: "Event", entityId: event.eventId, actorUserId: editor.userId },
        orderBy: { action: "asc" },
      });
      expect(audit.map((row) => row.action)).toEqual(["guest.export", "health.read"]);
      expect(JSON.stringify(audit)).not.toContain("adrenaline");
    });
  });

  describe("Free-tier 5 links & 20-link simulated payment unlock flow", () => {
    it("allows James on the Free tier to create 5 links (A and B, C and D, E and F, G and J, E and Q) and all 5 links work", async () => {
      const jamesEvent = await world.createEvent({ published: true });
      const couples = [
        ["A and B", ["Guest A", "Guest B"]],
        ["C and D", ["Guest C", "Guest D"]],
        ["E and F", ["Guest E", "Guest F"]],
        ["G and J", ["Guest G", "Guest J"]],
        ["E and Q", ["Guest E2", "Guest Q"]],
      ] as const;

      const createdParties: HostParty[] = [];
      for (const [displayName, [g1, g2]] of couples) {
        const party = await createParty(jamesEvent, {
          displayName,
          guests: [{ name: g1 }, { name: g2 }],
        });
        expect(party.token).toMatch(/^a-and-b-[a-z0-9]{8}$|^c-and-d-[a-z0-9]{8}$|^e-and-f-[a-z0-9]{8}$|^g-and-j-[a-z0-9]{8}$|^e-and-q-[a-z0-9]{8}$/);
        expect(party.invitePath).toBe(`/i/${jamesEvent.eventSlug}/${party.token}`);
        createdParties.push(party);
      }

      const listed = HostPartyListSchema.parse(
        await (
          await api.call(jamesEvent.owner, "GET", `/v1/events/${jamesEvent.eventId}/parties`)
        ).json(),
      );
      expect(listed.items).toHaveLength(5);

      for (const party of listed.items) {
        expect(party.token).not.toBeNull();
        expect(party.invitePath).toBe(`/i/${jamesEvent.eventSlug}/${party.token}`);

        // Resolve the guest link and submit an RSVP for both guests in the couple.
        const resolved = await api.call(
          null,
          "GET",
          `/v1/i/${jamesEvent.eventSlug}/${party.token}`,
        );
        expect(resolved.status).toBe(200);
        const view = GuestInvitationViewSchema.parse(await resolved.json());
        expect(view.rsvp.state).toBe("OPEN");
        expect(view.party.displayName).toBe(party.displayName);

        const rsvpRes = await api.call(
          null,
          "POST",
          `/v1/i/${jamesEvent.eventSlug}/${party.token}/rsvp`,
          {
            members: view.party.members.map((g) => ({ guestId: g.guestId, status: "YES" })),
          },
          { "Idempotency-Key": `james-rsvp-${party.id}` },
        );
        expect(rsvpRes.status).toBe(200);
      }
    });

    it("locks links #6-#20 before payment on Free tier, then unlocks all 20 links after simulated payment and all 20 links work", async () => {
      const twentyEvent = await world.createEvent({ published: true });

      for (let i = 1; i <= 20; i++) {
        const party = await createParty(twentyEvent, {
          displayName: `Household ${String(i).padStart(2, "0")}`,
          guests: [{ name: `Guest ${i}` }],
        });
        if (i <= 5) {
          expect(party.token).toMatch(/^household-0[1-5]-[a-z0-9]{8}$/);
          expect(party.invitePath).toBe(`/i/${twentyEvent.eventSlug}/${party.token}`);
        } else {
          expect(party.token).toBeNull();
          expect(party.invitePath).toBeNull();
        }
      }

      const beforePayment = HostPartyListSchema.parse(
        await (
          await api.call(twentyEvent.owner, "GET", `/v1/events/${twentyEvent.eventId}/parties`)
        ).json(),
      );
      expect(beforePayment.items).toHaveLength(20);
      expect(beforePayment.items.filter((p) => p.token !== null)).toHaveLength(5);
      expect(beforePayment.items.filter((p) => p.token === null)).toHaveLength(15);

      // CSV export also hides the locked invite paths before payment.
      const csvBeforeRes = await api.call(
        twentyEvent.owner,
        "GET",
        `/v1/events/${twentyEvent.eventId}/guests/export.csv`,
      );
      expect(csvBeforeRes.status).toBe(200);
      const csvBeforeRows = parseCsv(await csvBeforeRes.text()).slice(1);
      expect(csvBeforeRows).toHaveLength(20);
      expect(csvBeforeRows.filter((row) => (row[12] ?? "") !== "")).toHaveLength(5);
      expect(csvBeforeRows.filter((row) => (row[12] ?? "") === "")).toHaveLength(15);

      // Perform simulated checkout -> confirm checkout.
      const prevSim = process.env.STRIPE_SIMULATED_CHECKOUT;
      process.env.STRIPE_SIMULATED_CHECKOUT = "1";
      try {
        const checkoutRes = await api.call(
          twentyEvent.owner,
          "POST",
          `/v1/events/${twentyEvent.eventId}/plan/checkout`,
          undefined,
          { "Idempotency-Key": `sim-checkout-${twentyEvent.eventId}` },
        );
        expect(checkoutRes.status).toBe(201);
        const checkoutSession = (await checkoutRes.json()) as {
          checkoutUrl: string;
        };
        const parsedCheckoutUrl = new URL(checkoutSession.checkoutUrl, "http://localhost:3001");
        expect(parsedCheckoutUrl.pathname).toBe(`/studio/${twentyEvent.eventId}/checkout`);
        const sessionId = parsedCheckoutUrl.searchParams.get("session_id") ?? "";
        expect(sessionId).toMatch(/^cs_sim_/);

        const confirmRes = await api.call(
          twentyEvent.owner,
          "POST",
          `/v1/events/${twentyEvent.eventId}/plan/checkout/confirm`,
          { sessionId },
        );
        expect(confirmRes.status).toBe(200);
        const confirmedPlan = (await confirmRes.json()) as {
          plan: string;
          effectivePlan: string;
        };
        expect(confirmedPlan.plan).toBe("PREMIUM");
        expect(confirmedPlan.effectivePlan).toBe("PREMIUM");
      } finally {
        if (prevSim === undefined) delete process.env.STRIPE_SIMULATED_CHECKOUT;
        else process.env.STRIPE_SIMULATED_CHECKOUT = prevSim;
      }

      // After payment, all 20 links are unlocked and visible, and all 20 links work end-to-end!
      const afterPayment = HostPartyListSchema.parse(
        await (
          await api.call(twentyEvent.owner, "GET", `/v1/events/${twentyEvent.eventId}/parties`)
        ).json(),
      );
      expect(afterPayment.items).toHaveLength(20);
      expect(afterPayment.items.every((p) => p.token !== null && p.invitePath !== null)).toBe(
        true,
      );

      for (const party of afterPayment.items) {
        const resolved = await api.call(
          null,
          "GET",
          `/v1/i/${twentyEvent.eventSlug}/${party.token}`,
        );
        expect(resolved.status).toBe(200);
        const view = GuestInvitationViewSchema.parse(await resolved.json());
        expect(view.rsvp.state).toBe("OPEN");

        const rsvpRes = await api.call(
          null,
          "POST",
          `/v1/i/${twentyEvent.eventSlug}/${party.token}/rsvp`,
          {
            members: view.party.members.map((g) => ({ guestId: g.guestId, status: "YES" })),
          },
          { "Idempotency-Key": `twenty-rsvp-${party.id}` },
        );
        expect(rsvpRes.status).toBe(200);
        const rsvpBody = (await rsvpRes.json()) as { passes: Array<{ token: string }> };
        // Because the event is now PREMIUM, each attending guest also receives a QR entry pass!
        expect(rsvpBody.passes).toHaveLength(1);
      }
    });
  });
});

