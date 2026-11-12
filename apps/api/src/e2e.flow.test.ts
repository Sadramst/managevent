/**
 * One wedding from sign-up to the door, through HTTP on the real app and the real database.
 *
 * Nothing is injected except what the machine cannot provide: the job queue is in memory (the
 * worker run is verified separately) and, because there are no Stripe keys locally, the Premium
 * upgrade runs the real `stripe` SDK against the local transport in `test/stripe.ts`. Sessions
 * are real Better Auth cookies; guests have no session at all.
 *
 * The steps depend on each other and run in order. Every row is created under two fresh accounts
 * and removed at the end.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthActor } from "@managevent/auth";
import { db } from "@managevent/db";
import {
  ApiErrorSchema,
  CheckInRosterSchema,
  CheckInScanResultSchema,
  CheckoutSessionSchema,
  DietaryMatrixSchema,
  GuestCalendarSchema,
  GuestImportResultSchema,
  type GuestInvitationView,
  GuestInvitationViewSchema,
  GuestLinkStatusSchema,
  GuestPassesViewSchema,
  type GuestRsvpResult,
  GuestRsvpResultSchema,
  GuestWishResultSchema,
  type HostEventDetail,
  HostEventDetailSchema,
  HostEventListSchema,
  type HostParty,
  HostPartyListSchema,
  HostPartySchema,
  HostWellEntryListSchema,
  HostWellEntrySchema,
  MeResponseSchema,
  PlanViewSchema,
  ResponsesSummarySchema,
} from "@managevent/validators";
import { createApiApp } from "./app.js";
import { PROXY_SECRET_HEADER } from "./lib/client-ip.js";
import { createDefaultDeps } from "./lib/deps.js";
import { signPass } from "./lib/guest-tokens.js";
import { InMemoryJobQueue } from "./lib/queue.js";
import { utcToZonedWallTime } from "./lib/time.js";
import { parseCsv } from "./modules/guest-list/csv.js";
import { dbAvailable, deleteRsvpSubmissionsOfInvitations, uniqueTestSuffix } from "./test/db.js";
import { TEST_ACTOR_HEADER } from "./test/hosts.js";
import { createBillingTestApp, createStripeTestTransport } from "./test/stripe.js";

const PROVIDER_ENV = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const PERTH = "Australia/Perth";

const HEALTH_CONSENT_TEXT =
  "I agree that the dietary and allergy details I give are shared with the hosts and their caterer for this event.";

describe.skipIf(!dbAvailable)("end-to-end: a wedding invitation from sign-up to check-in", () => {
  const suffix = uniqueTestSuffix();
  const hostEmail = `e2e-host-${suffix}@test.managevent.invalid`;
  const otherEmail = `e2e-other-${suffix}@test.managevent.invalid`;
  const guestEmail = `e2e-guest-${suffix}@test.managevent.invalid`;

  // Local auth settings and no providers, whatever the developer's .env says.
  const savedEnv: Record<string, string | undefined> = {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
  };
  for (const name of PROVIDER_ENV) {
    savedEnv[name] = process.env[name];
    delete process.env[name];
  }
  process.env.BETTER_AUTH_URL = "http://localhost:4000";
  process.env.AUTH_COOKIE_DOMAIN = "localhost";

  const queue = new InMemoryJobQueue();
  // As deployed: the invitation site calls the API server-to-server, proves itself with the
  // shared secret, and passes the visitor's address in `x-forwarded-for`.
  const proxySecret = `e2e-proxy-secret-${uniqueTestSuffix()}-0123456789`;
  const app = createApiApp({
    deps: { queue },
    disableRateLimits: true,
    clientIp: { proxySecret },
  });

  // The only stand-in: Stripe's network. Same routers, same service code, real SDK.
  const stripe = createStripeTestTransport();
  const billingActors = new Map<string, AuthActor>();
  const billingApp = createBillingTestApp(
    createDefaultDeps({ queue }),
    stripe.createStripeClient,
    billingActors,
  );

  // The event is 90 days out at 16:00 Perth time; replies close 30 days before.
  const startsAtLocal = `${utcToZonedWallTime(new Date(Date.now() + 90 * DAY_MS), PERTH).slice(0, 10)}T16:00`;
  const rsvpDeadlineLocal = `${utcToZonedWallTime(new Date(Date.now() + 60 * DAY_MS), PERTH).slice(0, 10)}T23:59`;

  let hostCookie = "";
  let otherCookie = "";
  let hostUserId = "";
  let event: HostEventDetail;
  let nguyen: HostParty;
  let shah: HostParty;
  let linhId = "";
  let minhId = "";
  let rsvpResult: GuestRsvpResult;
  let linhQr = "";
  let wishId = "";

  // ── Small HTTP helpers ─────────────────────────────────────────────────────

  function send(
    method: string,
    path: string,
    options: { cookie?: string; body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<Response> {
    return Promise.resolve(
      app.request(path, {
        method,
        headers: {
          ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
          ...(options.cookie ? { cookie: options.cookie } : {}),
          ...options.headers,
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      }),
    );
  }

  /** Requests as the host. */
  const asHost = (method: string, path: string, body?: unknown, headers?: Record<string, string>) =>
    send(method, path, {
      cookie: hostCookie,
      ...(body !== undefined ? { body } : {}),
      ...(headers ? { headers } : {}),
    });

  /** Requests as a guest: no cookie, no headers that identify anyone. */
  const asGuest = (
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) =>
    send(method, path, {
      ...(body !== undefined ? { body } : {}),
      headers: {
        "x-forwarded-for": "203.0.113.42",
        [PROXY_SECRET_HEADER]: proxySecret,
        ...headers,
      },
    });

  async function errorOf(res: Response) {
    return ApiErrorSchema.parse(await res.json()).error;
  }

  async function signUp(name: string, email: string): Promise<string> {
    const res = await send("POST", "/api/auth/sign-up/email", {
      body: { name, email, password: `correct horse ${suffix}` },
    });
    expect(res.status).toBe(200);
    const cookie = res.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    expect(cookie).toContain("managevent.session_token=");
    return cookie;
  }

  const guestPath = (party: Pick<HostParty, "token">, rest = "") =>
    `/v1/i/${event.invitation.eventSlug}/${party.token}${rest}`;

  async function guestView(party: Pick<HostParty, "token">): Promise<GuestInvitationView> {
    const res = await asGuest("GET", guestPath(party));
    expect(res.status).toBe(200);
    return GuestInvitationViewSchema.parse(await res.json());
  }

  async function removeAccount(email: string): Promise<void> {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return;
    const events = await db.event.findMany({
      where: { ownerUserId: user.id },
      select: { id: true, invitation: { select: { id: true } } },
    });
    const eventIds = events.map((row) => row.id);
    const invitationIds = events.flatMap((row) => (row.invitation ? [row.invitation.id] : []));
    const guests = await db.guest.findMany({
      where: { party: { invitationId: { in: invitationIds } } },
      select: { id: true },
    });
    const entries = await db.wellEntry.findMany({
      where: { invitationId: { in: invitationIds } },
      select: { id: true },
    });
    // Rows without a cascading foreign key to the event go first.
    await deleteRsvpSubmissionsOfInvitations(invitationIds);
    await db.consentRecord.deleteMany({
      where: { subjectType: "GUEST", subjectId: { in: guests.map((guest) => guest.id) } },
    });
    await db.message.deleteMany({ where: { eventId: { in: eventIds } } });
    await db.payment.deleteMany({ where: { invitationId: { in: invitationIds } } });
    await db.auditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: user.id },
          {
            entityId: {
              in: [user.id, ...eventIds, ...invitationIds, ...entries.map((entry) => entry.id)],
            },
          },
        ],
      },
    });
    await db.event.deleteMany({ where: { id: { in: eventIds } } });
    // Sessions and the credential account cascade from the user.
    await db.user.deleteMany({ where: { id: user.id } });
  }

  beforeAll(() => {
    expect(startsAtLocal).toMatch(/^\d{4}-\d{2}-\d{2}T16:00$/);
  });

  afterAll(async () => {
    for (const [name, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await removeAccount(hostEmail);
    await removeAccount(otherEmail);
  });

  // ── Host: account, event, content, guests ─────────────────────────────────

  it("1. a host signs up and is signed in straight away", async () => {
    hostCookie = await signUp("Layla Haddad", hostEmail);

    const me = MeResponseSchema.parse(
      await (await send("GET", "/v1/me", { cookie: hostCookie })).json(),
    );
    expect(me.user).toMatchObject({ email: hostEmail, roles: ["CUSTOMER_HOST"] });
    hostUserId = me.user?.id ?? "";
    expect(hostUserId).toMatch(/^usr_/);
    // No providers on this machine, and the API says so.
    expect(me.capabilities).toMatchObject({ emailInvitations: false, stripeCheckout: false });

    const list = HostEventListSchema.parse(await (await asHost("GET", "/v1/events")).json());
    expect(list.items).toEqual([]);
  });

  it("2. creates a wedding: a FREE draft in celebration mode with its own link", async () => {
    const res = await asHost("POST", "/v1/events", {
      title: "Layla and Sam",
      ceremonySlug: "wedding",
      startsAtLocal,
      timeZone: PERTH,
      templateSlug: "royal-classic",
      hosts: "Layla Haddad and Sam Okafor",
    });
    expect(res.status).toBe(201);
    event = HostEventDetailSchema.parse(await res.json());

    expect(event).toMatchObject({
      title: "Layla and Sam",
      ceremonySlug: "wedding",
      experienceMode: "CELEBRATION",
      status: "DRAFT",
      startsAtLocal,
      timeZone: PERTH,
      role: "OWNER",
      checklist: { hasGuests: false, published: false },
    });
    expect(event.invitation).toMatchObject({
      templateSlug: "royal-classic",
      themeId: "royal-ivory",
      gateStyle: "wax-seal",
      plan: "FREE",
      effectivePlan: "FREE",
      isDemo: false,
      publishedAt: null,
    });
    expect(event.invitation.eventSlug).toMatch(/^layla-and-sam-[a-z0-9]{4}$/);
    expect(event.invitation.content).toMatchObject({
      version: 1,
      headline: "Layla and Sam",
      hosts: "Layla Haddad and Sam Okafor",
    });
    // 16:00 in Perth is 08:00 UTC.
    expect(event.startsAt.slice(11, 16)).toBe("08:00");

    // The salt exists, is per event, and is not in the response.
    const row = await db.invitation.findUniqueOrThrow({ where: { id: event.invitation.id } });
    expect(row.salt).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(event)).not.toContain(row.salt);
  });

  it("3. edits the wording, schedule, venue, RSVP settings and wishing well", async () => {
    const res = await asHost("PATCH", `/v1/events/${event.id}/invitation`, {
      content: {
        version: 1,
        headline: "Layla and Sam are getting married",
        subheadline: "Join us by the river",
        hosts: "Layla Haddad and Sam Okafor",
        wording: "Together with our families,\nwe would love you to celebrate with us.",
        story: ["We met at a friend's dinner in Fremantle."],
        schedule: [
          { id: "ceremony", time: "16:00", title: "Ceremony", location: "River lawn" },
          { id: "dinner", time: "18:00", title: "Dinner and dancing" },
        ],
        venue: {
          name: "Matilda Bay Pavilion",
          address: "3 Hackett Drive, Crawley WA 6009",
          parking: "Free parking on Hackett Drive",
        },
        dressCode: "Garden formal",
        faq: [{ question: "Are children welcome?", answer: "Yes, bring the whole family." }],
        coverImageUrl: null,
        galleryImageUrls: [],
        music: { enabled: false, url: null, title: null, rightsAttested: false },
      },
      rsvpDeadlineLocal,
      rsvpConfig: {
        allowMaybe: false,
        askDietary: true,
        askAccessibility: true,
        songPrompt: "STANDARD",
        askMessage: true,
        askContact: false,
      },
      wellMode: "WISHING_WELL",
      wellConfig: { message: "Your presence is the gift. A note for us would mean a lot." },
      expectedUpdatedAt: event.invitation.updatedAt,
    });
    expect(res.status).toBe(200);
    const updated = HostEventDetailSchema.parse(await res.json());
    expect(updated.invitation.content.venue?.name).toBe("Matilda Bay Pavilion");
    expect(updated.invitation.content.schedule).toHaveLength(2);
    expect(updated.invitation.rsvpDeadlineLocal).toBe(rsvpDeadlineLocal);
    expect(updated.invitation.wellMode).toBe("WISHING_WELL");
    expect(updated.checklist).toMatchObject({ hasWording: true, hasVenue: true });

    // A write based on the page as it was before this save is refused, not merged.
    const stale = await asHost("PATCH", `/v1/events/${event.id}/invitation`, {
      allowForwarding: false,
      expectedUpdatedAt: event.invitation.updatedAt,
    });
    expect(stale.status).toBe(409);
    expect((await errorOf(stale)).code).toBe("STALE_WRITE");

    // A premium theme is not available on the free plan.
    const gated = await asHost("PATCH", `/v1/events/${event.id}/invitation`, {
      themeId: "midnight-celestial",
    });
    expect(gated.status).toBe(403);
    expect((await errorOf(gated)).code).toBe("FEATURE_NOT_IN_PLAN");

    event = updated;
  });

  it("4. adds a party of two by hand and two more guests from a CSV file", async () => {
    const created = await asHost(
      "POST",
      `/v1/events/${event.id}/parties`,
      {
        displayName: "The Nguyen Family",
        maxSeats: 3,
        allowPlusOnes: true,
        tableLabel: "Table 4",
        guests: [{ name: "Linh Nguyen", email: guestEmail }, { name: "Minh Nguyen" }],
      },
      { "idempotency-key": `e2e-party-${suffix}` },
    );
    expect(created.status).toBe(201);
    nguyen = HostPartySchema.parse(await created.json());
    expect(nguyen.guests.map((guest) => guest.name)).toEqual(["Linh Nguyen", "Minh Nguyen"]);
    expect(nguyen.token).toMatch(/^the-nguyen-family-[a-z0-9]{8}$/);
    expect(nguyen.invitePath).toBe(`/i/${event.invitation.eventSlug}/${nguyen.token}`);
    expect(nguyen.status).toBe("PENDING");
    linhId = nguyen.guests[0]?.id ?? "";
    minhId = nguyen.guests[1]?.id ?? "";

    // The same request again (a double click) returns the same party, not a second one.
    const again = await asHost(
      "POST",
      `/v1/events/${event.id}/parties`,
      {
        displayName: "The Nguyen Family",
        maxSeats: 3,
        allowPlusOnes: true,
        tableLabel: "Table 4",
        guests: [{ name: "Linh Nguyen", email: guestEmail }, { name: "Minh Nguyen" }],
      },
      { "idempotency-key": `e2e-party-${suffix}` },
    );
    expect(again.status).toBe(200);
    expect(HostPartySchema.parse(await again.json()).id).toBe(nguyen.id);

    const csv =
      "name,party,table\r\nPriya Shah,Shah Family,Table 5\r\nArjun Shah,Shah Family,Table 5\r\n";
    const dryRun = await asHost("POST", `/v1/events/${event.id}/guests/import`, { csv });
    expect(dryRun.status).toBe(200);
    const preview = GuestImportResultSchema.parse(await dryRun.json());
    expect(preview).toMatchObject({
      dryRun: true,
      createdPartyIds: [],
      summary: { partyCount: 1, guestCount: 2, skippedRows: 0 },
      errors: [],
      plan: { limit: 30, current: 2, afterImport: 4, exceeds: false },
    });

    const commit = await asHost(
      "POST",
      `/v1/events/${event.id}/guests/import`,
      { csv, dryRun: false },
      { "idempotency-key": `e2e-import-${suffix}` },
    );
    expect(commit.status).toBe(200);
    const imported = GuestImportResultSchema.parse(await commit.json());
    expect(imported.dryRun).toBe(false);
    expect(imported.createdPartyIds).toHaveLength(1);

    const list = HostPartyListSchema.parse(
      await (await asHost("GET", `/v1/events/${event.id}/parties`)).json(),
    );
    expect(list.totals).toEqual({ parties: 2, guests: 4 });
    const found = list.items.find((party) => party.id === imported.createdPartyIds[0]);
    expect(found?.guests.map((guest) => guest.name).sort()).toEqual(["Arjun Shah", "Priya Shah"]);
    shah = found as HostParty;
    expect(shah.token).not.toBe(nguyen.token);
  });

  // ── Publish ───────────────────────────────────────────────────────────────

  it("5. keeps the draft private: guests get a 404, the host gets a read-only preview", async () => {
    const hidden = await asGuest("GET", guestPath(nguyen));
    expect(hidden.status).toBe(404);
    expect((await errorOf(hidden)).code).toBe("NOT_FOUND");

    const preview = await asHost("GET", guestPath(nguyen));
    expect(preview.status).toBe(200);
    const view = GuestInvitationViewSchema.parse(await preview.json());
    expect(view.preview).toBe(true);
    expect(view.rsvp.state).toBe("READ_ONLY");
  });

  it("6. publishes the invitation", async () => {
    const res = await asHost("POST", `/v1/events/${event.id}/invitation/publish`);
    expect(res.status).toBe(200);
    event = HostEventDetailSchema.parse(await res.json());
    expect(event.status).toBe("LIVE");
    expect(event.invitation.publishedAt).not.toBeNull();
    expect(event.checklist).toEqual({
      hasWording: true,
      hasVenue: true,
      hasGuests: true,
      published: true,
    });
  });

  // ── Guest: open the link ──────────────────────────────────────────────────

  it("7. a guest opens their link and sees only their own invitation", async () => {
    const status = await asGuest("GET", guestPath(nguyen, "/status"));
    expect(status.status).toBe(200);
    expect(GuestLinkStatusSchema.parse(await status.json())).toEqual({ state: "ACTIVE" });

    const res = await asGuest("GET", guestPath(nguyen));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    const raw = await res.text();
    const view = GuestInvitationViewSchema.parse(JSON.parse(raw));

    expect(view).toMatchObject({
      preview: false,
      demo: false,
      event: {
        title: "Layla and Sam",
        experienceMode: "CELEBRATION",
        startsAtLocal,
        timeZone: PERTH,
        phase: "UPCOMING",
      },
      invitation: {
        templateSlug: "royal-classic",
        themeId: "royal-ivory",
        showBranding: true,
        rsvpDeadlineLocal,
        well: { mode: "WISHING_WELL" },
      },
      party: { displayName: "The Nguyen Family", maxSeats: 3, allowPlusOnes: true },
      rsvp: { state: "OPEN", hasResponded: false, seatsRemaining: 1 },
      features: { passEnabled: false, wishesEnabled: true },
      wishes: [],
    });
    expect(view.invitation.content.venue?.name).toBe("Matilda Bay Pavilion");
    expect(view.party.members.map((member) => member.name)).toEqual(["Linh Nguyen", "Minh Nguyen"]);

    // Guest-safe: nothing about anyone else, and nothing that identifies rows or secrets.
    const invitation = await db.invitation.findUniqueOrThrow({
      where: { id: event.invitation.id },
    });
    for (const secret of [
      "Shah",
      shah.token,
      nguyen.token,
      invitation.salt,
      guestEmail,
      hostEmail,
      hostUserId,
      event.id,
      event.invitation.id,
      nguyen.id,
      shah.id,
    ]) {
      expect(raw, `guest view must not contain ${secret}`).not.toContain(secret);
    }

    // A link that was never issued is a real 404, with the same shape as any other.
    const guess = await asGuest(
      "GET",
      `/v1/i/${event.invitation.eventSlug}/the-nguyen-family-23456789`,
    );
    expect(guess.status).toBe(404);
    // The other party's token under a different name prefix does not resolve either.
    const prefixOnly = await asGuest(
      "GET",
      `/v1/i/${event.invitation.eventSlug}/the-nguyen-family`,
    );
    expect(prefixOnly.status).toBe(404);

    const calendar = await asGuest("GET", guestPath(nguyen, "/calendar"));
    expect(calendar.status).toBe(200);
    const ics = GuestCalendarSchema.parse(await calendar.json());
    expect(ics.ics).toContain("BEGIN:VEVENT");
    expect(ics.ics).not.toContain("Linh");
  });

  // ── Plan: free limits, then the paid upgrade ──────────────────────────────

  it("8. on the free plan, entry passes and check-in are off and say why", async () => {
    const passes = GuestPassesViewSchema.parse(
      await (await asGuest("GET", guestPath(nguyen, "/passes"))).json(),
    );
    expect(passes).toMatchObject({ enabled: false, passes: [] });

    const roster = await asHost("GET", `/v1/events/${event.id}/check-in`);
    expect(roster.status).toBe(403);
    expect(await errorOf(roster)).toMatchObject({
      code: "FEATURE_NOT_IN_PLAN",
      details: { feature: "qrPassesAndCheckin" },
    });

    // No Stripe keys here: the real app reports it instead of pretending.
    const checkout = await asHost(
      "POST",
      `/v1/events/${event.id}/plan/checkout`,
      {},
      { "idempotency-key": `e2e-checkout-${suffix}` },
    );
    expect(checkout.status).toBe(503);
    expect((await errorOf(checkout)).code).toBe("PAYMENTS_NOT_CONFIGURED");

    const plan = PlanViewSchema.parse(
      await (await asHost("GET", `/v1/events/${event.id}/plan`)).json(),
    );
    expect(plan).toMatchObject({
      plan: "FREE",
      effectivePlan: "FREE",
      usage: { guests: 4, guestLimit: 30 },
      upgrade: {
        available: false,
        unavailableReason: "PAYMENTS_NOT_CONFIGURED",
        priceIncGstCents: 6900,
        currency: "AUD",
      },
    });
  });

  it("9. buys the Premium Event Pass: one payment, GST split, plan upgraded once", async () => {
    billingActors.set(hostUserId, { userId: hostUserId, roles: ["CUSTOMER_HOST"] });
    const headers = { "content-type": "application/json", [TEST_ACTOR_HEADER]: hostUserId };

    const started = await billingApp.request(`/v1/events/${event.id}/plan/checkout`, {
      method: "POST",
      headers: { ...headers, "idempotency-key": `e2e-checkout-${suffix}` },
      body: "{}",
    });
    expect(started.status).toBe(201);
    const { checkoutUrl } = CheckoutSessionSchema.parse(await started.json());
    const sessionId = checkoutUrl.split("/").pop() ?? "";
    expect(stripe.sessions.get(sessionId)?.metadata).toMatchObject({
      invitationId: event.invitation.id,
      eventId: event.id,
      userId: hostUserId,
    });

    const confirm = () =>
      billingApp.request(`/v1/events/${event.id}/plan/checkout/confirm`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      });

    // Coming back from Stripe without having paid changes nothing.
    const unpaid = await confirm();
    expect(unpaid.status).toBe(409);
    expect((await errorOf(unpaid)).code).toBe("PAYMENT_NOT_COMPLETED");

    stripe.markPaid(sessionId);
    const paid = await confirm();
    expect(paid.status).toBe(200);
    expect(PlanViewSchema.parse(await paid.json())).toMatchObject({
      plan: "PREMIUM",
      effectivePlan: "PREMIUM",
      upgrade: { available: false, unavailableReason: "ALREADY_PREMIUM" },
    });
    // Confirming twice (page reload) is harmless.
    expect((await confirm()).status).toBe(200);

    const payments = await db.payment.findMany({ where: { invitationId: event.invitation.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      kind: "INVITATION_PASS",
      status: "SUCCEEDED",
      method: "CARD",
      currency: "AUD",
    });
    const audit = await db.auditLog.findMany({
      where: { entityId: event.invitation.id, action: "plan.upgrade" },
    });
    expect(audit).toHaveLength(1);

    // The real app sees the upgrade.
    const plan = PlanViewSchema.parse(
      await (await asHost("GET", `/v1/events/${event.id}/plan`)).json(),
    );
    expect(plan).toMatchObject({ plan: "PREMIUM", usage: { guests: 4, guestLimit: null } });
    expect(plan.entitlements.qrPassesAndCheckin).toBe(true);
  });

  // ── Guest: RSVP ───────────────────────────────────────────────────────────

  it("10. the guest replies: one yes with a dietary need, one no, and a plus-one", async () => {
    const jobsBefore = queue.jobs.length;
    const key = `e2e-rsvp-${suffix}`;
    const body = {
      members: [
        {
          guestId: linhId,
          status: "YES",
          health: {
            dietary: ["VEGETARIAN", "NUT_ALLERGY"],
            allergySeverity: "SEVERE_ANAPHYLAXIS",
            allergyNotes: "Carries an adrenaline pen",
          },
        },
        { guestId: minhId, status: "NO" },
      ],
      plusOnes: [{ name: "Tuan Pham" }],
      songRequests: ["At Last"],
      messageToHost: "We cannot wait to celebrate with you",
      healthConsent: { granted: true, textShown: HEALTH_CONSENT_TEXT },
    };

    const res = await asGuest("POST", guestPath(nguyen, "/rsvp"), body, {
      "idempotency-key": key,
    });
    expect(res.status).toBe(200);
    rsvpResult = GuestRsvpResultSchema.parse(await res.json());

    expect(rsvpResult.replayed).toBe(false);
    expect(rsvpResult.rsvp).toMatchObject({
      hasResponded: true,
      seatsRemaining: 0,
      songRequests: ["At Last"],
      messageToHost: "We cannot wait to celebrate with you",
    });
    const members = new Map(rsvpResult.party.members.map((member) => [member.name, member]));
    expect(members.get("Linh Nguyen")).toMatchObject({ status: "YES", healthOnFile: true });
    expect(members.get("Minh Nguyen")).toMatchObject({ status: "NO", healthOnFile: false });
    expect(members.get("Tuan Pham")).toMatchObject({ status: "YES", isPlusOne: true });
    // Health values are never echoed back.
    expect(JSON.stringify(rsvpResult)).not.toMatch(/VEGETARIAN|NUT_ALLERGY|adrenaline/);
    // Premium: one pass each for the two people who are coming.
    expect(rsvpResult.passes.map((pass) => pass.guestName).sort()).toEqual([
      "Linh Nguyen",
      "Tuan Pham",
    ]);

    // At rest: ciphertext only, and the consent wording the guest saw.
    const stored = await db.$queryRaw<
      Array<{ dietaryEncrypted: string | null; allergyNotes: string | null }>
    >`SELECT "dietaryEncrypted", "allergyNotes" FROM "Rsvp" WHERE "guestId" = ${linhId}`;
    expect(stored).toHaveLength(1);
    expect(stored[0]?.dietaryEncrypted).toMatch(/^enc:v1:/);
    expect(stored[0]?.allergyNotes).toMatch(/^enc:v1:/);
    expect(JSON.stringify(stored)).not.toMatch(/VEGETARIAN|adrenaline/);
    const consents = await db.consentRecord.findMany({
      where: { subjectType: "GUEST", subjectId: linhId },
    });
    expect(consents).toHaveLength(1);
    expect(consents[0]).toMatchObject({
      purpose: "HEALTH_DATA_CATERING",
      granted: true,
      textShown: HEALTH_CONSENT_TEXT,
      ip: "203.0.113.42",
    });

    // The bridge to planning: exactly one headcount.changed for this snapshot.
    const jobs = queue.jobs.slice(jobsBefore);
    expect(jobs).toEqual([
      {
        name: "headcount.changed",
        payload: { eventId: event.id, headcountId: rsvpResult.headcountSnapshotId },
        opts: { singletonKey: `headcount.changed:${rsvpResult.headcountSnapshotId}` },
      },
    ]);
    const snapshot = await db.eventHeadcount.findUniqueOrThrow({
      where: { id: rsvpResult.headcountSnapshotId },
    });
    expect(snapshot).toMatchObject({ eventId: event.id, adultsYes: 2, childrenYes: 0 });

    // A retry of the same submission (flaky connection) is answered, not applied twice.
    const retry = await asGuest("POST", guestPath(nguyen, "/rsvp"), body, {
      "idempotency-key": key,
    });
    expect(retry.status).toBe(200);
    expect(GuestRsvpResultSchema.parse(await retry.json()).replayed).toBe(true);
    expect(await db.guest.count({ where: { partyId: nguyen.id } })).toBe(3);
    expect(await db.pass.count({ where: { partyId: nguyen.id } })).toBe(2);

    // A guest of one party cannot answer for a guest of another.
    const foreign = await asGuest(
      "POST",
      guestPath(nguyen, "/rsvp"),
      { members: [{ guestId: shah.guests[0]?.id, status: "NO" }] },
      { "idempotency-key": `e2e-foreign-${suffix}` },
    );
    expect(foreign.status).toBe(400);
    expect(await db.rsvp.count({ where: { guest: { partyId: shah.id } } })).toBe(0);
  });

  it("11. the host sees the counts, the dietary matrix and the latest headcount", async () => {
    const res = await asHost("GET", `/v1/events/${event.id}/responses`);
    expect(res.status).toBe(200);
    const summary = ResponsesSummarySchema.parse(await res.json());
    expect(summary.totals).toEqual({
      parties: 2,
      partiesResponded: 1,
      guests: 5,
      adultsYes: 2,
      childrenYes: 0,
      maybe: 0,
      no: 1,
      pending: 2,
      checkedIn: 0,
    });
    expect(summary.dietaryCounts).toMatchObject({ VEGETARIAN: 1, NUT_ALLERGY: 1, HALAL: 0 });
    expect(summary.severeAllergyCount).toBe(1);
    expect(summary.songRequests).toEqual([
      { partyDisplayName: "The Nguyen Family", song: "At Last" },
    ]);
    expect(summary.messages[0]).toMatchObject({
      partyDisplayName: "The Nguyen Family",
      message: "We cannot wait to celebrate with you",
    });
    expect(summary.deadline.state).toBe("OPEN");
    expect(summary.latestHeadcount).toMatchObject({
      id: rsvpResult.headcountSnapshotId,
      trigger: "RSVP",
    });

    const dietary = await asHost("GET", `/v1/events/${event.id}/responses/dietary`);
    expect(dietary.status).toBe(200);
    const matrix = DietaryMatrixSchema.parse(await dietary.json());
    expect(matrix.rows).toEqual([
      {
        guestId: linhId,
        guestName: "Linh Nguyen",
        partyDisplayName: "The Nguyen Family",
        tableLabel: "Table 4",
        isChild: false,
        dietary: ["VEGETARIAN", "NUT_ALLERGY"],
        allergySeverity: "SEVERE_ANAPHYLAXIS",
        allergyNotes: "Carries an adrenaline pen",
        accessibilityNotes: null,
      },
    ]);
    expect(matrix.counts).toMatchObject({ VEGETARIAN: 1, NUT_ALLERGY: 1 });
    expect(matrix.byTable).toEqual([expect.objectContaining({ tableLabel: "Table 4", severe: 1 })]);

    const parties = HostPartyListSchema.parse(
      await (await asHost("GET", `/v1/events/${event.id}/parties?status=YES`)).json(),
    );
    expect(parties.items.map((party) => party.id)).toEqual([nguyen.id]);
  });

  // ── Door: passes and check-in ─────────────────────────────────────────────

  it("12. the guest's pass page carries a signed QR code per attending guest", async () => {
    const res = await asGuest("GET", guestPath(nguyen, "/passes"));
    expect(res.status).toBe(200);
    const view = GuestPassesViewSchema.parse(await res.json());
    expect(view).toMatchObject({
      enabled: true,
      event: { title: "Layla and Sam", venueName: "Matilda Bay Pavilion" },
      party: { displayName: "The Nguyen Family", tableLabel: "Table 4" },
    });
    expect(view.passes).toHaveLength(2);

    const linh = view.passes.find((pass) => pass.guestId === linhId);
    expect(linh).toMatchObject({ guestName: "Linh Nguyen", checkedInAt: null });
    linhQr = linh?.qr ?? "";
    expect(linhQr).toMatch(/^MV1\.pass_[0-9a-f-]+\.[A-Za-z0-9_-]{32}$/);

    // The signature is the one derived from this event's salt, and the QR is not the guest link.
    const invitation = await db.invitation.findUniqueOrThrow({
      where: { id: event.invitation.id },
    });
    expect(linhQr).toBe(signPass(invitation.salt, linh?.passId ?? "", event.id).qr);
    expect(linhQr).not.toContain(nguyen.token);
  });

  it("13. the host scans the pass: OK the first time, DUPLICATE the second", async () => {
    const scan = (qr: string, clientUuid: string) =>
      asHost("POST", `/v1/events/${event.id}/check-in/scans`, {
        method: "QR",
        qr,
        deviceId: "front-door-phone",
        scannedAt: new Date().toISOString(),
        clientUuid,
      });

    const firstUuid = randomUUID();
    const first = await scan(linhQr, firstUuid);
    expect(first.status).toBe(200);
    const ok = CheckInScanResultSchema.parse(await first.json());
    expect(ok.result).toBe("OK");
    expect(ok.guest).toMatchObject({
      guestId: linhId,
      name: "Linh Nguyen",
      partyDisplayName: "The Nguyen Family",
      tableLabel: "Table 4",
      severeAllergy: true,
    });
    expect(ok.firstCheckedInAt).not.toBeNull();

    // The phone resends the same scan after a dropped connection: same answer, no new row.
    const resent = CheckInScanResultSchema.parse(await (await scan(linhQr, firstUuid)).json());
    expect(resent).toMatchObject({ result: "OK", scanEventId: ok.scanEventId });

    // A second person shows a screenshot of the same pass.
    const second = CheckInScanResultSchema.parse(await (await scan(linhQr, randomUUID())).json());
    expect(second.result).toBe("DUPLICATE");
    expect(second.firstCheckedInAt).toBe(ok.firstCheckedInAt);

    // A tampered code is refused and leaves no trace.
    const forged = `${linhQr.slice(0, -4)}AAAA`;
    const invalid = CheckInScanResultSchema.parse(await (await scan(forged, randomUUID())).json());
    expect(invalid).toMatchObject({ result: "INVALID", scanEventId: null });

    const scans = await db.scanEvent.findMany({ where: { eventId: event.id } });
    expect(scans.map((row) => row.result).sort()).toEqual(["DUPLICATE", "OK"]);

    const roster = CheckInRosterSchema.parse(
      await (await asHost("GET", `/v1/events/${event.id}/check-in`)).json(),
    );
    expect(roster.totals).toEqual({ expected: 2, checkedIn: 1 });
    expect(roster.guests.find((guest) => guest.guestId === linhId)?.checkedInAt).not.toBeNull();

    // A guest link is not a door credential.
    const anonymous = await asGuest("GET", `/v1/events/${event.id}/check-in`);
    expect(anonymous.status).toBe(401);
  });

  // ── Wishing well ──────────────────────────────────────────────────────────

  it("14. the guest leaves a wish, which stays private until the host approves it", async () => {
    const res = await asGuest(
      "POST",
      guestPath(nguyen, "/wishes"),
      {
        authorName: "Linh and Tuan",
        message: "Wishing you a lifetime of happiness",
        shareOnWall: true,
      },
      { "idempotency-key": `e2e-wish-${suffix}` },
    );
    expect(res.status).toBe(201);
    const wish = GuestWishResultSchema.parse(await res.json());
    expect(wish).toMatchObject({ moderation: "PENDING", visibility: "WALL" });
    wishId = wish.id;

    expect((await guestView(nguyen)).wishes).toEqual([]);
    expect((await guestView(shah)).wishes).toEqual([]);
  });

  it("15. the host approves the wish and it appears on the invitation", async () => {
    const pending = HostWellEntryListSchema.parse(
      await (await asHost("GET", `/v1/events/${event.id}/well-entries?moderation=PENDING`)).json(),
    );
    expect(pending.items).toEqual([
      expect.objectContaining({
        id: wishId,
        partyDisplayName: "The Nguyen Family",
        authorName: "Linh and Tuan",
        message: "Wishing you a lifetime of happiness",
        moderation: "PENDING",
      }),
    ]);

    const approved = await asHost("PATCH", `/v1/events/${event.id}/well-entries/${wishId}`, {
      moderation: "APPROVED",
    });
    expect(approved.status).toBe(200);
    expect(HostWellEntrySchema.parse(await approved.json()).moderation).toBe("APPROVED");

    // Every guest of the event now sees it, without the party it came from.
    for (const party of [nguyen, shah]) {
      const view = await guestView(party);
      expect(view.wishes).toEqual([
        expect.objectContaining({
          id: wishId,
          authorName: "Linh and Tuan",
          message: "Wishing you a lifetime of happiness",
        }),
      ]);
    }
    expect(await db.auditLog.count({ where: { entityId: wishId, action: "well.moderate" } })).toBe(
      1,
    );
  });

  // ── Export ────────────────────────────────────────────────────────────────

  it("16. the guest list exports as a spreadsheet-safe CSV", async () => {
    const res = await asHost("GET", `/v1/events/${event.id}/guests/export.csv`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename=".+\.csv"/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const csv = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);

    // CRLF line ends only, and it reads back through the same parser the import uses.
    expect(csv.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
    const [header = [], ...rows] = parseCsv(csv).filter((row) => row.some((cell) => cell !== ""));
    expect(header).toEqual([
      "Party Name",
      "Guest Name",
      "Is Child",
      "Plus One",
      "Status",
      "Responded At",
      "Table",
      "Seats",
      "Tags",
      "Email",
      "Phone",
      "Checked In",
      "Invite Path",
    ]);
    const cell = (row: string[], name: string) => row[header.indexOf(name)] ?? "";
    const rowOf = (guestName: string) =>
      rows.find((row) => cell(row, "Guest Name") === guestName) ?? [];
    expect(rows.map((row) => cell(row, "Guest Name")).sort()).toEqual([
      "Arjun Shah",
      "Linh Nguyen",
      "Minh Nguyen",
      "Priya Shah",
      "Tuan Pham",
    ]);
    const linh = rowOf("Linh Nguyen");
    expect(cell(linh, "Party Name")).toBe("The Nguyen Family");
    expect(cell(linh, "Status")).toBe("YES");
    expect(cell(linh, "Table")).toBe("Table 4");
    expect(cell(linh, "Email")).toBe(guestEmail);
    expect(cell(linh, "Invite Path")).toBe(nguyen.invitePath);
    expect(cell(linh, "Checked In")).toBe("Yes");
    expect(cell(linh, "Plus One")).toBe("No");
    expect(cell(rowOf("Minh Nguyen"), "Status")).toBe("NO");
    expect(cell(rowOf("Priya Shah"), "Status")).toBe("PENDING");
    expect(cell(rowOf("Priya Shah"), "Checked In")).toBe("No");
    expect(cell(rowOf("Tuan Pham"), "Plus One")).toBe("Yes");
    // No health columns unless they are asked for.
    expect(csv).not.toMatch(/VEGETARIAN|adrenaline/);

    const withHealth = await asHost(
      "GET",
      `/v1/events/${event.id}/guests/export.csv?includeHealth=true`,
    );
    expect(withHealth.status).toBe(200);
    const healthCsv = await withHealth.text();
    const [healthHeader = [], ...healthRows] = parseCsv(healthCsv);
    expect(healthHeader.slice(-4)).toEqual([
      "Dietary",
      "Allergy Severity",
      "Allergy Notes",
      "Accessibility Notes",
    ]);
    const linhHealth = healthRows.find((row) => row.includes("Linh Nguyen")) ?? [];
    expect(linhHealth[healthHeader.indexOf("Dietary")]).toMatch(/VEGETARIAN/);
    expect(linhHealth[healthHeader.indexOf("Allergy Notes")]).toBe("Carries an adrenaline pen");
    // Nobody else has health details on file.
    expect(
      healthRows.filter((row) => (row[healthHeader.indexOf("Dietary")] ?? "") !== ""),
    ).toHaveLength(1);

    const exports = await db.auditLog.findMany({
      where: { entityId: event.id, action: { in: ["guest.export", "health.read"] } },
    });
    expect(exports.filter((row) => row.action === "guest.export")).toHaveLength(2);
    expect(JSON.stringify(exports)).not.toMatch(/Linh|VEGETARIAN|adrenaline/);
  });

  // ── Link revocation ───────────────────────────────────────────────────────

  it("17. revoking the link turns it into a 410 for every guest route", async () => {
    const res = await asHost("POST", `/v1/events/${event.id}/parties/${nguyen.id}/revoke-link`);
    expect(res.status).toBe(200);
    expect(HostPartySchema.parse(await res.json()).tokenRevokedAt).not.toBeNull();

    for (const [method, rest, body, headers] of [
      ["GET", "/status", undefined, undefined],
      ["GET", "", undefined, undefined],
      ["GET", "/passes", undefined, undefined],
      ["GET", "/calendar", undefined, undefined],
      [
        "POST",
        "/rsvp",
        { members: [{ guestId: linhId, status: "NO" }] },
        { "idempotency-key": `e2e-revoked-${suffix}` },
      ],
      ["POST", "/wishes", { authorName: "Linh", message: "One more" }, undefined],
    ] as const) {
      const gone = await asGuest(method, guestPath(nguyen, rest), body, headers);
      expect(gone.status, `${method} ${rest}`).toBe(410);
      expect((await errorOf(gone)).code, `${method} ${rest}`).toBe("LINK_REVOKED");
    }
    // Nothing was written through the dead link, and the other party is unaffected.
    expect((await db.rsvp.findUniqueOrThrow({ where: { guestId: linhId } })).status).toBe("YES");
    expect((await asGuest("GET", guestPath(shah, "/status"))).status).toBe(200);

    // A reissued link works; the old one stays dead.
    const reissued = HostPartySchema.parse(
      await (
        await asHost("POST", `/v1/events/${event.id}/parties/${nguyen.id}/reissue-link`)
      ).json(),
    );
    expect(reissued.token).not.toBe(nguyen.token);
    expect(reissued.tokenRevokedAt).toBeNull();
    expect((await asGuest("GET", guestPath(reissued, "/status"))).status).toBe(200);
    expect((await asGuest("GET", guestPath(nguyen, "/status"))).status).toBe(410);
    expect((await guestView(reissued)).rsvp.hasResponded).toBe(true);
  });

  // ── Isolation ─────────────────────────────────────────────────────────────

  it("18. a second host cannot see or change any of it", async () => {
    otherCookie = await signUp("Noor Rahimi", otherEmail);
    const asOther = (method: string, path: string, body?: unknown) =>
      send(method, path, {
        cookie: otherCookie,
        ...(body !== undefined ? { body } : {}),
        headers: { "idempotency-key": `e2e-other-${suffix}` },
      });

    const list = HostEventListSchema.parse(await (await asOther("GET", "/v1/events")).json());
    expect(list.items).toEqual([]);

    const before = JSON.stringify(
      await db.event.findUniqueOrThrow({
        where: { id: event.id },
        include: {
          invitation: { include: { parties: { include: { guests: true } }, wellEntries: true } },
        },
      }),
    );
    const jobsBefore = queue.jobs.length;

    const base = `/v1/events/${event.id}`;
    const attempts: Array<[method: string, path: string, body?: unknown]> = [
      ["GET", base],
      ["PATCH", base, { title: "Taken over" }],
      ["PATCH", `${base}/invitation`, { allowForwarding: false }],
      ["POST", `${base}/invitation/unpublish`],
      ["GET", `${base}/plan`],
      ["GET", `${base}/parties`],
      ["POST", `${base}/parties`, { displayName: "Gatecrashers" }],
      ["PATCH", `${base}/parties/${nguyen.id}`, { displayName: "Renamed" }],
      ["POST", `${base}/parties/${nguyen.id}/reissue-link`],
      ["POST", `${base}/parties/${nguyen.id}/guests`, { name: "Extra" }],
      [
        "PUT",
        `${base}/parties/${nguyen.id}/rsvp`,
        { members: [{ guestId: linhId, status: "NO" }] },
      ],
      ["DELETE", `${base}/parties/${nguyen.id}/guests/${linhId}`],
      ["DELETE", `${base}/parties/${shah.id}`],
      ["POST", `${base}/guests/import`, { csv: "name\nIntruder", dryRun: false }],
      ["GET", `${base}/guests/export.csv`],
      ["GET", `${base}/guests/export.csv?includeHealth=true`],
      ["GET", `${base}/responses`],
      ["GET", `${base}/responses/dietary`],
      ["GET", `${base}/messaging`],
      ["POST", `${base}/messaging/email-invitations`, { partyIds: "ALL", consentAttested: true }],
      ["GET", `${base}/check-in`],
      [
        "POST",
        `${base}/check-in/scans`,
        {
          method: "MANUAL",
          guestId: minhId,
          deviceId: "someone-else",
          scannedAt: new Date().toISOString(),
          clientUuid: randomUUID(),
        },
      ],
      ["GET", `${base}/well-entries`],
      ["PATCH", `${base}/well-entries/${wishId}`, { moderation: "REJECTED" }],
      ["DELETE", `${base}/well-entries/${wishId}`],
      ["DELETE", base],
    ];
    for (const [method, path, body] of attempts) {
      const res = await asOther(method, path, body);
      expect(res.status, `${method} ${path}`).toBe(404);
      const text = await res.text();
      expect(JSON.parse(text).error.code, `${method} ${path}`).toBe("NOT_FOUND");
      expect(text, `${method} ${path}`).not.toMatch(/Nguyen|Shah|Layla|Matilda/);
    }

    const after = JSON.stringify(
      await db.event.findUniqueOrThrow({
        where: { id: event.id },
        include: {
          invitation: { include: { parties: { include: { guests: true } }, wellEntries: true } },
        },
      }),
    );
    expect(after).toBe(before);
    expect(queue.jobs).toHaveLength(jobsBefore);

    // The first host still has everything.
    const mine = HostEventListSchema.parse(await (await asHost("GET", "/v1/events")).json());
    expect(mine.items).toHaveLength(1);
    expect(mine.items[0]).toMatchObject({
      id: event.id,
      status: "LIVE",
      invitation: { plan: "PREMIUM", effectivePlan: "PREMIUM" },
      counts: { parties: 2, guests: 5, yes: 2, pending: 2 },
    });
  });

  it("19. signing out ends the session", async () => {
    const res = await send("POST", "/api/auth/sign-out", { cookie: hostCookie, body: {} });
    expect(res.status).toBe(200);
    expect((await asHost("GET", "/v1/events")).status).toBe(401);
    const me = MeResponseSchema.parse(await (await asHost("GET", "/v1/me")).json());
    expect(me.user).toBeNull();
  });
});
