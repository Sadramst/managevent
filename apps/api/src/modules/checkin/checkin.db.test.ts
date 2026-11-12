/**
 * Door check-in against the real database: authorisation, the roster and every scan outcome.
 * All rows hang off fresh event fixtures and are removed afterwards.
 */
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { AuthActor } from "@managevent/auth";
import { db, generateId } from "@managevent/db";
import {
  type CheckInScanResult,
  CheckInRosterSchema,
  CheckInScanResultSchema,
  GuestRsvpResultSchema,
} from "@managevent/validators";
import { signPass } from "../../lib/guest-tokens.js";
import { dbAvailable } from "../../test/db.js";
import {
  cleanupEventFixture,
  createEventFixture,
  createPartyFixture,
  createTestApi,
  createUserFixture,
  type EventFixture,
  type PartyFixture,
  removeUsers,
  uniqueTestSuffix,
} from "../guest-site/test-fixtures.js";
import { syncPassesForParty } from "./pass.js";

interface ErrorBody {
  error: { code: string; details?: { feature?: string } };
}

const HEALTH_CONSENT = {
  granted: true as const,
  textShown: "I agree to my dietary and allergy details being shared with the caterers.",
};

describe.skipIf(!dbAvailable)("check-in (database)", () => {
  const api = createTestApi();
  const fixtures: EventFixture[] = [];
  const extraUserIds: string[] = [];

  let event: EventFixture;
  let otherEvent: EventFixture;
  let freeEvent: EventFixture;
  let owner: AuthActor;

  const rosterPath = (fixture: EventFixture) => `/v1/events/${fixture.eventId}/check-in`;
  const scanPath = (fixture: EventFixture) => `/v1/events/${fixture.eventId}/check-in/scans`;

  async function newEvent(overrides: Parameters<typeof createEventFixture>[0] = {}) {
    const fixture = await createEventFixture(overrides);
    fixtures.push(fixture);
    return fixture;
  }

  /** RSVPs through the real guest route, so passes are issued the way they are in production. */
  async function attend(
    fixture: EventFixture,
    party: PartyFixture,
    members: Array<{ guestId: string; status: "YES" | "NO"; health?: unknown }>,
  ) {
    const res = await api.json(
      "POST",
      `/v1/i/${fixture.eventSlug}/${party.token}/rsvp`,
      { members, healthConsent: HEALTH_CONSENT },
      { "idempotency-key": `idem-${uniqueTestSuffix()}` },
    );
    expect(res.status).toBe(200);
    return GuestRsvpResultSchema.parse(await res.json());
  }

  async function scan(
    fixture: EventFixture,
    body: Record<string, unknown>,
    clientUuid: string = randomUUID(),
  ): Promise<{ status: number; result: CheckInScanResult; clientUuid: string }> {
    const res = await api.json("POST", scanPath(fixture), {
      deviceId: "door-ipad-1",
      scannedAt: new Date().toISOString(),
      clientUuid,
      ...body,
    });
    const json: unknown = await res.json();
    return {
      status: res.status,
      result:
        res.status === 200 ? CheckInScanResultSchema.parse(json) : (json as CheckInScanResult),
      clientUuid,
    };
  }

  const scanRows = (fixture: EventFixture) =>
    db.scanEvent.findMany({ where: { eventId: fixture.eventId }, orderBy: { createdAt: "asc" } });

  beforeAll(async () => {
    event = await newEvent({ plan: "PREMIUM" });
    otherEvent = await newEvent({ plan: "PREMIUM" });
    freeEvent = await newEvent();
    owner = { userId: event.userId, roles: ["CUSTOMER_HOST"] };
  });

  afterEach(() => {
    api.setActor(null);
    api.setNow(null);
  });

  afterAll(async () => {
    for (const fixture of fixtures) await cleanupEventFixture(fixture);
    await removeUsers(extraUserIds);
  });

  describe("authorisation", () => {
    it("needs a session, the event, the scan permission and a plan with check-in", async () => {
      const body = {
        method: "QR",
        qr: "MV1.x.y",
        deviceId: "d",
        scannedAt: new Date().toISOString(),
        clientUuid: randomUUID(),
      };

      // Signed out.
      for (const res of [
        await api.request(rosterPath(event)),
        await api.json("POST", scanPath(event), body),
      ]) {
        expect(res.status).toBe(401);
        expect(((await res.json()) as ErrorBody).error.code).toBe("UNAUTHENTICATED");
      }

      // Another host: the event does not exist for them.
      const strangerId = await createUserFixture();
      extraUserIds.push(strangerId);
      api.setActor({ userId: strangerId, roles: ["CUSTOMER_HOST"] });
      expect((await api.request(rosterPath(event))).status).toBe(404);
      expect((await api.json("POST", scanPath(event), body)).status).toBe(404);
      expect((await api.request("/v1/events/not-an-event/check-in")).status).toBe(404);

      // A VIEWER co-host can see the event but may not run the door.
      const viewerId = await createUserFixture();
      extraUserIds.push(viewerId);
      await db.coHost.create({
        data: { id: generateId("coh_"), eventId: event.eventId, userId: viewerId, role: "VIEWER" },
      });
      api.setActor({ userId: viewerId, roles: ["CUSTOMER_HOST"] });
      for (const res of [
        await api.request(rosterPath(event)),
        await api.json("POST", scanPath(event), body),
      ]) {
        expect(res.status).toBe(403);
        expect(((await res.json()) as ErrorBody).error.code).toBe("FORBIDDEN");
      }

      // An EDITOR co-host may.
      const editorId = await createUserFixture();
      extraUserIds.push(editorId);
      await db.coHost.create({
        data: { id: generateId("coh_"), eventId: event.eventId, userId: editorId, role: "EDITOR" },
      });
      api.setActor({ userId: editorId, roles: ["CUSTOMER_HOST"] });
      expect((await api.request(rosterPath(event))).status).toBe(200);

      // The owner of a FREE event: the feature is not in the plan.
      api.setActor({ userId: freeEvent.userId, roles: ["CUSTOMER_HOST"] });
      for (const res of [
        await api.request(rosterPath(freeEvent)),
        await api.json("POST", scanPath(freeEvent), body),
      ]) {
        expect(res.status).toBe(403);
        const error = ((await res.json()) as ErrorBody).error;
        expect(error.code).toBe("FEATURE_NOT_IN_PLAN");
        expect(error.details?.feature).toBe("qrPassesAndCheckin");
      }

      // Validation happens before anything is looked up.
      api.setActor(owner);
      const invalid = await api.json("POST", scanPath(event), { ...body, clientUuid: "nope" });
      expect(invalid.status).toBe(400);
      const noMethod = await api.json("POST", scanPath(event), { ...body, method: "NFC" });
      expect(noMethod.status).toBe(400);
    });

    it("lets rostered crew scan only inside the event-day window", async () => {
      const startsAt = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
      const crewEvent = await newEvent({ plan: "PREMIUM", startsAt });
      const crewId = await createUserFixture(["CHECKIN_CREW"]);
      extraUserIds.push(crewId);
      const crew: AuthActor = { userId: crewId, roles: ["CHECKIN_CREW"] };

      // Not on the roster: the event does not exist for them.
      api.setActor(crew);
      api.setNow(startsAt);
      expect((await api.request(rosterPath(crewEvent))).status).toBe(404);

      await db.crewRoster.create({
        data: {
          id: generateId("rst_"),
          eventId: crewEvent.eventId,
          userId: crewId,
          role: "door",
          shiftStart: startsAt,
          shiftEnd: new Date(startsAt.getTime() + 6 * 60 * 60 * 1000),
          deviceIds: [],
        },
      });
      expect((await api.request(rosterPath(crewEvent))).status).toBe(200);

      // Weeks before the event the roster grants nothing.
      api.setNow(new Date(startsAt.getTime() - 10 * 24 * 60 * 60 * 1000));
      expect((await api.request(rosterPath(crewEvent))).status).toBe(404);
    });
  });

  describe("roster", () => {
    it("lists every active guest with status, party size, check-in time and door-safe health flags", async () => {
      const rosterEvent = await newEvent({
        plan: "PREMIUM",
        startsAt: new Date("2031-03-06T08:00:00.000Z"),
      });
      const actor: AuthActor = { userId: rosterEvent.userId, roles: ["CUSTOMER_HOST"] };
      const family = await createPartyFixture(rosterEvent, {
        displayName: "Baker Family",
        guests: [{ name: "Ben Baker" }, { name: "Amy Baker", isChild: true }, { name: "Cy Baker" }],
        tableLabel: "Table 2",
      });
      const single = await createPartyFixture(rosterEvent, {
        displayName: "Alder Single",
        guests: [{ name: "Ada Alder" }],
      });
      const removed = await createPartyFixture(rosterEvent, {
        displayName: "Removed Party",
        guests: [{ name: "Gone Guest" }],
      });
      await db.party.update({ where: { id: removed.partyId }, data: { deletedAt: new Date() } });
      const [ben, amy, cy] = family.guestIds as [string, string, string];
      await db.guest.update({ where: { id: cy }, data: { deletedAt: new Date() } });

      const rsvp = await attend(rosterEvent, family, [
        {
          guestId: ben,
          status: "YES",
          health: {
            dietary: ["NUT_ALLERGY", "VEGETARIAN"],
            allergySeverity: "SEVERE_ANAPHYLAXIS",
            allergyNotes: "Peanuts and tree nuts",
          },
        },
        { guestId: amy, status: "NO" },
      ]);
      const benPass = rsvp.passes.find((pass) => pass.guestId === ben);

      api.setActor(actor);
      const scanned = await scan(rosterEvent, { method: "QR", qr: benPass?.qr });
      expect(scanned.result.result).toBe("OK");

      const res = await api.request(rosterPath(rosterEvent));
      expect(res.status).toBe(200);
      const raw = await res.text();
      const roster = CheckInRosterSchema.parse(JSON.parse(raw));

      expect(roster.event).toEqual({
        title: "Test Event",
        startsAt: "2031-03-06T08:00:00.000Z",
        startsAtLocal: "2031-03-06T16:00",
        timeZone: "Australia/Perth",
      });
      expect(roster.totals).toEqual({ expected: 1, checkedIn: 1 });
      // Sorted by party, then by name; removed guests and parties are not on the list.
      expect(roster.guests.map((guest) => guest.name)).toEqual([
        "Ada Alder",
        "Amy Baker",
        "Ben Baker",
      ]);
      expect(roster.guests.find((guest) => guest.guestId === ben)).toMatchObject({
        partyDisplayName: "Baker Family",
        partySize: 2,
        tableLabel: "Table 2",
        status: "YES",
        isChild: false,
        severeAllergy: true,
        dietaryFlags: ["NUT_ALLERGY", "VEGETARIAN"],
      });
      expect(roster.guests.find((guest) => guest.guestId === ben)?.checkedInAt).not.toBeNull();
      expect(roster.guests.find((guest) => guest.guestId === amy)).toMatchObject({
        status: "NO",
        isChild: true,
        checkedInAt: null,
        severeAllergy: false,
        dietaryFlags: [],
      });
      expect(roster.guests.find((guest) => guest.guestId === single.guestIds[0])).toMatchObject({
        partyDisplayName: "Alder Single",
        partySize: 1,
        tableLabel: null,
        status: "PENDING",
      });
      // Flags only: never the notes, a token, a contact detail or the salt.
      for (const secret of [
        "Peanuts",
        family.token,
        single.token,
        rosterEvent.salt,
        "qrPayloadSig",
      ]) {
        expect(raw.includes(secret), secret).toBe(false);
      }
    });
  });

  describe("scans", () => {
    it("checks a pass in once: OK, then DUPLICATE, and replays by clientUuid", async () => {
      const party = await createPartyFixture(event, {
        displayName: "Scan Family",
        guests: [{ name: "Sky Scan" }],
        tableLabel: "Table 1",
      });
      const guestId = party.guestIds[0] ?? "missing";
      const { passes } = await attend(event, party, [{ guestId, status: "YES" }]);
      const pass = passes[0];
      if (!pass) throw new Error("no pass issued");

      api.setActor(owner);
      const before = Date.now();
      const first = await scan(event, { method: "QR", qr: pass.qr, deviceId: "door-ipad-7" });
      expect(first.status).toBe(200);
      expect(first.result.result).toBe("OK");
      expect(first.result.scanEventId).toMatch(/^scn_/);
      expect(first.result.guest).toMatchObject({
        guestId,
        name: "Sky Scan",
        partyDisplayName: "Scan Family",
        partySize: 1,
        tableLabel: "Table 1",
        status: "YES",
      });
      expect(first.result.guest?.checkedInAt).toBe(first.result.firstCheckedInAt);
      expect(Date.parse(first.result.firstCheckedInAt ?? "")).toBeGreaterThanOrEqual(before - 2000);

      const stored = await db.pass.findUnique({ where: { id: pass.passId } });
      expect(stored).toMatchObject({ checkedInBy: event.userId, deviceId: "door-ipad-7" });
      expect(stored?.checkedInAt?.toISOString()).toBe(first.result.firstCheckedInAt);

      // The same scan again (offline retry): the stored answer, no new row.
      const replay = await scan(event, { method: "QR", qr: pass.qr }, first.clientUuid);
      expect(replay.status).toBe(200);
      expect(replay.result).toEqual(first.result);

      // A different scan of the same pass: DUPLICATE, pointing at the first check-in.
      const second = await scan(event, { method: "QR", qr: pass.qr, deviceId: "door-ipad-8" });
      expect(second.result.result).toBe("DUPLICATE");
      expect(second.result.firstCheckedInAt).toBe(first.result.firstCheckedInAt);
      expect(second.result.scanEventId).not.toBe(first.result.scanEventId);
      expect(second.result.guest?.guestId).toBe(guestId);
      // The first check-in is not overwritten.
      expect(await db.pass.findUnique({ where: { id: pass.passId } })).toMatchObject({
        deviceId: "door-ipad-7",
      });

      const rows = (await scanRows(event)).filter((row) => row.passId === pass.passId);
      expect(rows.map((row) => row.result)).toEqual(["OK", "DUPLICATE"]);
      expect(rows[0]).toMatchObject({ clientUuid: first.clientUuid, deviceId: "door-ipad-7" });

      // The guest sees the check-in on their pass.
      api.setActor(null);
      const passesView = (await (
        await api.request(`/v1/i/${event.eventSlug}/${party.token}/passes`)
      ).json()) as { passes: Array<{ checkedInAt: string | null }> };
      expect(passesView.passes[0]?.checkedInAt).toBe(first.result.firstCheckedInAt);
    });

    it("lets exactly one of several simultaneous scans win", async () => {
      const party = await createPartyFixture(event, {
        displayName: "Race Family",
        guests: [{ name: "Rey Race" }],
      });
      const guestId = party.guestIds[0] ?? "missing";
      const { passes } = await attend(event, party, [{ guestId, status: "YES" }]);
      const qr = passes[0]?.qr;

      api.setActor(owner);
      const results = await Promise.all(
        Array.from({ length: 6 }, () => scan(event, { method: "QR", qr })),
      );
      const outcomes = results.map((entry) => entry.result.result).sort();
      expect(outcomes).toEqual([
        "DUPLICATE",
        "DUPLICATE",
        "DUPLICATE",
        "DUPLICATE",
        "DUPLICATE",
        "OK",
      ]);
      const firstTimes = new Set(results.map((entry) => entry.result.firstCheckedInAt));
      expect(firstTimes.size).toBe(1);

      // The same clientUuid sent twice at once is one scan.
      const second = await createPartyFixture(event, {
        displayName: "Twin Family",
        guests: [{ name: "Tai Twin" }],
      });
      const twin = await attend(event, second, [
        { guestId: second.guestIds[0] ?? "", status: "YES" },
      ]);
      const clientUuid = randomUUID();
      const twins = await Promise.all([
        scan(event, { method: "QR", qr: twin.passes[0]?.qr }, clientUuid),
        scan(event, { method: "QR", qr: twin.passes[0]?.qr }, clientUuid),
      ]);
      expect(twins.map((entry) => entry.result.result)).toEqual(["OK", "OK"]);
      expect(twins[0]?.result).toEqual(twins[1]?.result);
      expect(await db.scanEvent.count({ where: { clientUuid } })).toBe(1);
    });

    it("answers INVALID without a row for anything that is not a genuine pass", async () => {
      const party = await createPartyFixture(event, {
        displayName: "Forged Family",
        guests: [{ name: "Fin Forged" }],
      });
      const { passes } = await attend(event, party, [
        { guestId: party.guestIds[0] ?? "", status: "YES" },
      ]);
      const pass = passes[0];
      if (!pass) throw new Error("no pass issued");
      const rowsBefore = (await scanRows(event)).length;

      const unknownId = generateId("pass_");
      const [, , sig = ""] = pass.qr.split(".");
      const flipped = `${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`;
      const forgeries = [
        "",
        "hello",
        "MV1",
        `MV2.${pass.passId}.${sig}`,
        // The guest link is not a pass.
        `http://localhost:3001/i/${event.eventSlug}/${party.token}`,
        // A pass id that does not exist, correctly signed for this event.
        signPass(event.salt, unknownId, event.eventId).qr,
        // A real pass with a tampered signature, and one signed with another event's salt.
        `MV1.${pass.passId}.${flipped}`,
        signPass(otherEvent.salt, pass.passId, event.eventId).qr,
        signPass(event.salt, pass.passId, otherEvent.eventId).qr,
      ];

      api.setActor(owner);
      for (const qr of forgeries) {
        const { status, result } = await scan(event, { method: "QR", qr });
        expect(status, qr).toBe(200);
        expect(result, qr).toEqual({
          result: "INVALID",
          scanEventId: null,
          guest: null,
          firstCheckedInAt: null,
        });
      }
      expect((await scanRows(event)).length).toBe(rowsBefore);
      expect((await db.pass.findUnique({ where: { id: pass.passId } }))?.checkedInAt).toBeNull();

      // The genuine pass still works afterwards.
      expect((await scan(event, { method: "QR", qr: pass.qr })).result.result).toBe("OK");
    });

    it("answers WRONG_EVENT for a genuine pass of another event, without revealing the guest", async () => {
      const elsewhere = await createPartyFixture(otherEvent, {
        displayName: "Elsewhere Family",
        guests: [{ name: "Eli Elsewhere" }],
      });
      const { passes } = await attend(otherEvent, elsewhere, [
        { guestId: elsewhere.guestIds[0] ?? "", status: "YES" },
      ]);
      const pass = passes[0];
      if (!pass) throw new Error("no pass issued");

      api.setActor(owner);
      const first = await scan(event, { method: "QR", qr: pass.qr });
      expect(first.result.result).toBe("WRONG_EVENT");
      expect(first.result.scanEventId).toMatch(/^scn_/);
      expect(first.result.guest).toBeNull();
      expect(first.result.firstCheckedInAt).toBeNull();

      const row = await db.scanEvent.findUnique({ where: { clientUuid: first.clientUuid } });
      // Logged against the event where it was scanned, pointing at the pass that was shown.
      expect(row).toMatchObject({
        eventId: event.eventId,
        passId: pass.passId,
        result: "WRONG_EVENT",
      });
      // The pass is not consumed.
      expect((await db.pass.findUnique({ where: { id: pass.passId } }))?.checkedInAt).toBeNull();

      const replay = await scan(event, { method: "QR", qr: pass.qr }, first.clientUuid);
      expect(replay.result).toEqual(first.result);

      // A scan id that was used at another event is never answered with that event's result.
      api.setActor({ userId: otherEvent.userId, roles: ["CUSTOMER_HOST"] });
      const collision = await scan(otherEvent, { method: "QR", qr: pass.qr }, first.clientUuid);
      expect(collision.status).toBe(409);

      // At its own event the pass is fine.
      const home = await scan(otherEvent, { method: "QR", qr: pass.qr });
      expect(home.result.result).toBe("OK");
    });

    it("answers INVALID with a row for a revoked pass", async () => {
      const party = await createPartyFixture(event, {
        displayName: "Changed Mind Family",
        guests: [{ name: "Cam Changed" }],
      });
      const guestId = party.guestIds[0] ?? "missing";
      const { passes } = await attend(event, party, [{ guestId, status: "YES" }]);
      const pass = passes[0];
      if (!pass) throw new Error("no pass issued");
      // The guest declines afterwards: the pass is revoked by the RSVP transaction.
      const declined = await attend(event, party, [{ guestId, status: "NO" }]);
      expect(declined.passes).toEqual([]);

      api.setActor(owner);
      const result = await scan(event, { method: "QR", qr: pass.qr });
      expect(result.result.result).toBe("INVALID");
      expect(result.result.scanEventId).toMatch(/^scn_/);
      expect(result.result.firstCheckedInAt).toBeNull();
      // The guest is still on the list, so the door can see who this was.
      expect(result.result.guest).toMatchObject({ guestId, status: "NO", checkedInAt: null });
      expect(
        await db.scanEvent.findUnique({ where: { clientUuid: result.clientUuid } }),
      ).toMatchObject({
        result: "INVALID",
        passId: pass.passId,
      });
      expect((await db.pass.findUnique({ where: { id: pass.passId } }))?.checkedInAt).toBeNull();

      // A pass of a removed guest is INVALID too, and names nobody.
      const removedParty = await createPartyFixture(event, {
        displayName: "Removed Guest Family",
        guests: [{ name: "Rem Removed" }],
      });
      const removedGuestId = removedParty.guestIds[0] ?? "missing";
      const removedRsvp = await attend(event, removedParty, [
        { guestId: removedGuestId, status: "YES" },
      ]);
      await db.guest.update({ where: { id: removedGuestId }, data: { deletedAt: new Date() } });
      const removedScan = await scan(event, { method: "QR", qr: removedRsvp.passes[0]?.qr });
      expect(removedScan.result.result).toBe("INVALID");
      expect(removedScan.result.scanEventId).toMatch(/^scn_/);
      expect(removedScan.result.guest).toBeNull();
    });

    it("checks a guest in by hand, issuing a pass when there is none", async () => {
      const party = await createPartyFixture(event, {
        displayName: "Manual Family",
        guests: [{ name: "Max Manual" }, { name: "Mia Manual" }],
      });
      const [max, mia] = party.guestIds as [string, string];
      const { passes } = await attend(event, party, [{ guestId: max, status: "YES" }]);
      const maxPassId = passes[0]?.passId;

      api.setActor(owner);
      // Max has a pass: the manual check-in uses it.
      const first = await scan(event, { method: "MANUAL", guestId: max });
      expect(first.result.result).toBe("OK");
      expect(first.result.guest).toMatchObject({ guestId: max, name: "Max Manual", partySize: 2 });
      expect(await db.pass.count({ where: { guestId: max } })).toBe(1);
      expect(
        (await db.pass.findUnique({ where: { id: maxPassId ?? "" } }))?.checkedInAt,
      ).not.toBeNull();
      // Scanning the QR afterwards is a duplicate of the manual check-in.
      const qrAfter = await scan(event, { method: "QR", qr: passes[0]?.qr });
      expect(qrAfter.result.result).toBe("DUPLICATE");
      expect(qrAfter.result.firstCheckedInAt).toBe(first.result.firstCheckedInAt);

      // Mia never answered: a pass is issued for her at the door.
      expect(await db.pass.count({ where: { guestId: mia } })).toBe(0);
      const walkIn = await scan(event, { method: "MANUAL", guestId: mia });
      expect(walkIn.result.result).toBe("OK");
      expect(walkIn.result.guest).toMatchObject({ guestId: mia, status: "PENDING" });
      expect(walkIn.result.guest?.checkedInAt).toBe(walkIn.result.firstCheckedInAt);
      const miaPasses = await db.pass.findMany({ where: { guestId: mia } });
      expect(miaPasses).toHaveLength(1);
      expect(miaPasses[0]?.qrPayloadSig).toBe(
        signPass(event.salt, miaPasses[0]?.id ?? "", event.eventId).sig,
      );

      const replay = await scan(event, { method: "MANUAL", guestId: mia }, walkIn.clientUuid);
      expect(replay.result).toEqual(walkIn.result);
      const again = await scan(event, { method: "MANUAL", guestId: mia });
      expect(again.result.result).toBe("DUPLICATE");
      expect(await db.pass.count({ where: { guestId: mia } })).toBe(1);

      // A later pass sync (any RSVP change in the party) keeps the door check-in.
      const invitation = await db.invitation.findUniqueOrThrow({
        where: { id: event.invitationId },
      });
      const eventRow = await db.event.findUniqueOrThrow({ where: { id: event.eventId } });
      await db.$transaction((tx) =>
        syncPassesForParty(
          tx,
          {
            invitation,
            event: {
              id: eventRow.id,
              ownerUserId: eventRow.ownerUserId,
              title: "Test Event",
              ceremonySlug: eventRow.ceremonySlug,
              experienceMode: eventRow.experienceMode,
              status: eventRow.status,
              startsAt: eventRow.startsAt,
              endsAt: eventRow.endsAt,
              timeZone: eventRow.timeZone,
            },
          },
          party.partyId,
        ),
      );
      const miaAfter = await db.pass.findMany({ where: { guestId: mia } });
      expect(miaAfter).toHaveLength(1);
      expect(miaAfter[0]?.revokedAt).toBeNull();
      expect(miaAfter[0]?.checkedInAt).not.toBeNull();

      // Guests who are not on this event's list cannot be checked in by hand.
      const stranger = await createPartyFixture(otherEvent, {
        displayName: "Stranger Family",
        guests: [{ name: "Sol Stranger" }],
      });
      const rowsBefore = (await scanRows(event)).length;
      for (const guestId of [stranger.guestIds[0], generateId("gst_")]) {
        const { status, result } = await scan(event, { method: "MANUAL", guestId });
        expect(status).toBe(200);
        expect(result).toEqual({
          result: "INVALID",
          scanEventId: null,
          guest: null,
          firstCheckedInAt: null,
        });
      }
      expect((await scanRows(event)).length).toBe(rowsBefore);
      expect(await db.pass.count({ where: { guestId: stranger.guestIds[0] ?? "" } })).toBe(0);
    });

    it("refuses to scan on a sample invitation, for staff too, and writes nothing", async () => {
      const demo = await newEvent({ plan: "PREMIUM", isDemo: true });
      const party = await createPartyFixture(demo, {
        displayName: "Sample Guest Family",
        guests: [{ name: "Sam Sample" }],
      });
      const guestId = party.guestIds[0] as string;
      const staffId = await createUserFixture(["PLANNER_STAFF"]);
      extraUserIds.push(staffId);
      api.setActor({ userId: staffId, roles: ["PLANNER_STAFF"], mfaVerified: true });

      // Looking at the door list is a read and stays possible.
      expect((await api.request(rosterPath(demo))).status).toBe(200);

      for (const body of [
        { method: "MANUAL", guestId },
        {
          method: "QR",
          qr: signPass(demo.salt, "pas_00000000-0000-7000-8000-000000000000", demo.eventId).qr,
        },
      ]) {
        const attempt = await scan(demo, body);
        expect(attempt.status).toBe(403);
        expect((attempt.result as unknown as ErrorBody).error.code).toBe("DEMO_READ_ONLY");
      }
      // The sample keeps its "no passes, nobody checked in" state.
      expect(await db.pass.count({ where: { partyId: party.partyId } })).toBe(0);
      expect(await scanRows(demo)).toEqual([]);

      api.setActor(null);
      const passes = await api.request(`/v1/i/${demo.eventSlug}/${party.token}/passes`);
      expect(passes.status).toBe(200);
      expect(((await passes.json()) as { passes: unknown[] }).passes).toEqual([]);
    });

    it("records a staff member's read of a guest's health flags on every scan result", async () => {
      const party = await createPartyFixture(event, {
        displayName: "Audited Family",
        guests: [{ name: "Ava Audited" }],
      });
      const guestId = party.guestIds[0] as string;
      await attend(event, party, [
        {
          guestId,
          status: "YES",
          health: { dietary: ["NUT_ALLERGY"], allergySeverity: "SEVERE_ANAPHYLAXIS" },
        },
      ]);
      const staffId = await createUserFixture(["PLANNER_STAFF"]);
      extraUserIds.push(staffId);
      const healthReads = (userId: string) =>
        db.auditLog.findMany({
          where: { actorUserId: userId, action: "health.read" },
          orderBy: { at: "asc" },
        });

      api.setActor({ userId: staffId, roles: ["PLANNER_STAFF"], mfaVerified: true });
      const first = await scan(event, { method: "MANUAL", guestId });
      expect(first.result.result).toBe("OK");
      expect(first.result.guest).toMatchObject({
        severeAllergy: true,
        dietaryFlags: ["NUT_ALLERGY"],
      });
      let audit = await healthReads(staffId);
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        actorRole: "PLANNER_STAFF",
        entity: "Guest",
        entityId: guestId,
        diffJson: { eventId: event.eventId, surface: "check-in.scan" },
      });
      // No flag values in the trail.
      expect(JSON.stringify(audit)).not.toContain("NUT_ALLERGY");

      // A duplicate and a replay show the flags again, so each is recorded.
      const duplicate = await scan(event, { method: "MANUAL", guestId });
      expect(duplicate.result.result).toBe("DUPLICATE");
      expect(duplicate.result.guest?.severeAllergy).toBe(true);
      const replay = await scan(event, { method: "MANUAL", guestId }, first.clientUuid);
      expect(replay.result.guest?.severeAllergy).toBe(true);
      audit = await healthReads(staffId);
      expect(audit).toHaveLength(3);
      expect(new Set(audit.map((row) => row.entityId))).toEqual(new Set([guestId]));

      // A host reading their own event's flags is not an audited staff read.
      api.setActor(owner);
      const asOwner = await scan(event, { method: "MANUAL", guestId });
      expect(asOwner.result.guest?.severeAllergy).toBe(true);
      expect(await healthReads(owner.userId ?? "")).toEqual([]);
    });

    it("never records a check-in time later than the server clock", async () => {
      const party = await createPartyFixture(event, {
        displayName: "Clock Family",
        guests: [{ name: "Cleo Clock" }],
      });
      const { passes } = await attend(event, party, [
        { guestId: party.guestIds[0] ?? "", status: "YES" },
      ]);
      api.setActor(owner);
      const future = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
      const early = new Date(Date.now() - 20 * 60 * 1000).toISOString();

      const ahead = await scan(event, { method: "QR", qr: passes[0]?.qr, scannedAt: future });
      expect(ahead.result.result).toBe("OK");
      expect(Date.parse(ahead.result.firstCheckedInAt ?? "")).toBeLessThanOrEqual(
        Date.now() + 1000,
      );

      // An offline scan uploaded later keeps the time it really happened.
      const offlineParty = await createPartyFixture(event, {
        displayName: "Offline Family",
        guests: [{ name: "Oli Offline" }],
      });
      const offline = await attend(event, offlineParty, [
        { guestId: offlineParty.guestIds[0] ?? "", status: "YES" },
      ]);
      const late = await scan(event, { method: "QR", qr: offline.passes[0]?.qr, scannedAt: early });
      expect(late.result.result).toBe("OK");
      expect(late.result.firstCheckedInAt).toBe(early);
    });
  });
});
