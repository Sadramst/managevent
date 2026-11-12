/**
 * Guest micro-site against the real database: link resolution, the guest-safe view, the RSVP
 * transaction, passes, the calendar file, wishes, demos and legacy links.
 *
 * Every row is created under a fresh event fixture and removed afterwards; nothing else in the
 * shared database is read for assertions or touched.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { AuthActor } from "@managevent/auth";
import { db, ENCRYPTION_PREFIX, generateId } from "@managevent/db";
import {
  DemoListSchema,
  DietaryCountsSchema,
  GuestCalendarSchema,
  GuestInvitationViewSchema,
  GuestPassesViewSchema,
  GuestRsvpResultSchema,
  GuestWishResultSchema,
  ResponsesSummarySchema,
  type GuestInvitationView,
  type GuestRsvpResult,
} from "@managevent/validators";
import { createApiApp } from "../../app.js";
import { getPublicAppUrl } from "../../lib/env.js";
import { isPassSignatureValid, verifyPassQr } from "../../lib/guest-tokens.js";
import { InMemoryJobQueue } from "../../lib/queue.js";
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
  updateInvitationFixture,
} from "./test-fixtures.js";

interface ErrorBody {
  error: { code: string; message: string; details?: unknown; requestId: string };
}

const HEALTH_CONSENT = {
  granted: true as const,
  textShown:
    "I consent to Managevent storing my dietary and allergy requirements in Australia solely to brief the event caterers.",
};

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!dbAvailable)("guest site (database)", () => {
  const api = createTestApi();
  const fixtures: EventFixture[] = [];
  const extraUserIds: string[] = [];

  let free: EventFixture;
  let premium: EventFixture;
  let draft: EventFixture;
  let demo: EventFixture;

  const linkPath = (fixture: EventFixture, party: PartyFixture, suffix = "") =>
    `/v1/i/${fixture.eventSlug}/${party.token}${suffix}`;

  const idemKey = () => `idem-${uniqueTestSuffix()}`;

  async function rsvp(
    fixture: EventFixture,
    party: PartyFixture,
    body: unknown,
    key: string = idemKey(),
  ): Promise<Response> {
    return api.json("POST", linkPath(fixture, party, "/rsvp"), body, { "idempotency-key": key });
  }

  async function newEvent(overrides: Parameters<typeof createEventFixture>[0] = {}) {
    const fixture = await createEventFixture(overrides);
    fixtures.push(fixture);
    return fixture;
  }

  const jobsFor = (fixture: EventFixture) =>
    api.queue.jobs.filter((job) => job.payload.eventId === fixture.eventId);

  beforeAll(async () => {
    free = await newEvent();
    premium = await newEvent({ plan: "PREMIUM", wellMode: "WISHING_WELL" });
    draft = await newEvent({ published: false });
    demo = await newEvent({ isDemo: true, plan: "PREMIUM", wellMode: "WISHING_WELL" });
  });

  afterEach(() => {
    api.setActor(null);
    api.setNow(null);
  });

  afterAll(async () => {
    for (const fixture of fixtures) await cleanupEventFixture(fixture);
    await removeUsers(extraUserIds);
  });

  // ─── Link resolution ──────────────────────────────────────────────────────

  describe("link resolution", () => {
    it("answers 200 only for an exact token match", async () => {
      const party = await createPartyFixture(free, {
        displayName: "Exact Match Family",
        guests: [{ name: "Eve Exact" }],
      });
      const other = await createPartyFixture(premium, {
        displayName: "Other Event Family",
        guests: [{ name: "Otto Other" }],
      });

      const ok = await api.request(linkPath(free, party, "/status"));
      expect(ok.status).toBe(200);
      expect(await ok.json()).toEqual({ state: "ACTIVE" });
      expect(ok.headers.get("cache-control")).toBe("private, no-store");
      expect(ok.headers.get("x-robots-tag")).toContain("noindex");

      const suffix = party.token.slice(-8);
      const wrong = [
        // A well-formed token nobody has.
        "exact-match-family-22222222",
        // The readable part alone, and the suffix alone: no prefix or name matching.
        "exact-match-family",
        suffix,
        party.token.slice(0, -1),
        `${party.token}2`,
        // Another party's real token, but from a different event.
        other.token,
        // Not a token at all.
        "x",
        "%27%20OR%201%3D1--",
        `${"a".repeat(130)}`,
      ];
      for (const token of wrong) {
        for (const tail of ["", "/status", "/passes", "/calendar"]) {
          const res = await api.request(`/v1/i/${free.eventSlug}/${token}${tail}`);
          expect(res.status, `${token}${tail}`).toBe(404);
          const body = (await res.json()) as ErrorBody;
          expect(body.error.code).toBe("NOT_FOUND");
          expect(body.error).not.toHaveProperty("details");
        }
      }

      // The right token under the wrong event slug is unknown too.
      const wrongSlug = await api.request(`/v1/i/${premium.eventSlug}/${party.token}`);
      expect(wrongSlug.status).toBe(404);
      const badSlug = await api.request(`/v1/i/NOT%20A%20SLUG/${party.token}`);
      expect(badSlug.status).toBe(404);
    });

    it("normalises case and surrounding whitespace before matching", async () => {
      const party = await createPartyFixture(free, {
        displayName: "Casey Case",
        guests: [{ name: "Casey Case" }],
      });
      const res = await api.request(
        `/v1/i/${free.eventSlug.toUpperCase()}/%20${party.token.toUpperCase()}%20/status`,
      );
      expect(res.status).toBe(200);
    });

    it("answers 410 LINK_REVOKED for a revoked link, a superseded token and a removed party", async () => {
      const revoked = await createPartyFixture(free, {
        displayName: "Revoked Family",
        guests: [{ name: "Rae Revoked" }],
      });
      await db.party.update({
        where: { id: revoked.partyId },
        data: { tokenRevokedAt: new Date() },
      });

      const reissued = await createPartyFixture(free, {
        displayName: "Reissued Family",
        guests: [{ name: "Ria Reissued" }],
      });
      const newToken = "reissued-family-23456789";
      await db.party.update({
        where: { id: reissued.partyId },
        data: { token: newToken, tokenVersion: 1, revokedTokens: [reissued.token] },
      });

      const removed = await createPartyFixture(free, {
        displayName: "Removed Family",
        guests: [{ name: "Rob Removed" }],
      });
      await db.party.update({ where: { id: removed.partyId }, data: { deletedAt: new Date() } });

      for (const party of [revoked, reissued, removed]) {
        for (const tail of ["", "/status", "/passes", "/calendar"]) {
          const res = await api.request(linkPath(free, party, tail));
          expect(res.status, `${party.displayName}${tail}`).toBe(410);
          expect(((await res.json()) as ErrorBody).error.code).toBe("LINK_REVOKED");
        }
        const write = await rsvp(free, party, {
          members: [{ guestId: party.guestIds[0], status: "YES" }],
        });
        expect(write.status).toBe(410);
      }

      // The reissued party answers on its new token.
      const fresh = await api.request(`/v1/i/${free.eventSlug}/${newToken}/status`);
      expect(fresh.status).toBe(200);
    });

    it("hides a draft from the public and other accounts, and previews it read-only for its host", async () => {
      const party = await createPartyFixture(draft, {
        displayName: "Draft Family",
        guests: [{ name: "Dee Draft" }],
      });
      const strangerId = await createUserFixture();
      extraUserIds.push(strangerId);

      for (const actor of [null, { userId: strangerId, roles: ["CUSTOMER_HOST"] } as AuthActor]) {
        api.setActor(actor);
        for (const tail of ["", "/status", "/passes", "/calendar"]) {
          const res = await api.request(linkPath(draft, party, tail));
          expect(res.status, tail).toBe(404);
        }
        const write = await rsvp(draft, party, {
          members: [{ guestId: party.guestIds[0], status: "YES" }],
        });
        expect(write.status).toBe(404);
      }

      // A guest actor is not a session: a GUEST role without a user id never unlocks a draft.
      api.setActor({ roles: ["GUEST"], partyId: party.partyId });
      expect((await api.request(linkPath(draft, party))).status).toBe(404);

      api.setActor({ userId: draft.userId, roles: ["CUSTOMER_HOST"] });
      const res = await api.request(linkPath(draft, party));
      expect(res.status).toBe(200);
      const view = GuestInvitationViewSchema.parse(await res.json());
      expect(view.preview).toBe(true);
      expect(view.demo).toBe(false);
      expect(view.rsvp.state).toBe("READ_ONLY");

      const write = await rsvp(draft, party, {
        members: [{ guestId: party.guestIds[0], status: "YES" }],
      });
      expect(write.status).toBe(403);
      expect(((await write.json()) as ErrorBody).error.code).toBe("PREVIEW_READ_ONLY");
      expect(await db.rsvp.count({ where: { guestId: { in: party.guestIds } } })).toBe(0);

      // The host's own session does not turn a PUBLISHED invitation into a preview.
      const live = await createPartyFixture(free, {
        displayName: "Live Family",
        guests: [{ name: "Liv Live" }],
      });
      api.setActor({ userId: free.userId, roles: ["CUSTOMER_HOST"] });
      const liveView = GuestInvitationViewSchema.parse(
        await (await api.request(linkPath(free, live))).json(),
      );
      expect(liveView.preview).toBe(false);
      expect(liveView.rsvp.state).toBe("OPEN");
    });
  });

  // ─── Guest-safe view ──────────────────────────────────────────────────────

  describe("guest view", () => {
    it("contains this party only: no other party, token, salt, contact detail or internal id", async () => {
      const mine = await createPartyFixture(free, {
        displayName: "Nightingale Household",
        guests: [
          { name: "Nora Nightingale", email: "nora.nightingale@test.managevent.invalid" },
          { name: "Ned Nightingale", phone: "0412345678" },
          { name: "Nia Nightingale", isChild: true },
        ],
        maxSeats: 5,
        allowPlusOnes: true,
        tableLabel: "Table 4",
      });
      const theirs = await createPartyFixture(free, {
        displayName: "Zephyrine Quillfeather",
        guests: [{ name: "Zephyrine Quillfeather", email: "zq@test.managevent.invalid" }],
      });

      const res = await api.request(linkPath(free, mine));
      expect(res.status).toBe(200);
      const raw = await res.text();
      const json = JSON.parse(raw) as Record<string, unknown>;

      // The response is exactly the contract shape: parsing it strictly loses nothing.
      const view: GuestInvitationView = GuestInvitationViewSchema.parse(json);
      expect(JSON.parse(JSON.stringify(view))).toEqual(json);
      expect(Object.keys(json).sort()).toEqual(
        ["demo", "event", "features", "invitation", "party", "preview", "rsvp", "wishes"].sort(),
      );
      expect(Object.keys(json.party as object).sort()).toEqual(
        [
          "allowPlusOnes",
          "childrenAllowed",
          "displayName",
          "maxSeats",
          "members",
          "tableLabel",
        ].sort(),
      );
      expect(Object.keys(json.event as object).sort()).toEqual(
        [
          "ceremonySlug",
          "endsAt",
          "endsAtLocal",
          "experienceMode",
          "phase",
          "startsAt",
          "startsAtLocal",
          "timeZone",
          "title",
        ].sort(),
      );

      const forbidden: Array<[string, string]> = [
        ["other party name", theirs.displayName],
        ["other party name (first word)", "Zephyrine"],
        ["other party token", theirs.token],
        ["other guest id", theirs.guestIds[0] ?? "missing"],
        ["own token", mine.token],
        ["token suffix", mine.token.slice(-8)],
        ["salt", free.salt],
        ["event id", free.eventId],
        ["invitation id", free.invitationId],
        ["party id", mine.partyId],
        ["other party id", theirs.partyId],
        ["owner user id", free.userId],
        ["guest email", "nora.nightingale@test.managevent.invalid"],
        ["guest phone", "0412345678"],
      ];
      for (const [label, value] of forbidden) {
        expect(raw.includes(value), label).toBe(false);
      }
      // No id of an event, invitation, party, user or consent record anywhere in the payload.
      expect(raw).not.toMatch(/"(evt|inv|pty|usr|cns|rsvp|hc)_[0-9a-f]{8}-/);
      for (const key of ["token", "salt", "email", "phone", "plan", "stableId", "pinHash"]) {
        expect(raw.includes(`"${key}"`), key).toBe(false);
      }

      expect(view.preview).toBe(false);
      expect(view.demo).toBe(false);
      expect(view.event).toMatchObject({
        title: "Test Event",
        ceremonySlug: "wedding",
        experienceMode: "CELEBRATION",
        timeZone: "Australia/Perth",
        endsAt: null,
        endsAtLocal: null,
        phase: "UPCOMING",
      });
      expect(view.event.startsAtLocal).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(view.invitation).toMatchObject({
        eventSlug: free.eventSlug,
        templateSlug: "royal-classic",
        themeId: "royal-ivory",
        gateStyle: "wax-seal",
        showBranding: true,
        rsvpDeadline: null,
        rsvpDeadlineLocal: null,
        well: null,
      });
      expect(view.invitation.content.venue?.name).toBe("Test Hall");
      expect(view.party).toMatchObject({
        displayName: "Nightingale Household",
        maxSeats: 5,
        allowPlusOnes: true,
        tableLabel: "Table 4",
      });
      expect(view.party.members.map((member) => member.name)).toEqual([
        "Nora Nightingale",
        "Ned Nightingale",
        "Nia Nightingale",
      ]);
      expect(view.party.members.map((member) => member.guestId)).toEqual(mine.guestIds);
      expect(view.party.members.every((member) => member.status === "PENDING")).toBe(true);
      expect(view.party.members[2]?.isChild).toBe(true);
      expect(view.rsvp).toEqual({
        state: "OPEN",
        hasResponded: false,
        lastRespondedAt: null,
        seatsRemaining: 2,
        songRequests: [],
        messageToHost: null,
      });
      expect(view.features).toEqual({ passEnabled: false, wishesEnabled: false });
      expect(view.wishes).toEqual([]);
    });

    it("reflects the plan and the event's local time", async () => {
      const startsAt = new Date("2031-03-06T08:00:00.000Z");
      const event = await newEvent({
        plan: "PREMIUM",
        startsAt,
        rsvpDeadline: new Date("2031-02-20T09:30:00.000Z"),
        wellMode: "WISHING_WELL",
      });
      await updateInvitationFixture(event, {
        wellConfigJson: { message: "Your presence is the gift.", payId: "gifts@example.com" },
      });
      const party = await createPartyFixture(event, {
        displayName: "Premium Pair",
        guests: [{ name: "Pat Premium" }],
      });
      const view = GuestInvitationViewSchema.parse(
        await (await api.request(linkPath(event, party))).json(),
      );
      // Perth is UTC+8 all year.
      expect(view.event.startsAt).toBe("2031-03-06T08:00:00.000Z");
      expect(view.event.startsAtLocal).toBe("2031-03-06T16:00");
      expect(view.invitation.rsvpDeadline).toBe("2031-02-20T09:30:00.000Z");
      expect(view.invitation.rsvpDeadlineLocal).toBe("2031-02-20T17:30");
      expect(view.invitation.showBranding).toBe(false);
      expect(view.invitation.well).toEqual({
        mode: "WISHING_WELL",
        message: "Your presence is the gift.",
        payId: "gifts@example.com",
      });
      expect(view.features).toEqual({ passEnabled: true, wishesEnabled: true });
    });
  });

  // ─── RSVP ─────────────────────────────────────────────────────────────────

  describe("RSVP", () => {
    it("stores the whole submission in one transaction and takes a headcount snapshot", async () => {
      const event = await newEvent();
      // This host asks for everything, contact details included (off by default).
      await updateInvitationFixture(event, {
        rsvpConfigJson: {
          allowMaybe: false,
          askDietary: true,
          askAccessibility: true,
          songPrompt: "STANDARD",
          askMessage: true,
          askContact: true,
        },
      });
      const bystanders = await createPartyFixture(event, {
        displayName: "Bystander Party",
        guests: [{ name: "Bea Bystander" }, { name: "Bo Bystander" }],
      });
      const party = await createPartyFixture(event, {
        displayName: "Harper Household",
        guests: [
          { name: "Hana Harper" },
          { name: "Hugo Harper" },
          { name: "Hal Harper", isChild: true },
        ],
        maxSeats: 5,
        allowPlusOnes: true,
        childrenAllowed: true,
      });
      const [hana, hugo, hal] = party.guestIds as [string, string, string];
      const key = idemKey();
      const before = Date.now();

      const res = await rsvp(
        event,
        party,
        {
          members: [
            {
              guestId: hana,
              status: "YES",
              health: {
                dietary: ["VEGAN", "NUT_ALLERGY"],
                allergyNotes: "Carries an adrenaline auto-injector",
                allergySeverity: "SEVERE_ANAPHYLAXIS",
                accessibilityNotes: "Step-free access please",
              },
            },
            { guestId: hugo, status: "NO" },
            { guestId: hal, status: "YES", health: { dietary: ["NONE"] } },
          ],
          plusOnes: [{ name: "Priya Plusone", health: { dietary: ["HALAL"] } }],
          songRequests: ["  September  ", "Dancing Queen"],
          messageToHost: "Cannot wait!",
          contact: {
            email: "Hana.Harper@Test.Managevent.Invalid",
            phone: "0412 345 678",
            consentGranted: true,
          },
          healthConsent: HEALTH_CONSENT,
        },
        key,
      );
      expect(res.status).toBe(200);
      const raw = await res.text();
      const result: GuestRsvpResult = GuestRsvpResultSchema.parse(JSON.parse(raw));

      // ── Response: guest-safe, health never echoed ──
      expect(result.replayed).toBe(false);
      expect(result.passes).toEqual([]); // FREE plan: no QR passes
      expect(result.party.members).toHaveLength(4);
      const byName = new Map(result.party.members.map((member) => [member.name, member]));
      expect(byName.get("Hana Harper")).toMatchObject({
        status: "YES",
        healthOnFile: true,
        isPlusOne: false,
      });
      expect(byName.get("Hugo Harper")).toMatchObject({ status: "NO", healthOnFile: false });
      expect(byName.get("Hal Harper")).toMatchObject({
        status: "YES",
        healthOnFile: false,
        isChild: true,
      });
      expect(byName.get("Priya Plusone")).toMatchObject({
        status: "YES",
        healthOnFile: true,
        isPlusOne: true,
      });
      expect(result.rsvp).toMatchObject({
        state: "OPEN",
        hasResponded: true,
        seatsRemaining: 1,
        songRequests: ["September", "Dancing Queen"],
        messageToHost: "Cannot wait!",
      });
      expect(Date.parse(result.rsvp.lastRespondedAt ?? "")).toBeGreaterThanOrEqual(before - 1000);
      for (const secret of [
        "adrenaline",
        "Step-free",
        "VEGAN",
        "SEVERE_ANAPHYLAXIS",
        "HALAL",
        "0412345678",
        "hana.harper@",
        party.token,
        party.partyId,
        event.eventId,
        event.salt,
        "Bystander",
      ]) {
        expect(raw.toLowerCase().includes(secret.toLowerCase()), secret).toBe(false);
      }

      // ── Raw rows: health information is ciphertext at rest ──
      const guests = await db.guest.findMany({
        where: { partyId: party.partyId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      expect(guests).toHaveLength(4);
      const plusOne = guests.find((guest) => guest.isPlusOne);
      expect(plusOne).toMatchObject({
        name: { en: "Priya Plusone" },
        isChild: false,
        deletedAt: null,
      });
      const plusOneId = plusOne?.id ?? "missing";

      const rawRows = await db.$queryRaw<
        Array<{
          guestId: string;
          status: string;
          source: string;
          idempotencyKey: string;
          dietaryEncrypted: string | null;
          allergyNotes: string | null;
          allergySeverityEncrypted: string | null;
          accessibilityNotes: string | null;
          songRequests: string[];
          messageToHost: string | null;
        }>
      >`SELECT "guestId", "status"::text AS "status", "source"::text AS "source", "idempotencyKey",
               "dietaryEncrypted", "allergyNotes", "allergySeverityEncrypted", "accessibilityNotes",
               "songRequests", "messageToHost"
        FROM "Rsvp" WHERE "guestId" IN (${hana}, ${hugo}, ${hal}, ${plusOneId})`;
      expect(rawRows).toHaveLength(4);
      const rowOf = (guestId: string) => {
        const row = rawRows.find((candidate) => candidate.guestId === guestId);
        if (!row) throw new Error(`no Rsvp row for ${guestId}`);
        return row;
      };

      const hanaRow = rowOf(hana);
      expect(hanaRow).toMatchObject({
        status: "YES",
        source: "WEB",
        idempotencyKey: `${key}:${hana}`,
        songRequests: ["September", "Dancing Queen"],
        messageToHost: "Cannot wait!",
      });
      for (const column of [
        hanaRow.dietaryEncrypted,
        hanaRow.allergyNotes,
        hanaRow.allergySeverityEncrypted,
        hanaRow.accessibilityNotes,
      ]) {
        expect(column?.startsWith(ENCRYPTION_PREFIX), String(column)).toBe(true);
      }
      const rawText = JSON.stringify(rawRows);
      for (const plaintext of [
        "VEGAN",
        "NUT_ALLERGY",
        "HALAL",
        "adrenaline",
        "SEVERE",
        "Step-free",
      ]) {
        expect(rawText.includes(plaintext), plaintext).toBe(false);
      }
      expect(rowOf(hugo)).toMatchObject({
        status: "NO",
        dietaryEncrypted: null,
        allergyNotes: null,
        allergySeverityEncrypted: null,
        accessibilityNotes: null,
        songRequests: [],
        messageToHost: null,
      });
      expect(rowOf(hal).dietaryEncrypted?.startsWith(ENCRYPTION_PREFIX)).toBe(true);
      expect(rowOf(plusOneId)).toMatchObject({
        status: "YES",
        idempotencyKey: `${key}:${plusOneId}`,
      });
      expect(rowOf(plusOneId).dietaryEncrypted?.startsWith(ENCRYPTION_PREFIX)).toBe(true);

      // The application client decrypts what it wrote.
      const decrypted = (await db.rsvp.findUnique({ where: { guestId: hana } })) as unknown as {
        dietary: string[];
        allergySeverity: string;
        allergyNotes: string;
        accessibilityNotes: string;
      };
      expect(decrypted.dietary).toEqual(["VEGAN", "NUT_ALLERGY"]);
      expect(decrypted.allergySeverity).toBe("SEVERE_ANAPHYLAXIS");
      expect(decrypted.allergyNotes).toBe("Carries an adrenaline auto-injector");
      expect(decrypted.accessibilityNotes).toBe("Step-free access please");

      // ── Consent records ──
      const consents = await db.consentRecord.findMany({
        where: { subjectType: "GUEST", subjectId: { in: guests.map((guest) => guest.id) } },
      });
      const health = consents.filter((consent) => consent.purpose === "HEALTH_DATA_CATERING");
      // Hana and the plus-one shared health information; Hal ("NONE") and Hugo did not.
      expect(health.map((consent) => consent.subjectId).sort()).toEqual([hana, plusOneId].sort());
      for (const consent of health) {
        expect(consent).toMatchObject({
          granted: true,
          textShown: HEALTH_CONSENT.textShown,
          locale: "en",
          withdrawnAt: null,
        });
      }
      const contact = consents.filter((consent) => consent.purpose === "EVENT_UPDATES");
      expect(contact).toHaveLength(1);
      expect(contact[0]?.subjectId).toBe(hana);
      const primary = guests.find((guest) => guest.id === hana);
      expect(primary).toMatchObject({
        email: "hana.harper@test.managevent.invalid",
        phone: "0412345678",
        contactConsentId: contact[0]?.id,
      });

      // ── Headcount snapshot (whole event, counts only) and the job ──
      const snapshots = await db.eventHeadcount.findMany({ where: { eventId: event.eventId } });
      expect(snapshots).toHaveLength(1);
      const snapshot = snapshots[0];
      expect(snapshot?.id).toBe(result.headcountSnapshotId);
      expect(snapshot).toMatchObject({
        trigger: "RSVP",
        adultsYes: 2, // Hana + the plus-one
        childrenYes: 1, // Hal
        maybe: 0,
        no: 1, // Hugo
        pending: 2, // the two bystanders, who have no Rsvp row
      });
      const counts = DietaryCountsSchema.parse(snapshot?.dietaryCountsJson);
      expect(counts).toMatchObject({ VEGAN: 1, NUT_ALLERGY: 1, HALAL: 1, KOSHER: 0 });
      expect(Object.keys(snapshot?.dietaryCountsJson as object)).not.toContain("NONE");
      expect(JSON.stringify(snapshot?.dietaryCountsJson)).not.toMatch(/Harper|Plusone/);

      expect(jobsFor(event)).toEqual([
        {
          name: "headcount.changed",
          payload: { eventId: event.eventId, headcountId: result.headcountSnapshotId },
          opts: { singletonKey: `headcount.changed:${result.headcountSnapshotId}` },
        },
      ]);

      // Nothing was written for the other party.
      expect(await db.rsvp.count({ where: { guestId: { in: bystanders.guestIds } } })).toBe(0);
      // No pass on a FREE plan.
      expect(await db.pass.count({ where: { partyId: party.partyId } })).toBe(0);
    });

    it("replays the same Idempotency-Key without writing anything", async () => {
      const event = await newEvent();
      const party = await createPartyFixture(event, {
        displayName: "Replay Family",
        guests: [{ name: "Rita Replay" }],
        maxSeats: 3,
        allowPlusOnes: true,
      });
      const key = idemKey();
      const body = {
        members: [{ guestId: party.guestIds[0], status: "YES", health: { dietary: ["KOSHER"] } }],
        plusOnes: [{ name: "Plus Replay" }],
        healthConsent: HEALTH_CONSENT,
      };

      const first = GuestRsvpResultSchema.parse(await (await rsvp(event, party, body, key)).json());
      expect(first.replayed).toBe(false);

      const countRows = async () => ({
        guests: await db.guest.count({ where: { partyId: party.partyId } }),
        rsvps: await db.rsvp.count({ where: { guest: { partyId: party.partyId } } }),
        headcounts: await db.eventHeadcount.count({ where: { eventId: event.eventId } }),
        consents: await db.consentRecord.count({
          where: { subjectType: "GUEST", subjectId: { in: party.guestIds } },
        }),
      });
      const afterFirst = await countRows();
      expect(afterFirst).toEqual({ guests: 2, rsvps: 2, headcounts: 1, consents: 1 });

      // The same key with a DIFFERENT body is refused: it is neither applied nor passed off as
      // a replay of the first request.
      const conflicting = await rsvp(
        event,
        party,
        {
          members: [{ guestId: party.guestIds[0], status: "NO" }],
          plusOnes: [{ name: "Another" }],
        },
        key,
      );
      expect(conflicting.status).toBe(409);
      expect(((await conflicting.json()) as ErrorBody).error.code).toBe("CONFLICT");
      expect(await countRows()).toEqual(afterFirst);

      // A retry of the same request is the same submission.
      const second = await rsvp(event, party, body, key);
      expect(second.status).toBe(200);
      const replay = GuestRsvpResultSchema.parse(await second.json());
      expect(replay.replayed).toBe(true);
      expect(replay.headcountSnapshotId).toBe(first.headcountSnapshotId);
      expect(replay.party).toEqual(first.party);
      expect(replay.rsvp).toEqual(first.rsvp);
      expect(await countRows()).toEqual(afterFirst);
      expect(jobsFor(event)).toHaveLength(1);

      // Two concurrent requests with one new key write once.
      const racedKey = idemKey();
      const racedBody = { members: [{ guestId: party.guestIds[0], status: "NO" }] };
      const raced = await Promise.all([
        rsvp(event, party, racedBody, racedKey),
        rsvp(event, party, racedBody, racedKey),
      ]);
      const racedResults = await Promise.all(
        raced.map(async (res) => GuestRsvpResultSchema.parse(await res.json())),
      );
      expect(raced.map((res) => res.status)).toEqual([200, 200]);
      expect(racedResults.map((result) => result.replayed).sort()).toEqual([false, true]);
      expect(await db.eventHeadcount.count({ where: { eventId: event.eventId } })).toBe(2);

      // A new key is a new submission.
      const third = GuestRsvpResultSchema.parse(
        await (
          await rsvp(event, party, { members: [{ guestId: party.guestIds[0], status: "YES" }] })
        ).json(),
      );
      expect(third.replayed).toBe(false);
      expect(third.headcountSnapshotId).not.toBe(first.headcountSnapshotId);
      expect(await db.eventHeadcount.count({ where: { eventId: event.eventId } })).toBe(3);
    });

    it("does not apply an old request again when it arrives after a newer answer", async () => {
      const event = await newEvent();
      const party = await createPartyFixture(event, {
        displayName: "Late Retry Family",
        guests: [{ name: "Alice Late" }, { name: "Bob Late" }],
        maxSeats: 4,
        allowPlusOnes: true,
      });
      const [alice, bob] = party.guestIds;
      const members = async () =>
        (
          await db.guest.findMany({
            where: { partyId: party.partyId, deletedAt: null },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            include: { rsvp: { select: { status: true } } },
          })
        ).map((guest) => `${(guest.name as { en: string }).en}:${guest.rsvp?.status ?? "PENDING"}`);

      // K1: everyone is coming, with a plus-one. Its response is lost on the way back.
      const k1 = idemKey();
      const firstBody = {
        members: [
          { guestId: alice, status: "YES" },
          { guestId: bob, status: "YES" },
        ],
        plusOnes: [{ name: "Carl Plus" }],
      };
      const first = GuestRsvpResultSchema.parse(
        await (await rsvp(event, party, firstBody, k1)).json(),
      );
      expect(first.replayed).toBe(false);
      expect(await members()).toEqual(["Alice Late:YES", "Bob Late:YES", "Carl Plus:YES"]);
      const carl = first.party.members.find((member) => member.isPlusOne)?.guestId;

      // K2: the guest reloads and changes the answer to "nobody is coming".
      const second = await rsvp(event, party, {
        members: [
          { guestId: alice, status: "NO" },
          { guestId: bob, status: "NO" },
          { guestId: carl, status: "NO" },
        ],
      });
      expect(second.status).toBe(200);
      const declined = ["Alice Late:NO", "Bob Late:NO", "Carl Plus:NO"];
      expect(await members()).toEqual(declined);
      const snapshots = await db.eventHeadcount.count({ where: { eventId: event.eventId } });
      const jobs = jobsFor(event).length;

      // The original K1 request is delivered again (browser resubmit, proxy retry, second tab).
      const late = await rsvp(event, party, firstBody, k1);
      expect(late.status).toBe(200);
      const replay = GuestRsvpResultSchema.parse(await late.json());
      // It is recognised: nothing is written, the newer answers stand, no second Carl appears.
      expect(replay.replayed).toBe(true);
      expect(replay.headcountSnapshotId).toBe(first.headcountSnapshotId);
      expect(await members()).toEqual(declined);
      expect(await db.guest.count({ where: { partyId: party.partyId } })).toBe(3);
      expect(await db.eventHeadcount.count({ where: { eventId: event.eventId } })).toBe(snapshots);
      expect(jobsFor(event)).toHaveLength(jobs);
      // What the guest is shown is the current state, not the state after K1.
      expect(replay.party.members.map((member) => member.status)).toEqual(["NO", "NO", "NO"]);

      // The ledger keeps one row per applied request and stores no answers.
      const ledger = await db.webhookEvent.findMany({
        where: { provider: "guest-rsvp", providerEventId: { startsWith: `${party.partyId}:` } },
      });
      expect(ledger).toHaveLength(2);
      expect(JSON.stringify(ledger)).not.toContain("Carl");
      for (const row of ledger) {
        expect(Object.keys(row.payloadJson as object).sort()).toEqual(["bodyHash", "headcountId"]);
      }
    });

    it("shows the host a note left by a member who answers only for themselves", async () => {
      const event = await newEvent();
      const party = await createPartyFixture(event, {
        displayName: "Partial Reply Family",
        guests: [{ name: "Dana Primary" }, { name: "Evan Member" }],
      });
      const [dana, evan] = party.guestIds;
      const summaryFor = async () => {
        api.setActor({ userId: event.userId, roles: ["CUSTOMER_HOST"] });
        const res = await api.request(`/v1/events/${event.eventId}/responses`);
        api.setActor(null);
        expect(res.status).toBe(200);
        return ResponsesSummarySchema.parse(await res.json());
      };

      // Evan replies for himself. Dana, the party's first guest, has not answered.
      const res = await rsvp(event, party, {
        members: [{ guestId: evan, status: "YES" }],
        songRequests: ["September"],
        messageToHost: "Evan needs step-free access to the hall",
      });
      expect(res.status).toBe(200);
      const result = GuestRsvpResultSchema.parse(await res.json());
      expect(result.rsvp.messageToHost).toBe("Evan needs step-free access to the hall");
      // Dana still counts as not having answered.
      expect(result.party.members.find((member) => member.guestId === dana)?.status).toBe(
        "PENDING",
      );

      const summary = await summaryFor();
      expect(summary.totals).toMatchObject({ adultsYes: 1, pending: 1, partiesResponded: 1 });
      expect(summary.messages).toEqual([
        expect.objectContaining({
          partyDisplayName: "Partial Reply Family",
          message: "Evan needs step-free access to the hall",
        }),
      ]);
      expect(summary.songRequests).toEqual([
        { partyDisplayName: "Partial Reply Family", song: "September" },
      ]);

      // The same holds when the note sits on a row the host later resets to pending.
      await rsvp(event, party, {
        members: [
          { guestId: dana, status: "YES" },
          { guestId: evan, status: "YES" },
        ],
        songRequests: ["September"],
        messageToHost: "Evan needs step-free access to the hall",
      });
      await db.rsvp.update({ where: { guestId: dana as string }, data: { status: "PENDING" } });
      const afterReset = await summaryFor();
      expect(afterReset.messages.map((entry) => entry.message)).toEqual([
        "Evan needs step-free access to the hall",
      ]);
      expect(afterReset.songRequests.map((entry) => entry.song)).toEqual(["September"]);
    });

    it("keeps health on file when a later submission omits it, and replaces it when given", async () => {
      const event = await newEvent();
      const party = await createPartyFixture(event, {
        displayName: "Keeper Family",
        guests: [{ name: "Kit Keeper" }, { name: "Kai Keeper" }],
      });
      const [kit, kai] = party.guestIds as [string, string];
      await rsvp(event, party, {
        members: [
          {
            guestId: kit,
            status: "YES",
            health: { dietary: ["GLUTEN_FREE"], accessibilityNotes: "Hearing loop" },
          },
        ],
        songRequests: ["Song one"],
        messageToHost: "First note",
        healthConsent: HEALTH_CONSENT,
      });

      // Second submission: only Kai answers; Kit's row keeps its health, and the party notes
      // (which live on Kit's row, the primary guest) are replaced.
      const second = await rsvp(event, party, {
        members: [{ guestId: kai, status: "YES" }],
        songRequests: ["Song two"],
      });
      const secondResult = GuestRsvpResultSchema.parse(await second.json());
      expect(secondResult.rsvp.songRequests).toEqual(["Song two"]);
      expect(secondResult.rsvp.messageToHost).toBeNull();
      const kitAfter = (await db.rsvp.findUnique({ where: { guestId: kit } })) as unknown as {
        status: string;
        dietary: string[];
        accessibilityNotes: string | null;
      };
      expect(kitAfter.status).toBe("YES");
      expect(kitAfter.dietary).toEqual(["GLUTEN_FREE"]);
      expect(kitAfter.accessibilityNotes).toBe("Hearing loop");

      // Third: Kit answers without a health block → kept.
      await rsvp(event, party, { members: [{ guestId: kit, status: "YES" }] });
      const kept = (await db.rsvp.findUnique({ where: { guestId: kit } })) as unknown as {
        dietary: string[];
      };
      expect(kept.dietary).toEqual(["GLUTEN_FREE"]);

      // Fourth: an explicit "none" replaces everything that was stored.
      const fourth = GuestRsvpResultSchema.parse(
        await (
          await rsvp(event, party, {
            members: [{ guestId: kit, status: "YES", health: { dietary: ["NONE"] } }],
          })
        ).json(),
      );
      expect(fourth.party.members.find((member) => member.guestId === kit)?.healthOnFile).toBe(
        false,
      );
      const cleared = await db.$queryRaw<
        Array<{ accessibilityNotes: string | null; allergyNotes: string | null }>
      >`SELECT "accessibilityNotes", "allergyNotes" FROM "Rsvp" WHERE "guestId" = ${kit}`;
      expect(cleared[0]).toEqual({ accessibilityNotes: null, allergyNotes: null });

      const latest = await db.eventHeadcount.findFirst({
        where: { eventId: event.eventId },
        orderBy: [{ takenAt: "desc" }, { id: "desc" }],
      });
      expect(latest).toMatchObject({ adultsYes: 2, pending: 0 });
      expect(DietaryCountsSchema.parse(latest?.dietaryCountsJson).GLUTEN_FREE).toBe(0);
    });

    it("stores only what the host's RSVP settings ask for, and nothing about health for a decline", async () => {
      const event = await newEvent();
      // The host asks about food only: no access needs, no songs, no message, no contact details.
      await updateInvitationFixture(event, {
        rsvpConfigJson: {
          allowMaybe: false,
          askDietary: true,
          askAccessibility: false,
          songPrompt: "HIDDEN",
          askMessage: false,
          askContact: false,
        },
      });
      const party = await createPartyFixture(event, {
        displayName: "Minimal Family",
        guests: [{ name: "Mina Minimal" }, { name: "Milo Minimal" }],
      });
      const [mina, milo] = party.guestIds as [string, string];
      const readHealth = async (guestId: string) =>
        (await db.rsvp.findUnique({ where: { guestId } })) as unknown as {
          status: string;
          dietary: string[] | null | undefined;
          allergyNotes: string | null;
          accessibilityNotes: string | null;
          songRequests: string[];
          messageToHost: string | null;
        };

      // A client that sends more than the form shows (stale page, direct API call).
      const first = await rsvp(event, party, {
        members: [
          {
            guestId: mina,
            status: "YES",
            health: { dietary: ["VEGAN"], accessibilityNotes: "Uses a wheelchair" },
          },
          { guestId: milo, status: "YES", health: { dietary: ["HALAL"] } },
        ],
        songRequests: ["Not asked for"],
        messageToHost: "Not asked for either",
        contact: { email: "mina@test.managevent.invalid", consentGranted: true },
        healthConsent: HEALTH_CONSENT,
      });
      expect(first.status).toBe(200);
      const result = GuestRsvpResultSchema.parse(await first.json());
      expect(result.rsvp).toMatchObject({ songRequests: [], messageToHost: null });

      const minaRow = await readHealth(mina);
      expect(minaRow).toMatchObject({
        status: "YES",
        dietary: ["VEGAN"],
        accessibilityNotes: null,
        songRequests: [],
        messageToHost: null,
      });
      const guests = await db.guest.findMany({ where: { partyId: party.partyId } });
      for (const guest of guests) {
        expect(guest).toMatchObject({ email: null, phone: null, contactConsentId: null });
      }
      const consents = await db.consentRecord.findMany({
        where: { subjectType: "GUEST", subjectId: { in: [mina, milo] } },
      });
      // Health consent for the two who shared a dietary need; no contact consent at all.
      expect(consents.map((consent) => consent.purpose).sort()).toEqual([
        "HEALTH_DATA_CATERING",
        "HEALTH_DATA_CATERING",
      ]);

      // Milo now declines and (wrongly) still sends a health block: nothing about health stays.
      const second = await rsvp(event, party, {
        members: [
          {
            guestId: milo,
            status: "NO",
            health: { dietary: ["NUT_ALLERGY"], allergyNotes: "Should not be stored" },
          },
        ],
        healthConsent: HEALTH_CONSENT,
      });
      expect(second.status).toBe(200);
      const after = GuestRsvpResultSchema.parse(await second.json());
      expect(after.party.members.find((member) => member.guestId === milo)).toMatchObject({
        status: "NO",
        healthOnFile: false,
      });
      const raw = await db.$queryRaw<Array<Record<string, string | null>>>`
        SELECT "dietaryEncrypted", "allergyNotes", "allergySeverityEncrypted", "accessibilityNotes"
        FROM "Rsvp" WHERE "guestId" = ${milo}`;
      expect(raw[0]).toEqual({
        dietaryEncrypted: null,
        allergyNotes: null,
        allergySeverityEncrypted: null,
        accessibilityNotes: null,
      });
      // No new consent record: nothing was collected from the decline.
      expect(
        await db.consentRecord.count({ where: { subjectType: "GUEST", subjectId: milo } }),
      ).toBe(1);
      // Mina was not part of the second submission and is untouched.
      expect((await readHealth(mina)).dietary).toEqual(["VEGAN"]);

      const latest = await db.eventHeadcount.findUnique({
        where: { id: after.headcountSnapshotId },
      });
      expect(latest).toMatchObject({ adultsYes: 1, no: 1 });
      expect(DietaryCountsSchema.parse(latest?.dietaryCountsJson)).toMatchObject({
        VEGAN: 1,
        HALAL: 0,
        NUT_ALLERGY: 0,
      });
    });

    it("rejects submissions that break the party's rules, writing nothing", async () => {
      const event = await newEvent();
      const strict = await createPartyFixture(event, {
        displayName: "Strict Family",
        guests: [{ name: "Sam Strict" }, { name: "Sue Strict" }],
        maxSeats: 2,
        allowPlusOnes: false,
        childrenAllowed: false,
      });
      const roomy = await createPartyFixture(event, {
        displayName: "Roomy Family",
        guests: [{ name: "Ray Roomy" }],
        maxSeats: 2,
        allowPlusOnes: true,
        childrenAllowed: false,
      });
      const sam = strict.guestIds[0];
      const ray = roomy.guestIds[0];

      const cases: Array<[string, PartyFixture, unknown, Record<string, string> | undefined]> = [
        [
          "guest of another party",
          strict,
          { members: [{ guestId: ray, status: "YES" }] },
          undefined,
        ],
        [
          "unknown guest id",
          strict,
          { members: [{ guestId: generateId("gst_"), status: "YES" }] },
          undefined,
        ],
        [
          "maybe when not offered",
          strict,
          { members: [{ guestId: sam, status: "MAYBE" }] },
          undefined,
        ],
        [
          "PENDING is not an answer",
          strict,
          { members: [{ guestId: sam, status: "PENDING" }] },
          undefined,
        ],
        ["no members", strict, { members: [] }, undefined],
        [
          "same guest twice",
          strict,
          {
            members: [
              { guestId: sam, status: "YES" },
              { guestId: sam, status: "NO" },
            ],
          },
          undefined,
        ],
        [
          "plus-ones not allowed",
          strict,
          { members: [{ guestId: sam, status: "YES" }], plusOnes: [{ name: "Extra" }] },
          undefined,
        ],
        [
          "more plus-ones than seats",
          roomy,
          {
            members: [{ guestId: ray, status: "YES" }],
            plusOnes: [{ name: "One" }, { name: "Two" }],
          },
          undefined,
        ],
        [
          "child plus-one not allowed",
          roomy,
          {
            members: [{ guestId: ray, status: "YES" }],
            plusOnes: [{ name: "Kid", isChild: true }],
          },
          undefined,
        ],
        [
          "health without consent",
          strict,
          { members: [{ guestId: sam, status: "YES", health: { dietary: ["VEGAN"] } }] },
          undefined,
        ],
        [
          "severity without an allergy",
          strict,
          {
            members: [
              {
                guestId: sam,
                status: "YES",
                health: { dietary: ["VEGAN"], allergySeverity: "MILD" },
              },
            ],
            healthConsent: HEALTH_CONSENT,
          },
          undefined,
        ],
        [
          "four songs",
          strict,
          { members: [{ guestId: sam, status: "YES" }], songRequests: ["a", "b", "c", "d"] },
          undefined,
        ],
        [
          "contact without a channel",
          strict,
          { members: [{ guestId: sam, status: "YES" }], contact: { consentGranted: true } },
          undefined,
        ],
        ["missing Idempotency-Key", strict, { members: [{ guestId: sam, status: "YES" }] }, {}],
        [
          "short Idempotency-Key",
          strict,
          { members: [{ guestId: sam, status: "YES" }] },
          { "idempotency-key": "short" },
        ],
      ];
      for (const [label, party, body, headers] of cases) {
        const res = await api.json(
          "POST",
          linkPath(event, party, "/rsvp"),
          body,
          headers ?? { "idempotency-key": idemKey() },
        );
        expect(res.status, label).toBe(400);
        expect(((await res.json()) as ErrorBody).error.code, label).toBe("VALIDATION_ERROR");
      }

      const malformed = await api.request(linkPath(event, strict, "/rsvp"), {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idemKey() },
        body: "{not json",
      });
      expect(malformed.status).toBe(400);

      const guestIds = [...strict.guestIds, ...roomy.guestIds];
      expect(await db.rsvp.count({ where: { guestId: { in: guestIds } } })).toBe(0);
      expect(
        await db.guest.count({ where: { partyId: { in: [strict.partyId, roomy.partyId] } } }),
      ).toBe(3);
      expect(await db.eventHeadcount.count({ where: { eventId: event.eventId } })).toBe(0);
      expect(jobsFor(event)).toHaveLength(0);

      // Exactly filling the seats is fine, and a later plus-one no longer fits.
      const fill = await rsvp(event, roomy, {
        members: [{ guestId: ray, status: "YES" }],
        plusOnes: [{ name: "Fits" }],
      });
      expect(fill.status).toBe(200);
      const overflow = await rsvp(event, roomy, {
        members: [{ guestId: ray, status: "YES" }],
        plusOnes: [{ name: "Does not fit" }],
      });
      expect(overflow.status).toBe(400);
    });

    it("accepts MAYBE when the host allows it", async () => {
      const event = await newEvent();
      await updateInvitationFixture(event, {
        rsvpConfigJson: {
          allowMaybe: true,
          askDietary: true,
          askAccessibility: true,
          songPrompt: "STANDARD",
          askMessage: true,
          askContact: false,
        },
      });
      const party = await createPartyFixture(event, {
        displayName: "Maybe Family",
        guests: [{ name: "May Maybe" }],
      });
      const res = await rsvp(event, party, {
        members: [{ guestId: party.guestIds[0], status: "MAYBE" }],
      });
      expect(res.status).toBe(200);
      const result = GuestRsvpResultSchema.parse(await res.json());
      expect(result.party.members[0]?.status).toBe("MAYBE");
      const snapshot = await db.eventHeadcount.findUnique({
        where: { id: result.headcountSnapshotId },
      });
      expect(snapshot).toMatchObject({ maybe: 1, adultsYes: 0, pending: 0 });
    });

    it("answers 409 RSVP_CLOSED after the deadline and once the event has started", async () => {
      const startsAt = new Date(Date.now() + 30 * DAY_MS);
      const deadline = new Date(Date.now() + 10 * DAY_MS);
      const event = await newEvent({ startsAt, rsvpDeadline: deadline });
      const party = await createPartyFixture(event, {
        displayName: "Late Family",
        guests: [{ name: "Lou Late" }],
      });
      const body = { members: [{ guestId: party.guestIds[0], status: "YES" }] };

      // Before the deadline: accepted.
      const key = idemKey();
      expect((await rsvp(event, party, body, key)).status).toBe(200);

      api.setNow(new Date(deadline.getTime() + 1000));
      const late = await rsvp(event, party, body);
      expect(late.status).toBe(409);
      expect(((await late.json()) as ErrorBody).error.code).toBe("RSVP_CLOSED");
      const closedView = GuestInvitationViewSchema.parse(
        await (await api.request(linkPath(event, party))).json(),
      );
      expect(closedView.rsvp.state).toBe("CLOSED");
      expect(closedView.event.phase).toBe("UPCOMING");
      // A retry of the submission that was accepted in time still replays.
      const replay = await rsvp(event, party, body, key);
      expect(replay.status).toBe(200);
      expect(GuestRsvpResultSchema.parse(await replay.json()).replayed).toBe(true);

      // No deadline, but the event has started.
      const started = await newEvent({ startsAt });
      const startedParty = await createPartyFixture(started, {
        displayName: "Started Family",
        guests: [{ name: "Stu Started" }],
      });
      api.setNow(new Date(startsAt.getTime() + 60_000));
      const afterStart = await rsvp(started, startedParty, {
        members: [{ guestId: startedParty.guestIds[0], status: "YES" }],
      });
      expect(afterStart.status).toBe(409);
      expect(((await afterStart.json()) as ErrorBody).error.code).toBe("RSVP_CLOSED");
      expect(await db.rsvp.count({ where: { guestId: { in: startedParty.guestIds } } })).toBe(0);

      api.setNow(new Date(startsAt.getTime() + 6 * 60 * 60 * 1000));
      const pastView = GuestInvitationViewSchema.parse(
        await (await api.request(linkPath(started, startedParty))).json(),
      );
      expect(pastView.event.phase).toBe("PAST");
      expect(pastView.rsvp.state).toBe("CLOSED");
    });

    it("refuses every write on a sample invitation with 403 DEMO_READ_ONLY", async () => {
      const party = await createPartyFixture(demo, {
        displayName: "Sample Guest Family",
        guests: [{ name: "Sample Guest" }],
      });
      const view = GuestInvitationViewSchema.parse(
        await (await api.request(linkPath(demo, party))).json(),
      );
      expect(view.demo).toBe(true);
      expect(view.rsvp.state).toBe("READ_ONLY");

      const write = await rsvp(demo, party, {
        members: [{ guestId: party.guestIds[0], status: "YES" }],
      });
      expect(write.status).toBe(403);
      expect(((await write.json()) as ErrorBody).error.code).toBe("DEMO_READ_ONLY");

      const wish = await api.json("POST", linkPath(demo, party, "/wishes"), {
        authorName: "Sample",
        message: "Hello",
      });
      expect(wish.status).toBe(403);
      expect(((await wish.json()) as ErrorBody).error.code).toBe("DEMO_READ_ONLY");

      // Reading passes on a sample issues nothing either.
      const passes = GuestPassesViewSchema.parse(
        await (await api.request(linkPath(demo, party, "/passes"))).json(),
      );
      expect(passes).toMatchObject({ enabled: true, passes: [] });

      expect(await db.rsvp.count({ where: { guestId: { in: party.guestIds } } })).toBe(0);
      expect(await db.wellEntry.count({ where: { invitationId: demo.invitationId } })).toBe(0);
      expect(await db.pass.count({ where: { partyId: party.partyId } })).toBe(0);
      expect(await db.eventHeadcount.count({ where: { eventId: demo.eventId } })).toBe(0);
    });
  });

  // ─── Passes ───────────────────────────────────────────────────────────────

  describe("passes", () => {
    it("issues one signed pass per attending guest and revokes it when they decline", async () => {
      const party = await createPartyFixture(premium, {
        displayName: "Pass Family",
        guests: [{ name: "Pia Pass" }, { name: "Pax Pass", isChild: true }, { name: "Pol Pass" }],
        tableLabel: "Table 9",
      });
      const [pia, pax, pol] = party.guestIds as [string, string, string];

      const result = GuestRsvpResultSchema.parse(
        await (
          await rsvp(premium, party, {
            members: [
              { guestId: pia, status: "YES" },
              { guestId: pax, status: "YES" },
              { guestId: pol, status: "NO" },
            ],
          })
        ).json(),
      );
      expect(result.passes.map((pass) => pass.guestId).sort()).toEqual([pia, pax].sort());
      for (const pass of result.passes) {
        expect(pass.qr).toMatch(/^MV1\.pass_[0-9a-f-]{36}\.[A-Za-z0-9_-]{32}$/);
        expect(pass.checkedInAt).toBeNull();
        const parsed = verifyPassQr(pass.qr);
        expect(parsed?.passId).toBe(pass.passId);
        expect(
          isPassSignatureValid(premium.salt, pass.passId, premium.eventId, parsed?.sig ?? ""),
        ).toBe(true);
        // The signature is bound to this event.
        expect(isPassSignatureValid(free.salt, pass.passId, free.eventId, parsed?.sig ?? "")).toBe(
          false,
        );
        // The QR carries no name and no link.
        expect(pass.qr).not.toContain(party.token);
        expect(pass.qr.toLowerCase()).not.toContain("pass-family");
      }
      const stored = await db.pass.findMany({ where: { partyId: party.partyId } });
      expect(stored).toHaveLength(2);
      for (const row of stored) {
        const dto = result.passes.find((pass) => pass.passId === row.id);
        expect(dto?.qr.endsWith(`.${row.qrPayloadSig}`)).toBe(true);
        expect(row.revokedAt).toBeNull();
      }

      const view = GuestPassesViewSchema.parse(
        await (await api.request(linkPath(premium, party, "/passes"))).json(),
      );
      expect(view).toMatchObject({
        enabled: true,
        themeId: "royal-ivory",
        experienceMode: "CELEBRATION",
        party: { displayName: "Pass Family", tableLabel: "Table 9" },
        event: { title: "Test Event", timeZone: "Australia/Perth", venueName: "Test Hall" },
      });
      expect(view.passes.map((pass) => pass.passId).sort()).toEqual(
        result.passes.map((pass) => pass.passId).sort(),
      );
      expect(view.passes.find((pass) => pass.guestId === pax)).toMatchObject({
        guestName: "Pax Pass",
        isChild: true,
      });
      // Reading passes does not mint new ones.
      expect(await db.pass.count({ where: { partyId: party.partyId } })).toBe(2);

      // Pia declines, Pol now comes: Pia's pass is revoked, Pol gets one, Pax keeps theirs.
      const paxPassId = result.passes.find((pass) => pass.guestId === pax)?.passId;
      const changed = GuestRsvpResultSchema.parse(
        await (
          await rsvp(premium, party, {
            members: [
              { guestId: pia, status: "NO" },
              { guestId: pol, status: "YES" },
            ],
          })
        ).json(),
      );
      expect(changed.passes.map((pass) => pass.guestId).sort()).toEqual([pax, pol].sort());
      expect(changed.passes.find((pass) => pass.guestId === pax)?.passId).toBe(paxPassId);
      const piaPasses = await db.pass.findMany({ where: { guestId: pia } });
      expect(piaPasses).toHaveLength(1);
      expect(piaPasses[0]?.revokedAt).not.toBeNull();
    });

    it("issues a missing pass lazily when the guest opens the pass page", async () => {
      const party = await createPartyFixture(premium, {
        displayName: "Lazy Family",
        guests: [{ name: "Lea Lazy" }, { name: "Lex Lazy" }],
      });
      const [lea, lex] = party.guestIds as [string, string];
      // A YES answer recorded outside the guest flow (for example a host entry), with no pass yet.
      await db.rsvp.create({
        data: {
          id: generateId("rsvp_"),
          guestId: lea,
          status: "YES",
          respondedAt: new Date(),
          source: "HOST_ENTRY",
          idempotencyKey: `host-${uniqueTestSuffix()}:${lea}`,
          songRequests: [],
        },
      });
      const first = GuestPassesViewSchema.parse(
        await (await api.request(linkPath(premium, party, "/passes"))).json(),
      );
      expect(first.passes.map((pass) => pass.guestId)).toEqual([lea]);
      const again = GuestPassesViewSchema.parse(
        await (await api.request(linkPath(premium, party, "/passes"))).json(),
      );
      expect(again.passes).toEqual(first.passes);
      expect(await db.pass.count({ where: { partyId: party.partyId } })).toBe(1);
      expect(await db.pass.count({ where: { guestId: lex } })).toBe(0);
    });

    it("reports passes as not enabled on a plan without them", async () => {
      const party = await createPartyFixture(free, {
        displayName: "Free Family",
        guests: [{ name: "Fay Free" }],
      });
      await rsvp(free, party, { members: [{ guestId: party.guestIds[0], status: "YES" }] });
      const view = GuestPassesViewSchema.parse(
        await (await api.request(linkPath(free, party, "/passes"))).json(),
      );
      expect(view.enabled).toBe(false);
      expect(view.passes).toEqual([]);
      expect(await db.pass.count({ where: { partyId: party.partyId } })).toBe(0);
    });
  });

  // ─── Calendar ─────────────────────────────────────────────────────────────

  describe("calendar", () => {
    it("returns one UTC VEVENT with folded CRLF lines, the invite link and no guest name", async () => {
      const startsAt = new Date("2031-03-06T08:00:00.000Z");
      const event = await newEvent({ startsAt });
      await db.event.update({
        where: { id: event.eventId },
        data: { title: { en: "Sara & Ali; a wedding, in Perth" } },
      });
      await updateInvitationFixture(event, {
        contentJson: {
          version: 1,
          headline:
            "Together with their families, Sara and Ali invite you to celebrate their wedding day",
          subheadline: "",
          hosts: "The Rahimi and Karimi families",
          wording: "",
          story: [],
          schedule: [],
          venue: { name: "Fraser's, Kings Park", address: "60 Fraser Avenue; West Perth WA 6005" },
          faq: [],
          coverImageUrl: null,
          galleryImageUrls: [],
          music: { enabled: false, url: null, title: null, rightsAttested: false },
        },
      });
      const party = await createPartyFixture(event, {
        displayName: "Calendar Family",
        guests: [{ name: "Cal Calendar" }],
      });

      const res = await api.request(linkPath(event, party, "/calendar"));
      expect(res.status).toBe(200);
      const calendar = GuestCalendarSchema.parse(await res.json());
      expect(calendar.filename).toBe(`${event.eventSlug}.ics`);

      const { ics } = calendar;
      expect(ics.endsWith("\r\n")).toBe(true);
      expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
      const physical = ics.split("\r\n");
      for (const line of physical) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
      // The long description really was folded.
      expect(physical.some((line) => line.startsWith(" "))).toBe(true);

      const lines = ics.replace(/\r\n /g, "").split("\r\n");
      const inviteUrl = `${getPublicAppUrl("INVITATION")}/i/${event.eventSlug}/${party.token}`;
      expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
      expect(lines).toContain(`UID:${event.eventId}-${party.partyId}@managevent.com.au`);
      expect(lines).toContain("DTSTART:20310306T080000Z");
      expect(lines).toContain("DTEND:20310306T130000Z");
      expect(lines).toContain("SUMMARY:Sara & Ali\\; a wedding\\, in Perth");
      expect(lines).toContain(
        "LOCATION:Fraser's\\, Kings Park\\, 60 Fraser Avenue\\; West Perth WA 6005",
      );
      expect(lines).toContain(`URL:${inviteUrl}`);
      const description = lines.find((line) => line.startsWith("DESCRIPTION:")) ?? "";
      expect(description).toContain(inviteUrl);
      expect(description).toContain("\\n\\n");
      // Never the guest's or the party's name.
      expect(ics).not.toContain("Cal Calendar");
      expect(ics).not.toContain("Calendar Family");
    });
  });

  // ─── Wishes ───────────────────────────────────────────────────────────────

  describe("wishes", () => {
    it("stores entries as PENDING, replays by key, and shows only approved wall entries", async () => {
      const event = await newEvent({ wellMode: "WISHING_WELL" });
      const party = await createPartyFixture(event, {
        displayName: "Wishing Family",
        guests: [{ name: "Wim Wishing" }],
      });
      const other = await createPartyFixture(event, {
        displayName: "Reader Family",
        guests: [{ name: "Rex Reader" }],
      });
      const path = linkPath(event, party, "/wishes");

      const key = idemKey();
      const wallRes = await api.json(
        "POST",
        path,
        { authorName: "  Wim  ", message: "  Wishing you every happiness.  ", shareOnWall: true },
        { "idempotency-key": key },
      );
      expect(wallRes.status).toBe(201);
      const wall = GuestWishResultSchema.parse(await wallRes.json());
      expect(wall).toMatchObject({ moderation: "PENDING", visibility: "WALL" });
      expect(wall.id).toMatch(/^wel_/);

      const replay = await api.json(
        "POST",
        path,
        { authorName: "Wim", message: "A different body", shareOnWall: false },
        { "idempotency-key": key },
      );
      expect(replay.status).toBe(200);
      expect(GuestWishResultSchema.parse(await replay.json())).toEqual(wall);

      const privateRes = await api.json("POST", path, {
        authorName: "Wim",
        message: "For your eyes only: thank you for everything.",
      });
      expect(privateRes.status).toBe(201);
      const hidden = GuestWishResultSchema.parse(await privateRes.json());
      expect(hidden).toMatchObject({ moderation: "PENDING", visibility: "HOSTS_ONLY" });

      expect(await db.wellEntry.count({ where: { invitationId: event.invitationId } })).toBe(2);

      // A hosts-only message is ciphertext at rest; a wall message is stored as written.
      const rawRows = await db.$queryRaw<
        Array<{ id: string; message: string; authorName: string }>
      >`
        SELECT "id", "message", "authorName" FROM "WellEntry" WHERE "invitationId" = ${event.invitationId}`;
      const rawHidden = rawRows.find((row) => row.id === hidden.id);
      expect(rawHidden?.message.startsWith(ENCRYPTION_PREFIX)).toBe(true);
      expect(rawHidden?.message).not.toContain("eyes only");
      const rawWall = rawRows.find((row) => row.id === wall.id);
      expect(rawWall).toMatchObject({ message: "Wishing you every happiness.", authorName: "Wim" });

      // Pending entries are not shown to anyone with a link.
      const readerPath = linkPath(event, other);
      const before = GuestInvitationViewSchema.parse(await (await api.request(readerPath)).json());
      expect(before.features.wishesEnabled).toBe(true);
      expect(before.wishes).toEqual([]);

      // Approving both: only the one shared on the wall appears.
      await db.wellEntry.updateMany({
        where: { id: { in: [wall.id, hidden.id] } },
        data: { moderation: "APPROVED" },
      });
      const after = GuestInvitationViewSchema.parse(await (await api.request(readerPath)).json());
      expect(after.wishes).toHaveLength(1);
      expect(after.wishes[0]).toMatchObject({
        id: wall.id,
        authorName: "Wim",
        message: "Wishing you every happiness.",
      });
      expect(JSON.stringify(after)).not.toContain("eyes only");

      // Rejected and removed entries disappear again.
      await db.wellEntry.update({ where: { id: wall.id }, data: { moderation: "REJECTED" } });
      const rejected = GuestInvitationViewSchema.parse(
        await (await api.request(readerPath)).json(),
      );
      expect(rejected.wishes).toEqual([]);

      const invalid = await api.json("POST", path, { authorName: "", message: "   " });
      expect(invalid.status).toBe(400);
    });

    it("answers 409 CONFLICT when the invitation has no well, and caps entries per party", async () => {
      const closed = await createPartyFixture(free, {
        displayName: "No Well Family",
        guests: [{ name: "Noa Nowell" }],
      });
      const none = await api.json("POST", linkPath(free, closed, "/wishes"), {
        authorName: "Noa",
        message: "Hello",
      });
      expect(none.status).toBe(409);
      expect(((await none.json()) as ErrorBody).error.code).toBe("CONFLICT");

      const event = await newEvent({ wellMode: "TRIBUTE_BOOK", experienceMode: "MEMORIAL" });
      const party = await createPartyFixture(event, {
        displayName: "Tribute Family",
        guests: [{ name: "Tess Tribute" }],
      });
      const path = linkPath(event, party, "/wishes");
      for (let i = 0; i < 20; i += 1) {
        const res = await api.json("POST", path, {
          authorName: "Tess",
          message: `Memory ${i + 1}`,
        });
        expect(res.status, `entry ${i + 1}`).toBe(201);
      }
      const over = await api.json("POST", path, { authorName: "Tess", message: "One more" });
      expect(over.status).toBe(429);
      expect(((await over.json()) as ErrorBody).error.code).toBe("RATE_LIMITED");
      expect(await db.wellEntry.count({ where: { partyId: party.partyId } })).toBe(20);

      const view = GuestInvitationViewSchema.parse(
        await (await api.request(linkPath(event, party))).json(),
      );
      expect(view.event.experienceMode).toBe("MEMORIAL");
      expect(view.invitation.well).toEqual({ mode: "TRIBUTE_BOOK" });
      expect(view.invitation.rsvpConfig.songPrompt).toBe("HIDDEN");
    });
  });

  describe("wishes sent together", () => {
    it("holds the limit of 20 entries per party when several arrive at once", async () => {
      const event = await newEvent({ wellMode: "WISHING_WELL" });
      const party = await createPartyFixture(event, {
        displayName: "Many Wishes Family",
        guests: [{ name: "Mia Many" }],
      });
      const path = linkPath(event, party, "/wishes");
      for (let i = 0; i < 19; i += 1) {
        const res = await api.json("POST", path, { authorName: "Mia", message: `Wish ${i + 1}` });
        expect(res.status).toBe(201);
      }

      // One place left, ten posts in flight. Locally the gap between "count" and "insert" is a
      // fraction of a millisecond, so this app's database client answers a count on the shared
      // client late: every request that counts outside the party lock sees room before any of
      // them has inserted. Counting under the lock (inside the transaction) is unaffected.
      const slowCount = async (...args: Parameters<typeof db.wellEntry.count>) => {
        const total = await db.wellEntry.count(...args);
        await new Promise((resolve) => setTimeout(resolve, 60));
        return total;
      };
      const slowDb = new Proxy(db, {
        get(target, property) {
          if (property === "wellEntry") {
            return new Proxy(target.wellEntry, {
              get(model, key) {
                if (key === "count") return slowCount;
                const value: unknown = Reflect.get(model, key);
                return typeof value === "function" ? value.bind(model) : value;
              },
            });
          }
          const value: unknown = Reflect.get(target, property);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      const racing = createApiApp({
        deps: { db: slowDb, queue: new InMemoryJobQueue() },
        resolveActor: async () => null,
        disableRateLimits: true,
      });
      const burst = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          racing.request(path, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ authorName: "Mia", message: `Burst ${i + 1}` }),
          }),
        ),
      );
      const statuses = burst.map((res) => res.status).sort();
      expect(statuses).toEqual([201, ...Array<number>(9).fill(429)]);
      expect(await db.wellEntry.count({ where: { partyId: party.partyId } })).toBe(20);
    });
  });

  // ─── Demos and legacy links ───────────────────────────────────────────────

  describe("public demos and legacy links", () => {
    it("lists published sample invitations with a working guest link", async () => {
      await createPartyFixture(demo, {
        displayName: "Listed Sample Family",
        guests: [{ name: "Sample One" }],
      });
      const hiddenDemo = await newEvent({ isDemo: true, published: false });
      await createPartyFixture(hiddenDemo, {
        displayName: "Unpublished Sample",
        guests: [{ name: "Sample Two" }],
      });

      const res = await api.request("/v1/public/demos");
      expect(res.status).toBe(200);
      const list = DemoListSchema.parse(await res.json());
      const mine = list.items.find((item) => item.eventSlug === demo.eventSlug);
      expect(mine).toMatchObject({
        templateSlug: "royal-classic",
        themeId: "royal-ivory",
        experienceMode: "CELEBRATION",
        title: "Test Event",
        hosts: "The Test family",
        headline: "Test Event",
      });
      // The token it advertises resolves (the first active party of the sample).
      const status = await api.request(`/v1/i/${demo.eventSlug}/${mine?.guestToken}/status`);
      expect(status.status).toBe(200);

      const slugs = list.items.map((item) => item.eventSlug);
      expect(slugs).not.toContain(hiddenDemo.eventSlug);
      // Ordinary events are never listed.
      expect(slugs).not.toContain(free.eventSlug);
      expect(slugs).not.toContain(premium.eventSlug);
      expect(JSON.stringify(list)).not.toContain(demo.salt);
    });

    it("resolves an imported legacy path to the live link, and 404s everything else", async () => {
      const party = await createPartyFixture(free, {
        displayName: "Legacy Family",
        guests: [{ name: "Lena Legacy" }],
      });
      const legacySlug = `legacy-${uniqueTestSuffix()}`;
      await db.legacySlug.create({
        data: {
          id: generateId("lgs_"),
          legacyPath: `/anniversary/${legacySlug}`,
          partyId: party.partyId,
          source: "APPILICO_ANNIVERSARY",
        },
      });

      for (const path of [
        `/anniversary/${legacySlug}`,
        `anniversary/${legacySlug}/`,
        `/legacy/anniversary/${legacySlug}?utm_source=whatsapp`,
      ]) {
        const res = await api.json("POST", "/v1/public/legacy/resolve", { path });
        expect(res.status, path).toBe(200);
        expect(await res.json()).toEqual({ eventSlug: free.eventSlug, guestToken: party.token });
      }

      for (const path of [
        `/anniversary/${legacySlug}x`,
        "/anniversary/../etc",
        "/e/unknown/unknown",
      ]) {
        const res = await api.json("POST", "/v1/public/legacy/resolve", { path });
        expect(res.status, path).toBe(404);
      }
      const invalid = await api.json("POST", "/v1/public/legacy/resolve", { path: "" });
      expect(invalid.status).toBe(400);

      // A revoked link no longer resolves.
      await db.party.update({ where: { id: party.partyId }, data: { tokenRevokedAt: new Date() } });
      const revoked = await api.json("POST", "/v1/public/legacy/resolve", {
        path: `/anniversary/${legacySlug}`,
      });
      expect(revoked.status).toBe(404);
    });
  });
});
