/**
 * Responses against the real database: totals, and health data that is encrypted at rest and has
 * to be decrypted from nested rows. Every row is created here with unique ids and removed in
 * `afterAll`.
 */
import { db, generateId } from "@managevent/db";
import { DietaryMatrixSchema, ResponsesSummarySchema } from "@managevent/validators";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dbAvailable } from "../../test/db.js";
import { createTestApi, HostWorld, type PartySeed } from "../guest-list/test-fixtures.js";

describe.skipIf(!dbAvailable)("responses (database)", () => {
  const world = new HostWorld();
  const api = createTestApi();
  let event: Awaited<ReturnType<HostWorld["createEvent"]>>;
  let lovelace: PartySeed;
  let hopper: PartySeed;
  let headcountId: string;

  beforeAll(async () => {
    event = await world.createEvent({
      plan: "PREMIUM",
      rsvpDeadline: new Date("2026-11-20T15:59:00.000Z"),
    });
    lovelace = await world.seedParty(event, {
      displayName: "Lovelace Family",
      tableLabel: "Table 3",
      guests: [
        { name: "Ada Lovelace" },
        { name: "Byron Lovelace", isChild: true },
        { name: "Late" },
      ],
    });
    hopper = await world.seedParty(event, {
      displayName: "Hopper",
      guests: [{ name: "Grace Hopper" }, { name: "Declined Guest" }],
    });
    await world.seedParty(event, { displayName: "Silent", guests: [{ name: "Silent" }] });
    const removed = await world.seedParty(event, {
      displayName: "Removed Party",
      guests: [{ name: "Removed Guest" }],
    });
    await world.seedRsvp(removed.guestIds[0] as string, { status: "YES", dietary: ["KOSHER"] });
    await db.party.update({ where: { id: removed.partyId }, data: { deletedAt: new Date() } });
    await db.guest.updateMany({
      where: { partyId: removed.partyId },
      data: { deletedAt: new Date() },
    });

    await world.seedRsvp(lovelace.guestIds[0] as string, {
      status: "YES",
      dietary: ["VEGAN", "NUT_ALLERGY"],
      allergySeverity: "SEVERE_ANAPHYLAXIS",
      allergyNotes: "Carries an adrenaline pen",
      accessibilityNotes: "Step-free access please",
      songRequests: ["Dancing Queen"],
      messageToHost: "Cannot wait!",
      respondedAt: new Date("2026-11-03T01:00:00.000Z"),
    });
    await world.seedRsvp(lovelace.guestIds[1] as string, {
      status: "YES",
      dietary: ["NONE"],
      respondedAt: new Date("2026-11-03T01:00:00.000Z"),
    });
    await world.seedRsvp(hopper.guestIds[0] as string, {
      status: "YES",
      dietary: ["HALAL"],
      respondedAt: new Date("2026-11-04T01:00:00.000Z"),
    });
    await world.seedRsvp(hopper.guestIds[1] as string, {
      status: "NO",
      dietary: ["GLUTEN_FREE"],
      respondedAt: new Date("2026-11-04T01:00:00.000Z"),
    });

    headcountId = generateId("hc_");
    await db.eventHeadcount.create({
      data: {
        id: headcountId,
        eventId: event.eventId,
        adultsYes: 2,
        childrenYes: 1,
        maybe: 0,
        pending: 2,
        no: 1,
        dietaryCountsJson: { HALAL: 1, VEGAN: 1, NUT_ALLERGY: 1 },
        trigger: "RSVP",
      },
    });
  });

  afterAll(async () => {
    await world.cleanup();
  });

  it("stores health data as ciphertext", async () => {
    const rsvp = await db.guest.findUniqueOrThrow({
      where: { id: lovelace.guestIds[0] as string },
      include: { rsvp: true },
    });
    // A nested row is NOT decrypted by the client extension: this is what the repo has to handle.
    expect(rsvp.rsvp?.dietaryEncrypted).toMatch(/^enc:v1:/);
    expect(rsvp.rsvp?.allergySeverityEncrypted).toMatch(/^enc:v1:/);
    expect(rsvp.rsvp?.allergyNotes).toMatch(/^enc:v1:/);
    expect(rsvp.rsvp?.accessibilityNotes).toMatch(/^enc:v1:/);
  });

  it("summarises responses for the host, with counts only for health data", async () => {
    api.setNow(new Date("2026-11-10T04:00:00.000Z"));
    const res = await api.call(event.owner, "GET", `/v1/events/${event.eventId}/responses`);
    api.setNow(null);
    expect(res.status).toBe(200);
    const text = await res.text();
    const summary = ResponsesSummarySchema.parse(JSON.parse(text));

    expect(summary.totals).toEqual({
      parties: 3,
      partiesResponded: 2,
      guests: 6,
      adultsYes: 2,
      childrenYes: 1,
      maybe: 0,
      no: 1,
      pending: 2,
      checkedIn: 0,
    });
    // Decrypted from nested rows; the declined guest and the removed party are not counted.
    expect(summary.dietaryCounts).toMatchObject({
      HALAL: 1,
      VEGAN: 1,
      NUT_ALLERGY: 1,
      GLUTEN_FREE: 0,
      KOSHER: 0,
    });
    expect(summary.severeAllergyCount).toBe(1);
    expect(summary.songRequests).toEqual([
      { partyDisplayName: "Lovelace Family", song: "Dancing Queen" },
    ]);
    expect(summary.messages).toEqual([
      {
        partyDisplayName: "Lovelace Family",
        message: "Cannot wait!",
        respondedAt: "2026-11-03T01:00:00.000Z",
      },
    ]);
    expect(summary.recent.map((entry) => [entry.partyDisplayName, entry.status])).toEqual([
      ["Hopper", "YES"],
      ["Lovelace Family", "YES"],
    ]);
    expect(summary.deadline).toEqual({
      rsvpDeadline: "2026-11-20T15:59:00.000Z",
      rsvpDeadlineLocal: "2026-11-20T23:59",
      state: "OPEN",
      days: 10,
    });
    expect(summary.latestHeadcount).toMatchObject({ id: headcountId, trigger: "RSVP" });
    expect(summary.linkedOrder).toBe(false);

    // The summary is open to every co-host, so it carries no per-guest health detail.
    expect(text).not.toContain("adrenaline");
    expect(text).not.toContain("Step-free");
    expect(text).not.toContain("enc:v1:");
  });

  it("returns the dietary matrix with decrypted detail to a host with health:read", async () => {
    const res = await api.call(event.owner, "GET", `/v1/events/${event.eventId}/responses/dietary`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(text).not.toContain("enc:v1:");
    const matrix = DietaryMatrixSchema.parse(JSON.parse(text));

    expect(matrix.rows).toEqual([
      {
        guestId: lovelace.guestIds[0],
        guestName: "Ada Lovelace",
        partyDisplayName: "Lovelace Family",
        tableLabel: "Table 3",
        isChild: false,
        dietary: ["VEGAN", "NUT_ALLERGY"],
        allergySeverity: "SEVERE_ANAPHYLAXIS",
        allergyNotes: "Carries an adrenaline pen",
        accessibilityNotes: "Step-free access please",
      },
      {
        guestId: hopper.guestIds[0],
        guestName: "Grace Hopper",
        partyDisplayName: "Hopper",
        tableLabel: null,
        isChild: false,
        dietary: ["HALAL"],
        allergySeverity: null,
        allergyNotes: null,
        accessibilityNotes: null,
      },
    ]);
    expect(matrix.counts).toMatchObject({ HALAL: 1, VEGAN: 1, NUT_ALLERGY: 1, GLUTEN_FREE: 0 });
    expect(matrix.byTable.map((table) => [table.tableLabel, table.severe])).toEqual([
      ["Table 3", 1],
      [null, 0],
    ]);

    // The owner's access is not staff access, so it is not audit-logged.
    expect(
      await db.auditLog.count({ where: { action: "health.read", entityId: event.eventId } }),
    ).toBe(0);
  });

  it("audits a staff read of the dietary matrix", async () => {
    const staff = await world.createUser(["PLANNER_STAFF"]);
    const res = await api.call(
      staff,
      "GET",
      `/v1/events/${event.eventId}/responses/dietary`,
      undefined,
      {
        "x-forwarded-for": "203.0.113.9",
      },
    );
    expect(res.status).toBe(200);

    const audit = await db.auditLog.findMany({
      where: { action: "health.read", entityId: event.eventId },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      actorUserId: staff.userId,
      actorRole: "PLANNER_STAFF",
      entity: "Event",
      ip: "203.0.113.9",
    });
    expect(audit[0]?.diffJson).toEqual({ via: "responses.dietary", guests: 2 });
  });

  it("keeps health detail from a VIEWER co-host, other hosts and signed-out callers", async () => {
    const viewer = await world.addCoHost(event, "VIEWER");
    const other = await world.createEvent();

    const summary = await api.call(viewer, "GET", `/v1/events/${event.eventId}/responses`);
    expect(summary.status).toBe(200);
    const dietary = await api.call(viewer, "GET", `/v1/events/${event.eventId}/responses/dietary`);
    expect(dietary.status).toBe(403);
    expect(await dietary.text()).not.toContain("adrenaline");

    for (const path of ["responses", "responses/dietary"]) {
      const asOther = await api.call(other.owner, "GET", `/v1/events/${event.eventId}/${path}`);
      expect(asOther.status).toBe(404);
      const signedOut = await api.call(null, "GET", `/v1/events/${event.eventId}/${path}`);
      expect(signedOut.status).toBe(401);
    }
    expect(
      (await api.call(event.owner, "GET", "/v1/events/evt_not-a-real-id/responses")).status,
    ).toBe(404);
  });
});
