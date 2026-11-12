/**
 * `client.guestSite`, `client.checkIn` and `client.well` against the real API app and database:
 * proves the client's paths, headers and response schemas match what the API really serves.
 *
 * The database is shared, so every row is created with fresh unique ids under one event and
 * removed afterwards; nothing else is touched.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiApp, InMemoryJobQueue } from "@managevent/api";
import { db, generateId } from "@managevent/db";
import { createApiClient, isApiError, type ManageventApiClient } from "../index.js";

const SAFE = "23456789abcdefghjkmnpqrstuvwxyz";

/** Random characters from the 31-character token alphabet. */
function safeSuffix(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += SAFE.charAt(Math.floor(Math.random() * SAFE.length));
  return out;
}

async function probeDatabase(): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), 1_500);
    });
    const query = db.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    return await Promise.race([query, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const dbAvailable = await probeDatabase();

describe.skipIf(!dbAvailable)("guest site, check-in and well through the client (database)", () => {
  const userId = generateId("usr_");
  const eventId = generateId("evt_");
  const invitationId = generateId("inv_");
  const partyId = generateId("pty_");
  const guestIds = [generateId("gst_"), generateId("gst_")] as const;
  const eventSlug = `client-flow-${safeSuffix(6)}`;
  const guestToken = `client-flow-family-${safeSuffix(8)}`;
  const legacyPath = `/anniversary/client-flow-${safeSuffix(8)}`;

  let signedIn = false;
  let client: ManageventApiClient;
  const queue = new InMemoryJobQueue();

  beforeAll(async () => {
    await db.user.create({
      data: {
        id: userId,
        email: `client-flow-${safeSuffix(10)}@test.managevent.invalid`,
        name: "Client Flow Host",
        roles: ["CUSTOMER_HOST"],
      },
    });
    await db.event.create({
      data: {
        id: eventId,
        ownerUserId: userId,
        title: { en: "Client Flow Event" },
        ceremonySlug: "wedding",
        experienceMode: "CELEBRATION",
        status: "LIVE",
        startsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        timeZone: "Australia/Perth",
      },
    });
    await db.invitation.create({
      data: {
        id: invitationId,
        eventId,
        eventSlug,
        templateSlug: "royal-classic",
        themeId: "royal-ivory",
        gateStyle: "wax-seal",
        contentJson: {
          version: 1,
          headline: "Client Flow Event",
          subheadline: "",
          hosts: "The Flow family",
          wording: "",
          story: [],
          schedule: [],
          venue: { name: "Flow Hall", address: "1 Flow Street, Perth WA" },
          faq: [],
          coverImageUrl: null,
          galleryImageUrls: [],
          music: { enabled: false, url: null, title: null, rightsAttested: false },
        },
        languages: ["en"],
        defaultLanguage: "en",
        plan: "PREMIUM",
        rsvpConfigJson: {},
        publishedAt: new Date(),
        salt: `${randomUUID()}${randomUUID()}`.replaceAll("-", ""),
        wellMode: "WISHING_WELL",
        wellConfigJson: { message: "Your presence is the gift." },
      },
    });
    await db.coHost.create({ data: { id: generateId("coh_"), eventId, userId, role: "OWNER" } });
    await db.party.create({
      data: {
        id: partyId,
        invitationId,
        stableId: `s_${randomUUID().replaceAll("-", "").slice(0, 24)}`,
        displayName: { en: "Client Flow Family" },
        token: guestToken,
        maxSeats: 3,
        allowPlusOnes: true,
        childrenAllowed: true,
        tags: [],
      },
    });
    for (const [index, id] of guestIds.entries()) {
      await db.guest.create({
        data: {
          id,
          partyId,
          stableId: `s_${randomUUID().replaceAll("-", "").slice(0, 24)}`,
          name: { en: `Flow Guest ${index + 1}` },
        },
      });
    }
    await db.legacySlug.create({
      data: { id: generateId("lgs_"), legacyPath, partyId, source: "APPILICO_ANNIVERSARY" },
    });

    // As deployed: the web app proves itself to the API with the shared secret, and only then
    // is the visitor's address it forwards believed (it ends up on the consent record below).
    const proxySecret = `client-flow-secret-${randomUUID()}`;
    const app = createApiApp({
      deps: { queue },
      resolveActor: async () => (signedIn ? { userId, roles: ["CUSTOMER_HOST"] } : null),
      disableRateLimits: true,
      clientIp: { proxySecret },
    });
    client = createApiClient({
      baseUrl: "http://api.test",
      forwardedFor: "203.0.113.200",
      proxySecret,
      fetchImpl: (input, init) => Promise.resolve(app.request(input, init)),
    });
  });

  afterAll(async () => {
    const guests = await db.guest.findMany({ where: { partyId }, select: { id: true } });
    const entries = await db.wellEntry.findMany({ where: { invitationId }, select: { id: true } });
    await db.consentRecord.deleteMany({
      where: { subjectType: "GUEST", subjectId: { in: guests.map((guest) => guest.id) } },
    });
    // The RSVP submission ledger has no foreign key to the party.
    await db.webhookEvent.deleteMany({
      where: { provider: "guest-rsvp", providerEventId: { startsWith: `${partyId}:` } },
    });
    await db.auditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: userId },
          { entity: "WellEntry", entityId: { in: entries.map((entry) => entry.id) } },
        ],
      },
    });
    await db.event.deleteMany({ where: { id: eventId } });
    await db.user.deleteMany({ where: { id: userId } });
  });

  it("walks a guest from the link to an RSVP, passes, the calendar and a wish", async () => {
    signedIn = false;
    expect(await client.guestSite.getStatus(eventSlug, guestToken)).toEqual({ state: "ACTIVE" });

    const view = await client.guestSite.getView(eventSlug, guestToken);
    expect(view.event.title).toBe("Client Flow Event");
    expect(view.party.members.map((member) => member.guestId)).toEqual([...guestIds]);
    expect(view.rsvp.state).toBe("OPEN");
    expect(view.features).toEqual({ passEnabled: true, wishesEnabled: true });
    expect(view.invitation.well).toEqual({
      mode: "WISHING_WELL",
      message: "Your presence is the gift.",
    });

    const idempotencyKey = `client-${randomUUID()}`;
    const input = {
      members: [
        { guestId: guestIds[0], status: "YES" as const, health: { dietary: ["VEGAN" as const] } },
        { guestId: guestIds[1], status: "NO" as const },
      ],
      plusOnes: [{ name: "Flow Plus One" }],
      healthConsent: {
        granted: true as const,
        textShown: "I agree to share my dietary details with the hosts and their caterer.",
      },
    };
    const result = await client.guestSite.submitRsvp(eventSlug, guestToken, input, {
      idempotencyKey,
    });
    expect(result.replayed).toBe(false);
    expect(result.party.members).toHaveLength(3);
    expect(result.passes).toHaveLength(2);
    expect(queue.jobs.at(-1)).toMatchObject({
      name: "headcount.changed",
      payload: { eventId, headcountId: result.headcountSnapshotId },
    });

    const replay = await client.guestSite.submitRsvp(eventSlug, guestToken, input, {
      idempotencyKey,
    });
    expect(replay.replayed).toBe(true);
    expect(replay.headcountSnapshotId).toBe(result.headcountSnapshotId);

    // The client IP it forwarded is what the consent record carries.
    const consent = await db.consentRecord.findFirst({
      where: { subjectType: "GUEST", subjectId: guestIds[0], purpose: "HEALTH_DATA_CATERING" },
    });
    expect(consent?.ip).toBe("203.0.113.200");

    const passes = await client.guestSite.getPasses(eventSlug, guestToken);
    expect(passes.enabled).toBe(true);
    expect(passes.passes.map((pass) => pass.passId).sort()).toEqual(
      result.passes.map((pass) => pass.passId).sort(),
    );

    const calendar = await client.guestSite.getCalendar(eventSlug, guestToken);
    expect(calendar.filename).toBe(`${eventSlug}.ics`);
    expect(calendar.ics).toContain("BEGIN:VEVENT");

    const wish = await client.guestSite.submitWish(
      eventSlug,
      guestToken,
      { authorName: "Flow", message: "Congratulations!", shareOnWall: true },
      { idempotencyKey: `wish-${randomUUID()}` },
    );
    expect(wish).toMatchObject({ moderation: "PENDING", visibility: "WALL" });

    expect(await client.guestSite.resolveLegacy(legacyPath)).toEqual({ eventSlug, guestToken });
    const demos = await client.guestSite.listDemos();
    expect(demos.items.map((item) => item.eventSlug)).not.toContain(eventSlug);
  });

  it("reports unknown links, closed doors and missing sessions through the error model", async () => {
    signedIn = false;
    const unknown = client.guestSite.getView(eventSlug, "client-flow-family-22222222");
    await expect(unknown).rejects.toSatisfy((err: unknown) => isApiError(err, "NOT_FOUND"));
    await expect(
      client.guestSite.resolveLegacy("/anniversary/nobody-23456789"),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    await expect(client.checkIn.getRoster(eventId)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    await expect(client.well.list(eventId)).rejects.toMatchObject({ status: 401 });
    // Invalid input never reaches the API.
    await expect(
      client.guestSite.submitRsvp(eventSlug, guestToken, { members: [] }, { idempotencyKey: "k" }),
    ).rejects.toThrow();
  });

  it("lets the host run the door and moderate wishes", async () => {
    signedIn = true;
    const roster = await client.checkIn.getRoster(eventId);
    expect(roster.totals.expected).toBe(2);
    const attending = roster.guests.find((guest) => guest.guestId === guestIds[0]);
    expect(attending).toMatchObject({ status: "YES", checkedInAt: null, dietaryFlags: ["VEGAN"] });

    const passes = await client.guestSite.getPasses(eventSlug, guestToken);
    const pass = passes.passes.find((entry) => entry.guestId === guestIds[0]);
    if (!pass) throw new Error("expected a pass for the attending guest");

    const clientUuid = randomUUID();
    const scan = {
      method: "QR" as const,
      qr: pass.qr,
      deviceId: "client-test-door",
      scannedAt: new Date().toISOString(),
      clientUuid,
    };
    const first = await client.checkIn.scan(eventId, scan);
    expect(first.result).toBe("OK");
    expect(first.guest?.guestId).toBe(guestIds[0]);
    expect(await client.checkIn.scan(eventId, scan)).toEqual(first);
    const duplicate = await client.checkIn.scan(eventId, { ...scan, clientUuid: randomUUID() });
    expect(duplicate.result).toBe("DUPLICATE");
    const manual = await client.checkIn.scan(eventId, {
      method: "MANUAL",
      guestId: guestIds[1],
      deviceId: "client-test-door",
      scannedAt: new Date().toISOString(),
      clientUuid: randomUUID(),
    });
    expect(manual.result).toBe("OK");
    const forged = await client.checkIn.scan(eventId, {
      ...scan,
      qr: "MV1.not-a-pass.sig",
      clientUuid: randomUUID(),
    });
    expect(forged).toEqual({
      result: "INVALID",
      scanEventId: null,
      guest: null,
      firstCheckedInAt: null,
    });

    const pending = await client.well.list(eventId, { moderation: "PENDING" });
    expect(pending.items).toHaveLength(1);
    const entry = pending.items[0];
    if (!entry) throw new Error("expected the wish from the guest flow");
    expect(entry).toMatchObject({
      authorName: "Flow",
      message: "Congratulations!",
      partyDisplayName: "Client Flow Family",
    });

    const approved = await client.well.moderate(eventId, entry.id, { moderation: "APPROVED" });
    expect(approved.moderation).toBe("APPROVED");
    const view = await client.guestSite.getView(eventSlug, guestToken);
    expect(view.wishes.map((wish) => wish.id)).toEqual([entry.id]);

    await expect(client.well.remove(eventId, entry.id)).resolves.toBeUndefined();
    expect((await client.well.list(eventId)).items).toEqual([]);
    await expect(
      client.well.moderate(eventId, entry.id, { moderation: "REJECTED" }),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
});
