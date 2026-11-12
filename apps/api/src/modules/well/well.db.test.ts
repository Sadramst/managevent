/**
 * Host moderation of wishing-well and tribute-book entries against the real database.
 * All rows hang off fresh event fixtures and are removed afterwards.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { AuthActor } from "@managevent/auth";
import { db, ENCRYPTION_PREFIX, generateId } from "@managevent/db";
import {
  GuestInvitationViewSchema,
  GuestWishResultSchema,
  HostWellEntryListSchema,
  HostWellEntrySchema,
} from "@managevent/validators";
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
} from "../guest-site/test-fixtures.js";

interface ErrorBody {
  error: { code: string };
}

describe.skipIf(!dbAvailable)("well entries (database)", () => {
  const api = createTestApi();
  const fixtures: EventFixture[] = [];
  const extraUserIds: string[] = [];

  let event: EventFixture;
  let otherEvent: EventFixture;
  let party: PartyFixture;
  let owner: AuthActor;

  const listPath = (fixture: EventFixture, query = "") =>
    `/v1/events/${fixture.eventId}/well-entries${query}`;
  const entryPath = (fixture: EventFixture, entryId: string) =>
    `/v1/events/${fixture.eventId}/well-entries/${entryId}`;

  /** Writes an entry through the real guest route. */
  async function leaveWish(
    fixture: EventFixture,
    from: PartyFixture,
    body: { authorName: string; message: string; shareOnWall?: boolean },
  ) {
    api.setActor(null);
    const res = await api.json("POST", `/v1/i/${fixture.eventSlug}/${from.token}/wishes`, body);
    expect(res.status).toBe(201);
    return GuestWishResultSchema.parse(await res.json());
  }

  const auditRows = (entryId: string) =>
    db.auditLog.findMany({
      where: { entity: "WellEntry", entityId: entryId },
      orderBy: { at: "asc" },
    });

  beforeAll(async () => {
    event = await createEventFixture({ wellMode: "WISHING_WELL" });
    otherEvent = await createEventFixture({ wellMode: "WISHING_WELL" });
    fixtures.push(event, otherEvent);
    party = await createPartyFixture(event, {
      displayName: "Wellwisher Family",
      guests: [{ name: "Wes Wellwisher" }],
    });
    owner = { userId: event.userId, roles: ["CUSTOMER_HOST"] };
  });

  afterEach(() => {
    api.setActor(null);
  });

  afterAll(async () => {
    for (const fixture of fixtures) await cleanupEventFixture(fixture);
    await removeUsers(extraUserIds);
  });

  it("needs a session, the event and the moderation permission", async () => {
    const entry = await leaveWish(event, party, { authorName: "Wes", message: "Auth check" });
    const attempts = async () => [
      await api.request(listPath(event)),
      await api.json("PATCH", entryPath(event, entry.id), { moderation: "APPROVED" }),
      await api.request(entryPath(event, entry.id), { method: "DELETE" }),
    ];

    api.setActor(null);
    for (const res of await attempts()) {
      expect(res.status).toBe(401);
      expect(((await res.json()) as ErrorBody).error.code).toBe("UNAUTHENTICATED");
    }

    const strangerId = await createUserFixture();
    extraUserIds.push(strangerId);
    api.setActor({ userId: strangerId, roles: ["CUSTOMER_HOST"] });
    for (const res of await attempts()) expect(res.status).toBe(404);

    const viewerId = await createUserFixture();
    extraUserIds.push(viewerId);
    await db.coHost.create({
      data: { id: generateId("coh_"), eventId: event.eventId, userId: viewerId, role: "VIEWER" },
    });
    api.setActor({ userId: viewerId, roles: ["CUSTOMER_HOST"] });
    for (const res of await attempts()) {
      expect(res.status).toBe(403);
      expect(((await res.json()) as ErrorBody).error.code).toBe("FORBIDDEN");
    }

    // Nothing changed.
    const row = await db.wellEntry.findUnique({ where: { id: entry.id } });
    expect(row).toMatchObject({ moderation: "PENDING", deletedAt: null });
    expect(await auditRows(entry.id)).toEqual([]);
  });

  it("lists entries newest first with decrypted messages, filtered by moderation", async () => {
    const listEvent = await createEventFixture({ wellMode: "WISHING_WELL" });
    fixtures.push(listEvent);
    const actor: AuthActor = { userId: listEvent.userId, roles: ["CUSTOMER_HOST"] };
    const from = await createPartyFixture(listEvent, {
      displayName: "Lister Family",
      guests: [{ name: "Lia Lister" }],
    });
    const hidden = await leaveWish(listEvent, from, {
      authorName: "Lia",
      message: "A private note for the two of you.",
    });
    const wall = await leaveWish(listEvent, from, {
      authorName: "Lia Lister",
      message: "Congratulations to you both!",
      shareOnWall: true,
    });
    // An entry of another event never shows up here.
    const foreignParty = await createPartyFixture(otherEvent, {
      displayName: "Foreign Family",
      guests: [{ name: "Flo Foreign" }],
    });
    const foreign = await leaveWish(otherEvent, foreignParty, {
      authorName: "Flo",
      message: "Different event",
    });

    // At rest the private note is ciphertext.
    const rawRows = await db.$queryRaw<Array<{ message: string }>>`
      SELECT "message" FROM "WellEntry" WHERE "id" = ${hidden.id}`;
    expect(rawRows[0]?.message.startsWith(ENCRYPTION_PREFIX)).toBe(true);

    api.setActor(actor);
    const res = await api.request(listPath(listEvent));
    expect(res.status).toBe(200);
    const raw = await res.text();
    const list = HostWellEntryListSchema.parse(JSON.parse(raw));
    expect(list.items.map((item) => item.id)).toEqual([wall.id, hidden.id]);
    expect(list.items[0]).toMatchObject({
      partyDisplayName: "Lister Family",
      authorName: "Lia Lister",
      message: "Congratulations to you both!",
      visibility: "WALL",
      moderation: "PENDING",
    });
    expect(list.items[1]).toMatchObject({
      authorName: "Lia",
      message: "A private note for the two of you.",
      visibility: "HOSTS_ONLY",
      moderation: "PENDING",
    });
    expect(raw).not.toContain(foreign.id);
    expect(raw).not.toContain(from.token);
    expect(raw).not.toContain(from.partyId);
    expect(raw).not.toContain(ENCRYPTION_PREFIX);

    await api.json("PATCH", entryPath(listEvent, wall.id), { moderation: "APPROVED" });
    const approved = HostWellEntryListSchema.parse(
      await (await api.request(listPath(listEvent, "?moderation=APPROVED"))).json(),
    );
    expect(approved.items.map((item) => item.id)).toEqual([wall.id]);
    const pending = HostWellEntryListSchema.parse(
      await (await api.request(listPath(listEvent, "?moderation=PENDING"))).json(),
    );
    expect(pending.items.map((item) => item.id)).toEqual([hidden.id]);
    const rejected = HostWellEntryListSchema.parse(
      await (await api.request(listPath(listEvent, "?moderation=REJECTED"))).json(),
    );
    expect(rejected.items).toEqual([]);

    const badFilter = await api.request(listPath(listEvent, "?moderation=MAYBE"));
    expect(badFilter.status).toBe(400);
    expect(((await badFilter.json()) as ErrorBody).error.code).toBe("VALIDATION_ERROR");
  });

  it("approves and rejects entries, audits each decision once, and drives what guests see", async () => {
    const reader = await createPartyFixture(event, {
      displayName: "Reader Party",
      guests: [{ name: "Rae Reader" }],
    });
    const wish = await leaveWish(event, party, {
      authorName: "Wes",
      message: "With all our love on your big day.",
      shareOnWall: true,
    });
    const secret = await leaveWish(event, party, {
      authorName: "Wes",
      message: "Private: the envelope is from grandma.",
    });
    const guestWishes = async () => {
      api.setActor(null);
      const view = GuestInvitationViewSchema.parse(
        await (await api.request(`/v1/i/${event.eventSlug}/${reader.token}`)).json(),
      );
      return view.wishes.map((item) => item.id);
    };
    expect(await guestWishes()).not.toContain(wish.id);

    api.setActor(owner);
    const approve = await api.json(
      "PATCH",
      entryPath(event, wish.id),
      { moderation: "APPROVED" },
      { "x-forwarded-for": "203.0.113.50" },
    );
    expect(approve.status).toBe(200);
    expect(HostWellEntrySchema.parse(await approve.json())).toMatchObject({
      id: wish.id,
      moderation: "APPROVED",
      visibility: "WALL",
      message: "With all our love on your big day.",
      partyDisplayName: "Wellwisher Family",
    });
    expect(await guestWishes()).toContain(wish.id);

    // Approving a hosts-only entry returns it decrypted but never puts it on the invitation.
    api.setActor(owner);
    const approveSecret = await api.json("PATCH", entryPath(event, secret.id), {
      moderation: "APPROVED",
    });
    expect(HostWellEntrySchema.parse(await approveSecret.json())).toMatchObject({
      moderation: "APPROVED",
      visibility: "HOSTS_ONLY",
      message: "Private: the envelope is from grandma.",
    });
    expect(await guestWishes()).not.toContain(secret.id);
    // Still ciphertext at rest after the update.
    const rawSecret = await db.$queryRaw<Array<{ message: string }>>`
      SELECT "message" FROM "WellEntry" WHERE "id" = ${secret.id}`;
    expect(rawSecret[0]?.message.startsWith(ENCRYPTION_PREFIX)).toBe(true);

    // The same decision again is a no-op: no second audit row.
    api.setActor(owner);
    const again = await api.json("PATCH", entryPath(event, wish.id), { moderation: "APPROVED" });
    expect(again.status).toBe(200);

    const reject = await api.json("PATCH", entryPath(event, wish.id), { moderation: "REJECTED" });
    expect(HostWellEntrySchema.parse(await reject.json()).moderation).toBe("REJECTED");
    expect(await guestWishes()).not.toContain(wish.id);

    const audits = await auditRows(wish.id);
    expect(audits.map((row) => row.action)).toEqual(["well.moderate", "well.moderate"]);
    expect(audits[0]).toMatchObject({
      actorUserId: event.userId,
      actorRole: "CUSTOMER_HOST",
      ip: "203.0.113.50",
      diffJson: { eventId: event.eventId, from: "PENDING", to: "APPROVED" },
    });
    expect(audits[1]?.diffJson).toMatchObject({ from: "APPROVED", to: "REJECTED" });
    // The audit trail records the decision, never the words.
    expect(JSON.stringify(audits)).not.toContain("big day");

    api.setActor(owner);
    const invalid = await api.json("PATCH", entryPath(event, wish.id), { moderation: "PENDING" });
    expect(invalid.status).toBe(400);
  });

  it("removes an entry (soft delete), idempotently, with one audit row", async () => {
    const wish = await leaveWish(event, party, {
      authorName: "Wes",
      message: "Please remove me.",
      shareOnWall: true,
    });
    api.setActor(owner);
    await api.json("PATCH", entryPath(event, wish.id), { moderation: "APPROVED" });

    const first = await api.request(entryPath(event, wish.id), { method: "DELETE" });
    expect(first.status).toBe(204);
    expect(await first.text()).toBe("");
    const row = await db.wellEntry.findUnique({ where: { id: wish.id } });
    expect(row?.deletedAt).not.toBeNull();

    const second = await api.request(entryPath(event, wish.id), { method: "DELETE" });
    expect(second.status).toBe(204);
    const audits = await auditRows(wish.id);
    expect(audits.filter((entry) => entry.action === "well.delete")).toHaveLength(1);

    // Gone from the host list and the invitation, and no longer moderatable.
    const list = HostWellEntryListSchema.parse(await (await api.request(listPath(event))).json());
    expect(list.items.map((item) => item.id)).not.toContain(wish.id);
    const patch = await api.json("PATCH", entryPath(event, wish.id), { moderation: "REJECTED" });
    expect(patch.status).toBe(404);
    api.setActor(null);
    const view = GuestInvitationViewSchema.parse(
      await (await api.request(`/v1/i/${event.eventSlug}/${party.token}`)).json(),
    );
    expect(view.wishes.map((item) => item.id)).not.toContain(wish.id);
  });

  it("refuses moderation and removal on a sample invitation, for staff too", async () => {
    const demo = await createEventFixture({
      wellMode: "WISHING_WELL",
      plan: "PREMIUM",
      isDemo: true,
    });
    fixtures.push(demo);
    // Guests cannot write to a sample, so the entry is put there the way the seed would.
    const entryId = generateId("wel_");
    await db.wellEntry.create({
      data: {
        id: entryId,
        invitationId: demo.invitationId,
        authorName: "Sample Author",
        message: "A sample wish",
        visibility: "WALL",
        moderation: "PENDING",
      },
    });
    const staffId = await createUserFixture(["PLANNER_STAFF"]);
    extraUserIds.push(staffId);
    api.setActor({ userId: staffId, roles: ["PLANNER_STAFF"], mfaVerified: true });

    // Reading stays possible.
    expect((await api.request(listPath(demo))).status).toBe(200);

    const moderate = await api.json("PATCH", entryPath(demo, entryId), { moderation: "APPROVED" });
    expect(moderate.status).toBe(403);
    expect(((await moderate.json()) as ErrorBody).error.code).toBe("DEMO_READ_ONLY");
    const remove = await api.request(entryPath(demo, entryId), { method: "DELETE" });
    expect(remove.status).toBe(403);
    expect(((await remove.json()) as ErrorBody).error.code).toBe("DEMO_READ_ONLY");

    const stored = await db.wellEntry.findUniqueOrThrow({ where: { id: entryId } });
    expect(stored).toMatchObject({ moderation: "PENDING", deletedAt: null });
    expect(await auditRows(entryId)).toEqual([]);
  });

  it("answers 404 for an unknown entry and for an entry of another event", async () => {
    const foreignParty = await createPartyFixture(otherEvent, {
      displayName: "Elsewhere Wishers",
      guests: [{ name: "Elle Elsewhere" }],
    });
    const foreign = await leaveWish(otherEvent, foreignParty, {
      authorName: "Elle",
      message: "Not yours to moderate",
    });

    api.setActor(owner);
    for (const entryId of [foreign.id, generateId("wel_"), "not-an-id"]) {
      const patch = await api.json("PATCH", entryPath(event, entryId), { moderation: "APPROVED" });
      expect(patch.status, entryId).toBe(404);
      expect(((await patch.json()) as ErrorBody).error.code).toBe("NOT_FOUND");
      const remove = await api.request(entryPath(event, entryId), { method: "DELETE" });
      expect(remove.status, entryId).toBe(404);
    }
    expect(await db.wellEntry.findUnique({ where: { id: foreign.id } })).toMatchObject({
      moderation: "PENDING",
      deletedAt: null,
    });
  });
});
