/**
 * `recordHeadcountSnapshot` and `syncPassesForParty` against the real database: the two functions
 * the guest-list module calls from its own transactions.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, encryptRsvpWriteData, generateId } from "@managevent/db";
import { DietaryCountsSchema } from "@managevent/validators";
import { dbAvailable } from "../../test/db.js";
import { syncPassesForParty } from "../checkin/pass.js";
import {
  cleanupEventFixture,
  createEventFixture,
  createPartyFixture,
  type EventFixture,
  uniqueTestSuffix,
} from "../guest-site/test-fixtures.js";
import { recordHeadcountSnapshot } from "./service.js";

type Status = "YES" | "NO" | "MAYBE" | "PENDING";

async function setRsvp(guestId: string, status: Status, dietary?: string[]): Promise<void> {
  const health = dietary ? encryptRsvpWriteData({ dietary }) : {};
  await db.rsvp.upsert({
    where: { guestId },
    create: {
      id: generateId("rsvp_"),
      guestId,
      status,
      respondedAt: new Date(),
      source: "HOST_ENTRY",
      idempotencyKey: `test-${uniqueTestSuffix()}:${guestId}`,
      songRequests: [],
      ...health,
    },
    update: { status, ...health },
  });
}

async function accessFor(fixture: EventFixture) {
  const invitation = await db.invitation.findUniqueOrThrow({ where: { id: fixture.invitationId } });
  const event = await db.event.findUniqueOrThrow({ where: { id: fixture.eventId } });
  return {
    invitation,
    event: {
      id: event.id,
      ownerUserId: event.ownerUserId,
      title: "Test Event",
      ceremonySlug: event.ceremonySlug,
      experienceMode: event.experienceMode,
      status: event.status,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      timeZone: event.timeZone,
    },
  };
}

describe.skipIf(!dbAvailable)("headcount snapshots and pass sync (database)", () => {
  const fixtures: EventFixture[] = [];

  async function newEvent(overrides: Parameters<typeof createEventFixture>[0] = {}) {
    const fixture = await createEventFixture(overrides);
    fixtures.push(fixture);
    return fixture;
  }

  let event: EventFixture;

  beforeAll(async () => {
    event = await newEvent();
  });

  afterAll(async () => {
    for (const fixture of fixtures) await cleanupEventFixture(fixture);
  });

  it("counts active guests of active parties and stores strict dietary counts", async () => {
    const other = await newEvent();
    const otherParty = await createPartyFixture(other, {
      displayName: "Other Event Party",
      guests: [{ name: "Other One" }],
    });
    await setRsvp(otherParty.guestIds[0] ?? "", "YES", ["VEGAN"]);

    const family = await createPartyFixture(event, {
      displayName: "Count Family",
      guests: [
        { name: "Adult Yes" },
        { name: "Child Yes", isChild: true },
        { name: "Adult No" },
        { name: "Adult Maybe" },
        { name: "Adult Pending Row" },
        { name: "Adult No Row" },
        { name: "Removed Yes" },
      ],
    });
    const [adultYes, childYes, adultNo, adultMaybe, pendingRow, , removedYes] = family.guestIds as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    await setRsvp(adultYes, "YES", ["HALAL", "NUT_ALLERGY"]);
    await setRsvp(childYes, "YES", ["NUT_ALLERGY", "NONE"]);
    await setRsvp(adultNo, "NO", ["KOSHER"]);
    await setRsvp(adultMaybe, "MAYBE", ["VEGAN"]);
    await setRsvp(pendingRow, "PENDING");
    await setRsvp(removedYes, "YES", ["GLUTEN_FREE"]);
    await db.guest.update({ where: { id: removedYes }, data: { deletedAt: new Date() } });

    const removedParty = await createPartyFixture(event, {
      displayName: "Removed Party",
      guests: [{ name: "Gone Yes" }],
    });
    await setRsvp(removedParty.guestIds[0] ?? "", "YES", ["DAIRY_FREE"]);
    await db.party.update({ where: { id: removedParty.partyId }, data: { deletedAt: new Date() } });

    const { id } = await db.$transaction((tx) =>
      recordHeadcountSnapshot(tx, event.eventId, "HOST_EDIT"),
    );
    expect(id).toMatch(/^hc_/);
    const snapshot = await db.eventHeadcount.findUniqueOrThrow({ where: { id } });
    expect(snapshot).toMatchObject({
      eventId: event.eventId,
      trigger: "HOST_EDIT",
      adultsYes: 1,
      childrenYes: 1,
      no: 1,
      maybe: 1,
      pending: 2,
    });
    // Strict: exactly the nine tags, attending guests only, nothing from removed rows or other events.
    expect(DietaryCountsSchema.parse(snapshot.dietaryCountsJson)).toEqual({
      HALAL: 1,
      VEGETARIAN: 0,
      VEGAN: 0,
      GLUTEN_FREE: 0,
      DAIRY_FREE: 0,
      KOSHER: 0,
      NUT_ALLERGY: 2,
      SHELLFISH_ALLERGY: 0,
      OTHER_ALLERGY: 0,
    });
    expect(Object.keys(snapshot.dietaryCountsJson as object).sort()).toEqual(
      [
        "DAIRY_FREE",
        "GLUTEN_FREE",
        "HALAL",
        "KOSHER",
        "NUT_ALLERGY",
        "OTHER_ALLERGY",
        "SHELLFISH_ALLERGY",
        "VEGAN",
        "VEGETARIAN",
      ].sort(),
    );

    // The other event's snapshot only sees its own guest.
    const otherSnapshot = await db.$transaction((tx) =>
      recordHeadcountSnapshot(tx, other.eventId, "RSVP"),
    );
    expect(
      await db.eventHeadcount.findUniqueOrThrow({ where: { id: otherSnapshot.id } }),
    ).toMatchObject({ trigger: "RSVP", adultsYes: 1, childrenYes: 0, pending: 0 });
  });

  it("serialises concurrent snapshots so the newest one always includes every committed change", async () => {
    const busy = await newEvent();
    const parties = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        createPartyFixture(busy, {
          displayName: `Busy Party ${index + 1}`,
          guests: [{ name: `Busy Guest ${index + 1}` }],
        }),
      ),
    );

    // Six transactions, each answering YES for its own party and then taking a snapshot.
    const ids = await Promise.all(
      parties.map((party) =>
        db.$transaction(
          async (tx) => {
            const guestId = party.guestIds[0] ?? "";
            await tx.rsvp.create({
              data: {
                id: generateId("rsvp_"),
                guestId,
                status: "YES",
                respondedAt: new Date(),
                source: "WEB",
                idempotencyKey: `test-${uniqueTestSuffix()}:${guestId}`,
                songRequests: [],
              },
            });
            return (await recordHeadcountSnapshot(tx, busy.eventId, "RSVP")).id;
          },
          { maxWait: 10_000, timeout: 20_000 },
        ),
      ),
    );
    expect(new Set(ids).size).toBe(6);

    const snapshots = await db.eventHeadcount.findMany({ where: { eventId: busy.eventId } });
    // One at a time: every count from 1 to 6 appears exactly once, and none is short.
    expect(snapshots.map((snapshot) => snapshot.adultsYes).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    for (const snapshot of snapshots) expect(snapshot.adultsYes + snapshot.pending).toBe(6);
  });

  it("does nothing on a plan without passes, and keeps one live pass per attending guest otherwise", async () => {
    const freeParty = await createPartyFixture(event, {
      displayName: "Free Pass Party",
      guests: [{ name: "Free Yes" }],
    });
    await setRsvp(freeParty.guestIds[0] ?? "", "YES");
    const freeAccess = await accessFor(event);
    await db.$transaction((tx) => syncPassesForParty(tx, freeAccess, freeParty.partyId));
    expect(await db.pass.count({ where: { partyId: freeParty.partyId } })).toBe(0);

    const premium = await newEvent({ plan: "PREMIUM" });
    const access = await accessFor(premium);
    const party = await createPartyFixture(premium, {
      displayName: "Synced Party",
      guests: [{ name: "Sync Yes" }, { name: "Sync No" }, { name: "Sync Later" }],
    });
    const [yes, no, later] = party.guestIds as [string, string, string];
    await setRsvp(yes, "YES");
    await setRsvp(no, "NO");
    const sync = () => db.$transaction((tx) => syncPassesForParty(tx, access, party.partyId));
    const livePasses = () =>
      db.pass.findMany({
        where: { partyId: party.partyId, revokedAt: null },
        orderBy: { createdAt: "asc" },
      });

    await sync();
    await sync(); // idempotent
    let live = await livePasses();
    expect(live.map((pass) => pass.guestId)).toEqual([yes]);
    const firstPassId = live[0]?.id;

    // Host edits: one guest now attends, one no longer does.
    await setRsvp(later, "YES");
    await setRsvp(yes, "NO");
    await sync();
    live = await livePasses();
    expect(live.map((pass) => pass.guestId)).toEqual([later]);
    expect(
      (await db.pass.findUniqueOrThrow({ where: { id: firstPassId ?? "" } })).revokedAt,
    ).not.toBeNull();

    // Back to YES: a new pass, the revoked one stays revoked.
    await setRsvp(yes, "YES");
    await sync();
    live = await livePasses();
    expect(live.map((pass) => pass.guestId).sort()).toEqual([later, yes].sort());
    expect(live.map((pass) => pass.id)).not.toContain(firstPassId);
    expect(await db.pass.count({ where: { guestId: yes } })).toBe(2);

    // Removing a guest revokes their pass; a party of another invitation is never touched.
    await db.guest.update({ where: { id: later }, data: { deletedAt: new Date() } });
    await sync();
    expect((await livePasses()).map((pass) => pass.guestId)).toEqual([yes]);
    const elsewhere = await accessFor(await newEvent({ plan: "PREMIUM" }));
    await db.$transaction((tx) => syncPassesForParty(tx, elsewhere, party.partyId));
    expect((await livePasses()).map((pass) => pass.guestId)).toEqual([yes]);
    expect(await db.pass.count({ where: { partyId: party.partyId } })).toBe(3);

    // Removing the whole party revokes everything.
    await db.party.update({ where: { id: party.partyId }, data: { deletedAt: new Date() } });
    await sync();
    expect(await livePasses()).toEqual([]);
  });
});
