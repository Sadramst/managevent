/**
 * Host events against the real database: create, list, read, edit, delete, ownership isolation,
 * invitation gating, optimistic concurrency, slug rules and publishing.
 *
 * Every row is created by this file with fresh ids and removed in `afterAll`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, generateId } from "@managevent/db";
import {
  ApiErrorSchema,
  type HostEventDetail,
  HostEventDetailSchema,
  HostEventListSchema,
  type InvitationContent,
} from "@managevent/validators";
import { createEventFixture, dbAvailable, type EventFixture } from "../../test/db.js";
import { createHostTestApp, createTestUser, jsonRequest, type TestUser } from "../../test/hosts.js";

const USR_ID = /^usr_[0-9a-f-]{36}$/;
const EVT_ID = /^evt_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe.skipIf(!dbAvailable)("host events (database)", () => {
  const { app, actAs } = createHostTestApp();
  let hostA: TestUser;
  let hostB: TestUser;
  let asA: Record<string, string>;
  let asB: Record<string, string>;
  let demo: EventFixture;

  let wedding: HostEventDetail;
  let memorial: HostEventDetail;

  const weddingInput = {
    title: "Anna and Tom",
    ceremonySlug: "wedding",
    startsAtLocal: "2031-03-15T16:00",
    endsAtLocal: "2031-03-15T23:00",
    templateSlug: "royal-classic",
    hosts: "Together with their families",
    venue: { name: "Town Hall", address: "1 Main Street, Perth WA" },
  };

  async function errorOf(res: Response) {
    return ApiErrorSchema.parse(await res.json()).error;
  }

  async function detailOf(res: Response): Promise<HostEventDetail> {
    return HostEventDetailSchema.parse(await res.json());
  }

  function patchInvitation(eventId: string, body: unknown, headers = asA) {
    return app.request(`/v1/events/${eventId}/invitation`, jsonRequest("PATCH", body, headers));
  }

  beforeAll(async () => {
    hostA = await createTestUser();
    hostB = await createTestUser();
    asA = actAs(hostA);
    asB = actAs(hostB);
    demo = await createEventFixture({ isDemo: true, plan: "PREMIUM" });
    expect(hostA.id).toMatch(USR_ID);
  });

  afterAll(async () => {
    await hostA?.cleanup();
    await hostB?.cleanup();
    await demo?.cleanup();
  });

  it("requires a session", async () => {
    for (const res of [
      await app.request("/v1/events"),
      await app.request("/v1/events", jsonRequest("POST", weddingInput)),
      await app.request(`/v1/events/${generateId("evt_")}`),
    ]) {
      expect(res.status).toBe(401);
      expect((await errorOf(res)).code).toBe("UNAUTHENTICATED");
    }
  });

  it("creates an event, its FREE draft invitation and the owner co-host in one go", async () => {
    const res = await app.request("/v1/events", jsonRequest("POST", weddingInput, asA));
    expect(res.status).toBe(201);
    const raw = await res.text();
    wedding = HostEventDetailSchema.parse(JSON.parse(raw));

    expect(wedding.id).toMatch(EVT_ID);
    expect(wedding).toMatchObject({
      title: "Anna and Tom",
      ceremonySlug: "wedding",
      experienceMode: "CELEBRATION",
      status: "DRAFT",
      role: "OWNER",
      timeZone: "Australia/Perth",
      startsAtLocal: "2031-03-15T16:00",
      // Perth is UTC+8 all year.
      startsAt: "2031-03-15T08:00:00.000Z",
      endsAtLocal: "2031-03-15T23:00",
      endsAt: "2031-03-15T15:00:00.000Z",
      counts: { parties: 0, guests: 0, yes: 0, pending: 0 },
      checklist: { hasWording: false, hasVenue: true, hasGuests: false, published: false },
    });
    expect(wedding.invitation).toMatchObject({
      templateSlug: "royal-classic",
      themeId: "royal-ivory",
      gateStyle: "wax-seal",
      plan: "FREE",
      effectivePlan: "FREE",
      isDemo: false,
      publishedAt: null,
      rsvpDeadline: null,
      rsvpDeadlineLocal: null,
      allowForwarding: true,
      wellMode: "NONE",
      wellConfig: {},
      previewPath: null,
    });
    expect(wedding.invitation.eventSlug).toMatch(/^anna-and-tom-[23456789a-hjkmnp-z]{4}$/);
    expect(wedding.invitation.content).toMatchObject({
      version: 1,
      headline: "Anna and Tom",
      hosts: "Together with their families",
      wording: "",
      venue: { name: "Town Hall", address: "1 Main Street, Perth WA" },
      coverImageUrl: null,
      music: { enabled: false, url: null },
    });
    expect(wedding.invitation.rsvpConfig).toEqual({
      allowMaybe: false,
      askDietary: true,
      askAccessibility: true,
      songPrompt: "STANDARD",
      askMessage: true,
      askContact: false,
    });

    const row = await db.invitation.findUniqueOrThrow({
      where: { id: wedding.invitation.id },
      include: { event: { include: { coHosts: true } } },
    });
    // A fresh per-event salt is stored and never leaves the API.
    expect(row.salt).toMatch(/^[0-9a-f]{64}$/);
    expect(raw).not.toContain(row.salt);
    expect(raw).not.toContain("salt");
    expect(row.languages).toEqual(["en"]);
    expect(row.pinHash).toBeNull();
    expect(row.event.ownerUserId).toBe(hostA.id);
    expect(row.event.title).toEqual({ en: "Anna and Tom" });
    expect(row.event.coHosts).toMatchObject([{ userId: hostA.id, role: "OWNER" }]);

    const audit = await db.auditLog.findMany({ where: { entityId: wedding.id } });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      action: "event.create",
      entity: "Event",
      actorUserId: hostA.id,
      actorRole: "CUSTOMER_HOST",
    });
  });

  it("derives Memorial Mode from the occasion and gives it complimentary Premium", async () => {
    const res = await app.request(
      "/v1/events",
      jsonRequest(
        "POST",
        {
          title: "Remembering Grace",
          ceremonySlug: "celebration-of-life",
          startsAtLocal: "2031-05-02T11:00",
          timeZone: "Australia/Sydney",
          templateSlug: "memorial-linen",
          hosts: "The Lee family",
          honoureeName: "Grace Lee",
          // Not part of the contract: the mode is never taken from the client.
          experienceMode: "CELEBRATION",
          gateStyle: "wax-seal",
        },
        asA,
      ),
    );
    expect(res.status).toBe(201);
    memorial = await detailOf(res);
    expect(memorial).toMatchObject({
      experienceMode: "MEMORIAL",
      timeZone: "Australia/Sydney",
      startsAtLocal: "2031-05-02T11:00",
      // Sydney is UTC+10 in May.
      startsAt: "2031-05-02T01:00:00.000Z",
      endsAt: null,
      endsAtLocal: null,
      checklist: { hasVenue: false },
    });
    expect(memorial.invitation).toMatchObject({
      templateSlug: "memorial-linen",
      themeId: "memorial-slate",
      gateStyle: "plain-fade",
      plan: "FREE",
      effectivePlan: "PREMIUM",
    });
    expect(memorial.invitation.content.honoureeName).toBe("Grace Lee");
    expect(memorial.invitation.content.venue).toBeNull();
    expect(memorial.invitation.rsvpConfig.songPrompt).toBe("HIDDEN");
  });

  it("rejects a create that the mode or the plan does not allow", async () => {
    const create = (overrides: Record<string, unknown>) =>
      app.request("/v1/events", jsonRequest("POST", { ...weddingInput, ...overrides }, asA));

    // A celebration template on a memorial occasion, and the reverse.
    for (const overrides of [
      { ceremonySlug: "memorial-service" },
      { templateSlug: "memorial-calm" },
      { themeId: "memorial-slate" },
    ]) {
      const res = await create(overrides);
      expect(res.status).toBe(400);
      expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
    }

    // Premium templates and themes are not available to a new (FREE) celebration.
    for (const overrides of [
      { templateSlug: "celestial-evening" },
      { themeId: "emerald-botanic" },
    ]) {
      const res = await create(overrides);
      expect(res.status).toBe(403);
      const error = await errorOf(res);
      expect(error.code).toBe("FEATURE_NOT_IN_PLAN");
      expect(error.details).toMatchObject({ feature: "allThemesAndAnimations" });
    }

    for (const overrides of [
      { endsAtLocal: "2031-03-15T10:00" },
      { startsAtLocal: "2031-02-30T10:00" },
      { startsAtLocal: "15/03/2031 16:00" },
      { timeZone: "Mars/Olympus" },
      { title: "" },
      { ceremonySlug: "not-an-occasion" },
    ]) {
      const res = await create(overrides);
      expect(res.status).toBe(400);
      expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
    }

    // Nothing was created by any of the rejected requests.
    expect(await db.event.count({ where: { ownerUserId: hostA.id } })).toBe(2);
  });

  it("lists only the caller's own events", async () => {
    const mine = HostEventListSchema.parse(
      await (await app.request("/v1/events", { headers: asA })).json(),
    );
    expect(mine.items.map((item) => item.id).sort()).toEqual([wedding.id, memorial.id].sort());
    expect(mine.items.every((item) => item.role === "OWNER")).toBe(true);

    const theirs = HostEventListSchema.parse(
      await (await app.request("/v1/events", { headers: asB })).json(),
    );
    expect(theirs.items).toEqual([]);
  });

  it("hides another host's event behind a 404 on every route", async () => {
    const attempts = [
      await app.request(`/v1/events/${wedding.id}`, { headers: asB }),
      await app.request(`/v1/events/${wedding.id}`, jsonRequest("PATCH", { title: "Mine" }, asB)),
      await patchInvitation(wedding.id, { allowForwarding: false }, asB),
      await app.request(`/v1/events/${wedding.id}/invitation/publish`, {
        method: "POST",
        headers: asB,
      }),
      await app.request(`/v1/events/${wedding.id}/invitation/unpublish`, {
        method: "POST",
        headers: asB,
      }),
      await app.request(`/v1/events/${wedding.id}/plan`, { headers: asB }),
      await app.request(`/v1/events/${wedding.id}`, { method: "DELETE", headers: asB }),
      // Unknown and malformed ids look exactly the same.
      await app.request(`/v1/events/${generateId("evt_")}`, { headers: asB }),
      await app.request("/v1/events/not-an-id", { headers: asB }),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(404);
      expect((await errorOf(res)).code).toBe("NOT_FOUND");
    }
    const untouched = await detailOf(
      await app.request(`/v1/events/${wedding.id}`, { headers: asA }),
    );
    expect(untouched.title).toBe("Anna and Tom");
    expect(untouched.invitation.allowForwarding).toBe(true);
  });

  it("applies co-host roles: a viewer reads, an editor edits, neither deletes", async () => {
    const coHostId = generateId("coh_");
    await db.coHost.create({
      data: { id: coHostId, eventId: wedding.id, userId: hostB.id, role: "VIEWER" },
    });

    const listed = HostEventListSchema.parse(
      await (await app.request("/v1/events", { headers: asB })).json(),
    );
    expect(listed.items).toMatchObject([{ id: wedding.id, role: "VIEWER" }]);
    const read = await app.request(`/v1/events/${wedding.id}`, { headers: asB });
    expect(read.status).toBe(200);
    expect((await detailOf(read)).role).toBe("VIEWER");

    const viewerEdit = await patchInvitation(wedding.id, { allowForwarding: false }, asB);
    expect(viewerEdit.status).toBe(403);
    expect((await errorOf(viewerEdit)).code).toBe("FORBIDDEN");

    await db.coHost.update({ where: { id: coHostId }, data: { role: "EDITOR" } });
    const editorEdit = await patchInvitation(wedding.id, { allowForwarding: false }, asB);
    expect(editorEdit.status).toBe(200);
    expect((await detailOf(editorEdit)).role).toBe("EDITOR");

    const editorDelete = await app.request(`/v1/events/${wedding.id}`, {
      method: "DELETE",
      headers: asB,
    });
    expect(editorDelete.status).toBe(403);
    expect((await errorOf(editorDelete)).code).toBe("FORBIDDEN");

    await db.coHost.delete({ where: { id: coHostId } });
    expect((await app.request(`/v1/events/${wedding.id}`, { headers: asB })).status).toBe(404);
    await patchInvitation(wedding.id, { allowForwarding: true });
  });

  it("updates the title and times, and keeps the wall clock when the time zone changes", async () => {
    const res = await app.request(
      `/v1/events/${wedding.id}`,
      jsonRequest(
        "PATCH",
        {
          title: "Anna & Tom's wedding",
          startsAtLocal: "2031-03-16T15:30",
          endsAtLocal: "2031-03-16T22:00",
        },
        asA,
      ),
    );
    expect(res.status).toBe(200);
    const updated = await detailOf(res);
    expect(updated).toMatchObject({
      title: "Anna & Tom's wedding",
      startsAtLocal: "2031-03-16T15:30",
      startsAt: "2031-03-16T07:30:00.000Z",
      endsAtLocal: "2031-03-16T22:00",
    });

    // An end before the start is rejected, and so is a start moved past the existing end.
    const invalid = await app.request(
      `/v1/events/${wedding.id}`,
      jsonRequest("PATCH", { endsAtLocal: "2031-03-16T15:00" }, asA),
    );
    expect(invalid.status).toBe(400);
    const pastTheEnd = await app.request(
      `/v1/events/${wedding.id}`,
      jsonRequest("PATCH", { startsAtLocal: "2031-03-17T10:00" }, asA),
    );
    expect(pastTheEnd.status).toBe(400);

    await patchInvitation(wedding.id, { rsvpDeadlineLocal: "2031-03-01T17:00" });
    const moved = await detailOf(
      await app.request(
        `/v1/events/${wedding.id}`,
        jsonRequest(
          "PATCH",
          { timeZone: "Australia/Brisbane", endsAtLocal: "2031-03-16T23:00" },
          asA,
        ),
      ),
    );
    // Brisbane is UTC+10: the same wall-clock times, two hours earlier in UTC.
    expect(moved).toMatchObject({
      timeZone: "Australia/Brisbane",
      startsAtLocal: "2031-03-16T15:30",
      startsAt: "2031-03-16T05:30:00.000Z",
      endsAtLocal: "2031-03-16T23:00",
      endsAt: "2031-03-16T13:00:00.000Z",
    });
    expect(moved.invitation).toMatchObject({
      rsvpDeadlineLocal: "2031-03-01T17:00",
      rsvpDeadline: "2031-03-01T07:00:00.000Z",
    });

    const cleared = await detailOf(
      await app.request(
        `/v1/events/${wedding.id}`,
        jsonRequest("PATCH", { timeZone: "Australia/Perth", endsAtLocal: null }, asA),
      ),
    );
    expect(cleared).toMatchObject({ timeZone: "Australia/Perth", endsAt: null, endsAtLocal: null });
    expect(cleared.invitation.rsvpDeadline).toBe("2031-03-01T09:00:00.000Z");

    const audit = await db.auditLog.findMany({
      where: { entityId: wedding.id, action: "event.update" },
      orderBy: { at: "asc" },
    });
    expect(audit).toHaveLength(3);
    // Which fields changed, not their values.
    expect(audit[0]?.diffJson).toEqual({ changed: ["title", "startsAt", "endsAt"] });

    // A request that changes nothing writes nothing.
    await app.request(
      `/v1/events/${wedding.id}`,
      jsonRequest("PATCH", { title: cleared.title }, asA),
    );
    expect(
      await db.auditLog.count({ where: { entityId: wedding.id, action: "event.update" } }),
    ).toBe(3);
  });

  it("gates the design by plan: a free invitation cannot pick a premium theme, template or gate", async () => {
    for (const [body, feature] of [
      [{ themeId: "midnight-celestial" }, "allThemesAndAnimations"],
      [{ themeId: "emerald-botanic" }, "allThemesAndAnimations"],
      [{ templateSlug: "botanic-garden" }, "allThemesAndAnimations"],
      [{ gateStyle: "ribbon" }, "allGateStyles"],
    ] as const) {
      const res = await patchInvitation(wedding.id, body);
      expect(res.status).toBe(403);
      const error = await errorOf(res);
      expect(error.code).toBe("FEATURE_NOT_IN_PLAN");
      expect(error.details).toMatchObject({ feature });
    }

    const allowed = await patchInvitation(wedding.id, {
      themeId: "alabaster-platinum",
      gateStyle: "plain-fade",
    });
    expect(allowed.status).toBe(200);
    expect((await detailOf(allowed)).invitation).toMatchObject({
      templateSlug: "royal-classic",
      themeId: "alabaster-platinum",
      gateStyle: "plain-fade",
    });

    // Switching template takes that template's own theme and gate.
    const switched = await detailOf(
      await patchInvitation(wedding.id, { templateSlug: "modern-minimal" }),
    );
    expect(switched.invitation).toMatchObject({
      templateSlug: "modern-minimal",
      themeId: "alabaster-platinum",
      gateStyle: "plain-fade",
    });
    const back = await detailOf(
      await patchInvitation(wedding.id, { templateSlug: "royal-classic" }),
    );
    expect(back.invitation).toMatchObject({ themeId: "royal-ivory", gateStyle: "wax-seal" });
  });

  it("keeps a memorial invitation in Memorial Mode", async () => {
    for (const body of [
      { themeId: "royal-ivory" },
      { themeId: "midnight-celestial" },
      { templateSlug: "royal-classic" },
      { wellMode: "WISHING_WELL" },
      { wellMode: "TRIBUTE_BOOK", wellConfig: { payId: "family@example.org" } },
      { wellConfig: { bsb: "066-000", accountNumber: "12345678" } },
      { wellConfig: { registryUrl: "https://example.org/registry" } },
      { rsvpConfig: { songPrompt: "STANDARD" } },
    ]) {
      const res = await patchInvitation(memorial.id, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
    }

    // Both memorial themes are open without paying, and the gate stays the plain fade.
    const res = await patchInvitation(memorial.id, {
      themeId: "memorial-alabaster",
      gateStyle: "wax-seal",
      wellMode: "TRIBUTE_BOOK",
      wellConfig: { tributePrompt: "Share a memory of Grace" },
      rsvpConfig: { songPrompt: "MEMORIAL", askContact: true },
    });
    expect(res.status).toBe(200);
    const updated = await detailOf(res);
    expect(updated.invitation).toMatchObject({
      themeId: "memorial-alabaster",
      gateStyle: "plain-fade",
      wellMode: "TRIBUTE_BOOK",
      wellConfig: { tributePrompt: "Share a memory of Grace" },
    });
    expect(updated.invitation.rsvpConfig).toMatchObject({
      songPrompt: "MEMORIAL",
      askContact: true,
    });
  });

  it("keeps wishing wells for celebrations", async () => {
    const tribute = await patchInvitation(wedding.id, { wellMode: "TRIBUTE_BOOK" });
    expect(tribute.status).toBe(400);

    const well = await patchInvitation(wedding.id, {
      wellMode: "WISHING_WELL",
      wellConfig: {
        message: "Your company is the gift.",
        bsb: "066-000",
        accountNumber: "12345678",
      },
    });
    expect(well.status).toBe(200);
    expect((await detailOf(well)).invitation).toMatchObject({
      wellMode: "WISHING_WELL",
      wellConfig: {
        message: "Your company is the gift.",
        bsb: "066-000",
        accountNumber: "12345678",
      },
    });
  });

  it("replaces content, refuses a stale write, and audits which fields changed without their values", async () => {
    const current = await detailOf(await app.request(`/v1/events/${wedding.id}`, { headers: asA }));
    const content: InvitationContent = {
      ...current.invitation.content,
      subheadline: "are getting married",
      wording: "A sentence that must never reach the audit log.",
      schedule: [{ id: "ceremony", time: "16:00", title: "Ceremony" }],
      faq: [{ question: "Are children welcome?", answer: "Yes, very." }],
    };

    const saved = await patchInvitation(wedding.id, {
      content,
      expectedUpdatedAt: current.invitation.updatedAt,
    });
    expect(saved.status).toBe(200);
    const afterSave = await detailOf(saved);
    expect(afterSave.invitation.content).toEqual(content);
    expect(afterSave.checklist.hasWording).toBe(true);
    expect(afterSave.invitation.updatedAt).not.toBe(current.invitation.updatedAt);

    // A second editor still holding the old timestamp is told to reload.
    const stale = await patchInvitation(wedding.id, {
      content: { ...content, wording: "An older draft" },
      expectedUpdatedAt: current.invitation.updatedAt,
    });
    expect(stale.status).toBe(409);
    const staleError = await errorOf(stale);
    expect(staleError.code).toBe("STALE_WRITE");
    expect(staleError.details).toEqual({ updatedAt: afterSave.invitation.updatedAt });
    const unchanged = await detailOf(
      await app.request(`/v1/events/${wedding.id}`, { headers: asA }),
    );
    expect(unchanged.invitation.content.wording).toBe(content.wording);

    // Invalid content is rejected whole.
    for (const bad of [
      { ...content, headline: "" },
      { ...content, coverImageUrl: "http://example.org/cover.jpg" },
      { ...content, music: { enabled: true, url: null, title: null, rightsAttested: false } },
      { ...content, version: 2 },
    ]) {
      expect((await patchInvitation(wedding.id, { content: bad })).status).toBe(400);
    }

    const audit = await db.auditLog.findMany({
      where: { entityId: wedding.invitation.id, action: "invitation.update" },
    });
    expect(audit.length).toBeGreaterThan(0);
    const serialised = JSON.stringify(audit.map((entry) => entry.diffJson));
    expect(serialised).toContain('"content"');
    expect(serialised).not.toContain("must never reach");
    expect(serialised).not.toContain("066-000");
    for (const entry of audit) {
      expect(Object.keys(entry.diffJson as Record<string, unknown>)).toEqual(["changed"]);
    }
  });

  it("refuses to publish until the requirements are met, then publishes once", async () => {
    // The memorial event has no venue yet.
    const notReady = await app.request(`/v1/events/${memorial.id}/invitation/publish`, {
      method: "POST",
      headers: asA,
    });
    expect(notReady.status).toBe(422);
    const error = await errorOf(notReady);
    expect(error.code).toBe("PUBLISH_REQUIREMENTS_NOT_MET");
    expect(error.details).toEqual({ missing: ["VENUE"] });

    // An event in the past is missing a future start as well.
    const past = await detailOf(
      await app.request(
        "/v1/events",
        jsonRequest(
          "POST",
          {
            ...weddingInput,
            title: "Last year",
            startsAtLocal: "2020-01-01T10:00",
            endsAtLocal: undefined,
            venue: undefined,
          },
          asA,
        ),
      ),
    );
    const pastPublish = await app.request(`/v1/events/${past.id}/invitation/publish`, {
      method: "POST",
      headers: asA,
    });
    expect(pastPublish.status).toBe(422);
    expect((await errorOf(pastPublish)).details).toEqual({ missing: ["VENUE", "START_IN_FUTURE"] });

    const withVenue = await patchInvitation(memorial.id, {
      content: {
        ...memorial.invitation.content,
        venue: { name: "Riverside Chapel", address: "2 Quiet Lane, Sydney NSW" },
      },
    });
    expect(withVenue.status).toBe(200);

    const published = await app.request(`/v1/events/${memorial.id}/invitation/publish`, {
      method: "POST",
      headers: asA,
    });
    expect(published.status).toBe(200);
    const live = await detailOf(published);
    expect(live.status).toBe("LIVE");
    expect(live.invitation.publishedAt).not.toBeNull();
    expect(live.checklist.published).toBe(true);

    // Publishing again is a no-op: same timestamp, no second audit entry.
    const again = await detailOf(
      await app.request(`/v1/events/${memorial.id}/invitation/publish`, {
        method: "POST",
        headers: asA,
      }),
    );
    expect(again.invitation.publishedAt).toBe(live.invitation.publishedAt);
    expect(
      await db.auditLog.count({
        where: { entityId: memorial.invitation.id, action: "invitation.publish" },
      }),
    ).toBe(1);

    const unpublished = await detailOf(
      await app.request(`/v1/events/${memorial.id}/invitation/unpublish`, {
        method: "POST",
        headers: asA,
      }),
    );
    expect(unpublished.status).toBe("DRAFT");
    expect(unpublished.invitation.publishedAt).toBeNull();
    expect(unpublished.checklist.published).toBe(false);
    // Unpublishing twice is also a no-op.
    await app.request(`/v1/events/${memorial.id}/invitation/unpublish`, {
      method: "POST",
      headers: asA,
    });
    expect(
      await db.auditLog.count({
        where: { entityId: memorial.invitation.id, action: "invitation.unpublish" },
      }),
    ).toBe(1);
  });

  it("lets only a Premium, never-published invitation change its link words", async () => {
    const suffix = wedding.invitation.eventSlug.slice(
      wedding.invitation.eventSlug.lastIndexOf("-") + 1,
    );

    // FREE: not entitled.
    const free = await patchInvitation(wedding.id, { eventSlugWords: "the-big-day" });
    expect(free.status).toBe(403);
    expect(await errorOf(free)).toMatchObject({
      code: "FEATURE_NOT_IN_PLAN",
      details: { feature: "customEventSlug" },
    });
    // Sending the current words back is not a change, so it is not gated.
    expect((await patchInvitation(wedding.id, { eventSlugWords: "anna-and-tom" })).status).toBe(
      200,
    );

    await db.invitation.update({ where: { id: wedding.invitation.id }, data: { plan: "PREMIUM" } });

    // Another invitation already holds the exact slug these words would produce.
    const other = await detailOf(
      await app.request(
        "/v1/events",
        jsonRequest("POST", { ...weddingInput, title: "Other" }, asB),
      ),
    );
    await db.invitation.update({
      where: { id: other.invitation.id },
      data: { eventSlug: `taken-words-${suffix}` },
    });
    const taken = await patchInvitation(wedding.id, { eventSlugWords: "taken-words" });
    expect(taken.status).toBe(409);
    expect((await errorOf(taken)).code).toBe("SLUG_TAKEN");

    const renamed = await patchInvitation(wedding.id, { eventSlugWords: "the-big-day" });
    expect(renamed.status).toBe(200);
    expect((await detailOf(renamed)).invitation.eventSlug).toBe(`the-big-day-${suffix}`);

    for (const words of ["Has Capitals", "double--hyphen", "trailing-"]) {
      expect((await patchInvitation(wedding.id, { eventSlugWords: words })).status).toBe(400);
    }

    // Once published the link is fixed, and stays fixed after an unpublish.
    const published = await app.request(`/v1/events/${wedding.id}/invitation/publish`, {
      method: "POST",
      headers: asA,
    });
    expect(published.status).toBe(200);
    const whilePublished = await patchInvitation(wedding.id, { eventSlugWords: "changed-my-mind" });
    expect(whilePublished.status).toBe(409);
    expect((await errorOf(whilePublished)).code).toBe("CONFLICT");

    await app.request(`/v1/events/${wedding.id}/invitation/unpublish`, {
      method: "POST",
      headers: asA,
    });
    const afterUnpublish = await patchInvitation(wedding.id, { eventSlugWords: "changed-my-mind" });
    expect(afterUnpublish.status).toBe(409);
    const final = await detailOf(await app.request(`/v1/events/${wedding.id}`, { headers: asA }));
    expect(final.invitation.eventSlug).toBe(`the-big-day-${suffix}`);

    // Premium also opens every theme and gate.
    const premiumDesign = await patchInvitation(wedding.id, {
      templateSlug: "celestial-evening",
      gateStyle: "arch",
    });
    expect(premiumDesign.status).toBe(200);
    expect((await detailOf(premiumDesign)).invitation).toMatchObject({
      templateSlug: "celestial-evening",
      themeId: "midnight-celestial",
      gateStyle: "arch",
      plan: "PREMIUM",
      effectivePlan: "PREMIUM",
    });
  });

  it("answers DEMO_READ_ONLY to every write on a sample invitation", async () => {
    const asDemoOwner = actAs({
      id: demo.userId,
      actor: { userId: demo.userId, roles: ["CUSTOMER_HOST"] },
    });
    const attempts = [
      await app.request(
        `/v1/events/${demo.eventId}`,
        jsonRequest("PATCH", { title: "Changed" }, asDemoOwner),
      ),
      await patchInvitation(demo.eventId, { allowForwarding: false }, asDemoOwner),
      await app.request(`/v1/events/${demo.eventId}/invitation/unpublish`, {
        method: "POST",
        headers: asDemoOwner,
      }),
      await app.request(`/v1/events/${demo.eventId}/invitation/publish`, {
        method: "POST",
        headers: asDemoOwner,
      }),
      await app.request(`/v1/events/${demo.eventId}`, { method: "DELETE", headers: asDemoOwner }),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(403);
      expect((await errorOf(res)).code).toBe("DEMO_READ_ONLY");
    }
    // Reading a sample is fine.
    const read = await app.request(`/v1/events/${demo.eventId}`, { headers: asDemoOwner });
    expect(read.status).toBe(200);
    expect((await detailOf(read)).invitation.isDemo).toBe(true);
  });

  it("soft-deletes an event for its owner and hides it everywhere afterwards", async () => {
    const res = await app.request(`/v1/events/${memorial.id}`, { method: "DELETE", headers: asA });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");

    expect((await app.request(`/v1/events/${memorial.id}`, { headers: asA })).status).toBe(404);
    const again = await app.request(`/v1/events/${memorial.id}`, {
      method: "DELETE",
      headers: asA,
    });
    expect(again.status).toBe(404);
    const list = HostEventListSchema.parse(
      await (await app.request("/v1/events", { headers: asA })).json(),
    );
    expect(list.items.map((item) => item.id)).not.toContain(memorial.id);

    const row = await db.event.findUniqueOrThrow({
      where: { id: memorial.id },
      include: { invitation: true },
    });
    expect(row.deletedAt).not.toBeNull();
    expect(row.invitation?.deletedAt).not.toBeNull();
    expect(
      await db.auditLog.count({ where: { entityId: memorial.id, action: "event.delete" } }),
    ).toBe(1);
  });
});
