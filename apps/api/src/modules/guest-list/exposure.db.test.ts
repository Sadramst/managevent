/**
 * Who may see what of a guest list, across the host routes.
 *
 * Two kinds of caller hold `guest:read` without being trusted with everything:
 * - rostered door crew (`CHECKIN_CREW`, roster scope): the matrix limits them to names, tables and
 *   flags, which is what the check-in roster returns. They must not reach any host route.
 * - a VIEWER co-host: read only. A guest link is a credential that writes RSVPs, so it is not
 *   part of what they read, and neither are dietary counts (no `health:read`).
 *
 * Runs on the real database; every row is created here and removed in `afterAll`.
 */
import type { AuthActor } from "@managevent/auth";
import { db, generateId } from "@managevent/db";
import {
  CheckInRosterSchema,
  HostEventDetailSchema,
  HostPartyListSchema,
  ResponsesSummarySchema,
} from "@managevent/validators";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dbAvailable } from "../../test/db.js";
import { parseCsv } from "./csv.js";
import { createTestApi, HostWorld, type PartySeed } from "./test-fixtures.js";

type ErrorBody = { error: { code: string } };

const ALLERGY_NOTE = "EXPOSURE-NOTE carries an adrenaline pen";
const ACCESS_NOTE = "EXPOSURE-ACCESS wheelchair user";
const GUEST_EMAIL = "exposure-guest@example.com";
const HOST_MESSAGE = "EXPOSURE-MESSAGE see you there";

describe.skipIf(!dbAvailable)("guest data exposure (database)", () => {
  const world = new HostWorld();
  const api = createTestApi();
  let event: Awaited<ReturnType<HostWorld["createEvent"]>>;
  let party: PartySeed;
  let crew: AuthActor & { userId: string };
  let viewer: AuthActor & { userId: string };
  let editor: AuthActor & { userId: string };
  const base = () => `/v1/events/${event.eventId}`;

  beforeAll(async () => {
    // Starts in two hours: inside the crew roster window (event day ±1).
    event = await world.createEvent({
      plan: "PREMIUM",
      startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
    party = await world.seedParty(event, {
      displayName: "Exposure Family",
      tableLabel: "Table 9",
      guests: [{ name: "Exposed Guest", email: GUEST_EMAIL }, { name: "Second Guest" }],
    });
    await world.seedRsvp(party.guestIds[0] as string, {
      status: "YES",
      dietary: ["NUT_ALLERGY"],
      allergySeverity: "SEVERE_ANAPHYLAXIS",
      allergyNotes: ALLERGY_NOTE,
      accessibilityNotes: ACCESS_NOTE,
      messageToHost: HOST_MESSAGE,
    });

    crew = await world.createUser(["CHECKIN_CREW"]);
    await db.crewRoster.create({
      data: {
        id: generateId("rst_"),
        eventId: event.eventId,
        userId: crew.userId,
        role: "DOOR",
        shiftStart: new Date(),
        shiftEnd: new Date(Date.now() + 6 * 60 * 60 * 1000),
        deviceIds: [],
      },
    });
    viewer = await world.addCoHost(event, "VIEWER");
    editor = await world.addCoHost(event, "EDITOR");
  });

  afterAll(async () => {
    await world.cleanup();
  });

  const SECRETS = () => [party.token, GUEST_EMAIL, ALLERGY_NOTE, ACCESS_NOTE, HOST_MESSAGE];

  describe("rostered door crew", () => {
    it("can use the check-in roster, which shows flags and never notes or contact details", async () => {
      const res = await api.call(crew, "GET", `${base()}/check-in`);
      expect(res.status).toBe(200);
      const text = await res.text();
      const roster = CheckInRosterSchema.parse(JSON.parse(text));
      const guest = roster.guests.find((entry) => entry.guestId === party.guestIds[0]);
      expect(guest).toMatchObject({
        name: "Exposed Guest",
        tableLabel: "Table 9",
        severeAllergy: true,
        dietaryFlags: ["NUT_ALLERGY"],
      });
      for (const secret of SECRETS()) expect(text).not.toContain(secret);
    });

    it("is refused on every host route, and none of them hands over guest data", async () => {
      const routes: Array<[string, string, unknown?]> = [
        ["GET", `${base()}/parties`],
        ["GET", `${base()}/guests/export.csv`],
        ["GET", `${base()}/guests/export.csv?includeHealth=true`],
        ["GET", `${base()}/responses`],
        ["GET", `${base()}/responses/dietary`],
        ["GET", `${base()}`],
        ["GET", `${base()}/plan`],
        ["GET", `${base()}/messaging`],
        ["GET", `${base()}/well-entries`],
        ["POST", `${base()}/parties`, { displayName: "Crew Party" }],
        [
          "PUT",
          `${base()}/parties/${party.partyId}/rsvp`,
          { members: [{ guestId: party.guestIds[0], status: "NO" }] },
        ],
      ];
      for (const [method, path, body] of routes) {
        const res = await api.call(crew, method, path, body);
        const text = await res.text();
        expect(res.status, `${method} ${path}`).toBe(403);
        expect((JSON.parse(text) as ErrorBody).error.code).toBe("FORBIDDEN");
        for (const secret of SECRETS()) expect(text, `${method} ${path}`).not.toContain(secret);
      }
      // Nothing was exported or read on their behalf.
      expect(
        await db.auditLog.count({
          where: { actorUserId: crew.userId, action: { in: ["guest.export", "health.read"] } },
        }),
      ).toBe(0);
    });

    it("cannot preview a draft through a guest link either", async () => {
      const draft = await world.createEvent({
        published: false,
        startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });
      const draftParty = await world.seedParty(draft, {
        displayName: "Draft Family",
        guests: [{ name: "Draft Guest" }],
      });
      await db.crewRoster.create({
        data: {
          id: generateId("rst_"),
          eventId: draft.eventId,
          userId: crew.userId,
          role: "DOOR",
          shiftStart: new Date(),
          shiftEnd: new Date(Date.now() + 6 * 60 * 60 * 1000),
          deviceIds: [],
        },
      });
      const link = `/v1/i/${draft.eventSlug}/${draftParty.token}`;
      expect((await api.call(crew, "GET", link)).status).toBe(404);
      // The owner still gets the preview.
      expect((await api.call(draft.owner, "GET", link)).status).toBe(200);
    });
  });

  describe("a VIEWER co-host", () => {
    it("reads the guest list without any guest link", async () => {
      const res = await api.call(viewer, "GET", `${base()}/parties`);
      expect(res.status).toBe(200);
      const text = await res.text();
      const list = HostPartyListSchema.parse(JSON.parse(text));
      expect(list.items).toHaveLength(1);
      expect(list.items[0]).toMatchObject({
        displayName: "Exposure Family",
        token: null,
        invitePath: null,
      });
      // Read-only data is still there.
      expect(list.items[0]?.guests[0]).toMatchObject({ name: "Exposed Guest", email: GUEST_EMAIL });
      expect(text).not.toContain(party.token);

      // Callers who may write to the guest list do get the link.
      for (const actor of [event.owner, editor]) {
        const full = HostPartyListSchema.parse(
          await (await api.call(actor, "GET", `${base()}/parties`)).json(),
        );
        expect(full.items[0]).toMatchObject({
          token: party.token,
          invitePath: `/i/${event.eventSlug}/${party.token}`,
        });
      }
    });

    it("gets a CSV export with the Invite Path column blank", async () => {
      const res = await api.call(viewer, "GET", `${base()}/guests/export.csv`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).not.toContain(party.token);
      const rows = parseCsv(text);
      const column = (rows[0] ?? []).indexOf("Invite Path");
      expect(column).toBeGreaterThan(-1);
      expect(rows.slice(1).map((row) => row[column])).toEqual(["", ""]);

      const owner = parseCsv(
        await (await api.call(event.owner, "GET", `${base()}/guests/export.csv`)).text(),
      );
      expect(owner[1]?.[column]).toBe(`/i/${event.eventSlug}/${party.token}`);
    });

    it("gets the event without a preview path, which would carry a live guest token", async () => {
      const res = await api.call(viewer, "GET", base());
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(HostEventDetailSchema.parse(JSON.parse(text)).invitation.previewPath).toBeNull();
      expect(text).not.toContain(party.token);

      const owner = HostEventDetailSchema.parse(
        await (await api.call(event.owner, "GET", base())).json(),
      );
      expect(owner.invitation.previewPath).toBe(`/i/${event.eventSlug}/${party.token}`);
    });

    it("therefore has no way to answer for a party: host entry is refused and no link is known", async () => {
      const hostEntry = await api.call(viewer, "PUT", `${base()}/parties/${party.partyId}/rsvp`, {
        members: [{ guestId: party.guestIds[0], status: "NO" }],
      });
      expect(hostEntry.status).toBe(403);

      // Everything the viewer can read, in one haystack: the token is in none of it.
      const haystack = (
        await Promise.all(
          [
            `${base()}/parties`,
            `${base()}/guests/export.csv`,
            `${base()}`,
            `${base()}/responses`,
            `${base()}/messaging`,
            `${base()}/plan`,
            "/v1/events",
          ].map(async (path) => (await api.call(viewer, "GET", path)).text()),
        )
      ).join("\n");
      expect(haystack).not.toContain(party.token);
      const rsvp = await db.rsvp.findUniqueOrThrow({
        where: { guestId: party.guestIds[0] as string },
      });
      expect(rsvp.status).toBe("YES");
    });

    it("sees response totals but no dietary or severe-allergy counts", async () => {
      const res = await api.call(viewer, "GET", `${base()}/responses`);
      expect(res.status).toBe(200);
      const summary = ResponsesSummarySchema.parse(await res.json());
      expect(summary.totals).toMatchObject({ guests: 2, adultsYes: 1, pending: 1 });
      expect(Object.values(summary.dietaryCounts).every((count) => count === 0)).toBe(true);
      expect(summary.severeAllergyCount).toBe(0);

      // With health:read the same route carries the counts.
      for (const actor of [event.owner, editor]) {
        const full = ResponsesSummarySchema.parse(
          await (await api.call(actor, "GET", `${base()}/responses`)).json(),
        );
        expect(full.dietaryCounts.NUT_ALLERGY).toBe(1);
        expect(full.severeAllergyCount).toBe(1);
      }
    });
  });

  describe("staff", () => {
    it("have their read of the dietary counts on the summary recorded", async () => {
      const staff = await world.createUser(["PLANNER_STAFF"]);
      const res = await api.call(staff, "GET", `${base()}/responses`, undefined, {
        "x-forwarded-for": "203.0.113.61",
      });
      expect(res.status).toBe(200);
      expect(ResponsesSummarySchema.parse(await res.json()).dietaryCounts.NUT_ALLERGY).toBe(1);
      const audit = await db.auditLog.findMany({
        where: { actorUserId: staff.userId, action: "health.read" },
      });
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        entity: "Event",
        entityId: event.eventId,
        ip: "203.0.113.61",
        diffJson: { via: "responses.summary", detail: "counts" },
      });
    });
  });
});
