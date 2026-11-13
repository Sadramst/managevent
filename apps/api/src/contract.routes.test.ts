/**
 * The route table of the implementation contract (section C), written out by hand.
 *
 * Three things are checked against it:
 * 1. the OpenAPI document lists exactly these operations (nothing missing, nothing extra) and
 *    documents the stated success status;
 * 2. signed-out requests: every session route answers `401 UNAUTHENTICATED`, every public route
 *    answers something else;
 * 3. signed-in as the wrong person: another host gets a neutral `404` on every event-scoped
 *    route, and a host gets `403` on every staff route.
 *
 * When a route is added, renamed or removed, this list has to change with it.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, generateId } from "@managevent/db";
import { LeadStageEnum } from "@managevent/validators";
import {
  cleanupEventFixture,
  createEventFixture,
  createPartyFixture,
  type EventFixture,
  type PartyFixture,
} from "./modules/guest-site/test-fixtures.js";
import { generateOpenApiSpec } from "./openapi.js";
import { dbAvailable, uniqueTestSuffix } from "./test/db.js";
import { createHostTestApp, createTestUser, type TestUser } from "./test/hosts.js";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Auth =
  /** No session needed. */
  | "public"
  /** No session needed; the guest link in the path is the credential. */
  | "public-token"
  /** A signed-in user, authorised per event through `requireEventAccess`. */
  | "event"
  /** A signed-in user, not tied to one event. */
  | "session"
  /** Managevent staff only (`lead:*` or `site_settings:manage`). */
  | "staff";

interface ContractRoute {
  method: Method;
  path: string;
  auth: Auth;
  /** The success status the contract states. */
  success: number;
  /** A body that passes request validation, so the request reaches the authorisation check. */
  body?: (ids: PathIds) => unknown;
  /** The route requires an `Idempotency-Key` header. */
  idempotencyKey?: true;
  /** Served by a plain Hono route, so it is deliberately absent from the OpenAPI document. */
  notInOpenApi?: true;
}

interface PathIds {
  eventId: string;
  partyId: string;
  guestId: string;
  entryId: string;
  leadId: string;
  eventSlug: string;
  guestToken: string;
}

const scan = (ids: PathIds) => ({
  method: "MANUAL",
  guestId: ids.guestId,
  deviceId: "contract-test-device",
  scannedAt: new Date().toISOString(),
  clientUuid: randomUUID(),
});
const campaign = () => ({ partyIds: "ALL", consentAttested: true });

const CONTRACT_ROUTES: readonly ContractRoute[] = [
  { method: "GET", path: "/health", auth: "public", success: 200 },

  // Engineer 1: identity, events, billing, Stripe webhook
  { method: "GET", path: "/v1/me", auth: "public", success: 200 },
  { method: "GET", path: "/v1/events", auth: "session", success: 200 },
  {
    method: "POST",
    path: "/v1/events",
    auth: "session",
    success: 201,
    body: () => ({
      title: "Contract Test Wedding",
      ceremonySlug: "wedding",
      startsAtLocal: "2031-03-14T16:00",
      templateSlug: "royal-classic",
      hosts: "Ada and Bo",
    }),
  },
  { method: "GET", path: "/v1/events/{eventId}", auth: "event", success: 200 },
  {
    method: "PATCH",
    path: "/v1/events/{eventId}",
    auth: "event",
    success: 200,
    body: () => ({ title: "Renamed" }),
  },
  { method: "DELETE", path: "/v1/events/{eventId}", auth: "event", success: 204 },
  {
    method: "PATCH",
    path: "/v1/events/{eventId}/invitation",
    auth: "event",
    success: 200,
    body: () => ({ allowForwarding: true }),
  },
  { method: "POST", path: "/v1/events/{eventId}/invitation/publish", auth: "event", success: 200 },
  {
    method: "POST",
    path: "/v1/events/{eventId}/invitation/unpublish",
    auth: "event",
    success: 200,
  },
  { method: "GET", path: "/v1/events/{eventId}/plan", auth: "event", success: 200 },
  {
    method: "POST",
    path: "/v1/events/{eventId}/plan/checkout",
    auth: "event",
    success: 201,
    body: () => ({}),
    idempotencyKey: true,
  },
  {
    method: "POST",
    path: "/v1/events/{eventId}/plan/checkout/confirm",
    auth: "event",
    success: 200,
    body: () => ({ sessionId: "cs_test_contract_route_check" }),
  },
  { method: "POST", path: "/v1/webhooks/stripe", auth: "public", success: 200, body: () => ({}) },

  // Engineer 2: guest micro-site, check-in, well
  {
    method: "GET",
    path: "/v1/i/{eventSlug}/{guestToken}/status",
    auth: "public-token",
    success: 200,
  },
  { method: "GET", path: "/v1/i/{eventSlug}/{guestToken}", auth: "public-token", success: 200 },
  {
    method: "POST",
    path: "/v1/i/{eventSlug}/{guestToken}/rsvp",
    auth: "public-token",
    success: 200,
    body: (ids) => ({ members: [{ guestId: ids.guestId, status: "YES" }] }),
    idempotencyKey: true,
  },
  {
    method: "GET",
    path: "/v1/i/{eventSlug}/{guestToken}/passes",
    auth: "public-token",
    success: 200,
  },
  {
    method: "GET",
    path: "/v1/i/{eventSlug}/{guestToken}/calendar",
    auth: "public-token",
    success: 200,
  },
  {
    method: "POST",
    path: "/v1/i/{eventSlug}/{guestToken}/wishes",
    auth: "public-token",
    success: 201,
    body: () => ({ authorName: "Contract Test", message: "With love" }),
  },
  { method: "GET", path: "/v1/public/demos", auth: "public", success: 200 },
  {
    method: "POST",
    path: "/v1/public/legacy/resolve",
    auth: "public",
    success: 200,
    body: () => ({ path: "/anniversary/contract-route-check" }),
  },
  { method: "GET", path: "/v1/events/{eventId}/check-in", auth: "event", success: 200 },
  {
    method: "POST",
    path: "/v1/events/{eventId}/check-in/scans",
    auth: "event",
    success: 200,
    body: scan,
  },
  { method: "GET", path: "/v1/events/{eventId}/well-entries", auth: "event", success: 200 },
  {
    method: "PATCH",
    path: "/v1/events/{eventId}/well-entries/{entryId}",
    auth: "event",
    success: 200,
    body: () => ({ moderation: "APPROVED" }),
  },
  {
    method: "DELETE",
    path: "/v1/events/{eventId}/well-entries/{entryId}",
    auth: "event",
    success: 204,
  },

  // Engineer 3: guest list, responses, messaging, CRM
  { method: "GET", path: "/v1/events/{eventId}/parties", auth: "event", success: 200 },
  {
    method: "POST",
    path: "/v1/events/{eventId}/parties",
    auth: "event",
    success: 201,
    body: () => ({ displayName: "Contract Family" }),
  },
  {
    method: "PATCH",
    path: "/v1/events/{eventId}/parties/{partyId}",
    auth: "event",
    success: 200,
    body: () => ({ displayName: "Renamed Family" }),
  },
  { method: "DELETE", path: "/v1/events/{eventId}/parties/{partyId}", auth: "event", success: 204 },
  {
    method: "POST",
    path: "/v1/events/{eventId}/parties/{partyId}/revoke-link",
    auth: "event",
    success: 200,
  },
  {
    method: "POST",
    path: "/v1/events/{eventId}/parties/{partyId}/reissue-link",
    auth: "event",
    success: 200,
  },
  {
    method: "POST",
    path: "/v1/events/{eventId}/parties/{partyId}/guests",
    auth: "event",
    success: 201,
    body: () => ({ name: "Extra Guest" }),
  },
  {
    method: "PATCH",
    path: "/v1/events/{eventId}/parties/{partyId}/guests/{guestId}",
    auth: "event",
    success: 200,
    body: () => ({ name: "Renamed Guest" }),
  },
  {
    method: "DELETE",
    path: "/v1/events/{eventId}/parties/{partyId}/guests/{guestId}",
    auth: "event",
    success: 204,
  },
  {
    method: "PUT",
    path: "/v1/events/{eventId}/parties/{partyId}/rsvp",
    auth: "event",
    success: 200,
    body: (ids) => ({ members: [{ guestId: ids.guestId, status: "YES" }] }),
  },
  {
    method: "POST",
    path: "/v1/events/{eventId}/guests/import",
    auth: "event",
    success: 200,
    body: () => ({ csv: "name\nContract Import", dryRun: true }),
  },
  {
    method: "GET",
    path: "/v1/events/{eventId}/guests/export.csv",
    auth: "event",
    success: 200,
    notInOpenApi: true,
  },
  { method: "GET", path: "/v1/events/{eventId}/responses", auth: "event", success: 200 },
  { method: "GET", path: "/v1/events/{eventId}/responses/dietary", auth: "event", success: 200 },
  { method: "GET", path: "/v1/events/{eventId}/messaging", auth: "event", success: 200 },
  {
    method: "POST",
    path: "/v1/events/{eventId}/messaging/email-invitations",
    auth: "event",
    success: 202,
    body: campaign,
    idempotencyKey: true,
  },
  {
    method: "POST",
    path: "/v1/events/{eventId}/messaging/rsvp-reminders",
    auth: "event",
    success: 202,
    body: campaign,
    idempotencyKey: true,
  },
  {
    method: "POST",
    path: "/v1/public/unsubscribe",
    auth: "public",
    success: 200,
    body: () => ({ token: "contract-route-check.not-a-real-token" }),
  },
  {
    method: "POST",
    path: "/v1/leads",
    auth: "public",
    success: 201,
    // Invalid on purpose: a signed-out request must get a validation error, not a 401, and no
    // lead is stored.
    body: () => ({ source: "CONTACT_FORM", name: "", email: "not-an-email" }),
  },
  { method: "GET", path: "/v1/leads", auth: "staff", success: 200 },
  { method: "GET", path: "/v1/leads/{leadId}", auth: "staff", success: 200 },
  {
    method: "PATCH",
    path: "/v1/leads/{leadId}",
    auth: "staff",
    success: 200,
    body: () => ({ stage: LeadStageEnum.options[1] }),
  },

  // Staff-editable contact details
  { method: "GET", path: "/v1/site-settings", auth: "public", success: 200 },
  { method: "GET", path: "/v1/admin/site-settings", auth: "staff", success: 200 },
  {
    method: "PUT",
    path: "/v1/admin/site-settings",
    auth: "staff",
    success: 200,
    body: () => ({
      contactEmail: "contract@test.managevent.invalid",
      contactPhone: "",
      notificationEmail: "",
    }),
  },
];

const label = (route: ContractRoute) => `${route.method} ${route.path}`;

function fillPath(path: string, ids: PathIds): string {
  return path.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = (ids as unknown as Record<string, string | undefined>)[name];
    if (value === undefined) throw new Error(`No test value for path parameter {${name}}`);
    return value;
  });
}

function buildRequest(route: ContractRoute, ids: PathIds, headers: Record<string, string> = {}) {
  const body = route.body?.(ids);
  const init: RequestInit = {
    method: route.method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(route.idempotencyKey ? { "idempotency-key": `contract-${uniqueTestSuffix()}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  return { path: fillPath(route.path, ids), init };
}

async function errorCode(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: { code?: string } };
    return body.error?.code ?? null;
  } catch {
    return null;
  }
}

describe("contract route table: OpenAPI document", () => {
  const spec = generateOpenApiSpec();

  it("lists exactly the contract's JSON operations", () => {
    const served = Object.entries(spec.paths)
      .flatMap(([path, methods]) =>
        Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
      )
      .sort();
    const expected = CONTRACT_ROUTES.filter((route) => !route.notInOpenApi)
      .map(label)
      .sort();
    expect(served).toEqual(expected);
  });

  it("has no duplicate entry in the contract list", () => {
    const labels = CONTRACT_ROUTES.map(label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it.each(
    CONTRACT_ROUTES.filter((route) => !route.notInOpenApi).map((r) => [label(r), r] as const),
  )("%s documents its success status and, for a session route, the 401", (_label, route) => {
    const operation = spec.paths[route.path]?.[route.method.toLowerCase()] as
      { responses?: Record<string, unknown> } | undefined;
    const statuses = Object.keys(operation?.responses ?? {});
    expect(statuses).toContain(String(route.success));
    const needsSession =
      route.auth === "event" || route.auth === "session" || route.auth === "staff";
    if (needsSession) expect(statuses).toContain("401");
    else expect(statuses).not.toContain("401");
  });
});

describe.skipIf(!dbAvailable)("contract route table: authorisation (database)", () => {
  let fixture: EventFixture;
  let party: PartyFixture;
  let otherHost: TestUser;
  let ids: PathIds;
  const entryId = generateId("wel_");
  const harness = createHostTestApp();

  /** Everything that must be untouched after a request that was refused. */
  async function snapshot() {
    const [event, invitation, parties, guests, rsvps, entry, scans, campaigns] = await Promise.all([
      db.event.findUniqueOrThrow({ where: { id: fixture.eventId } }),
      db.invitation.findUniqueOrThrow({ where: { id: fixture.invitationId } }),
      db.party.findMany({ where: { invitationId: fixture.invitationId }, orderBy: { id: "asc" } }),
      db.guest.findMany({
        where: { party: { invitationId: fixture.invitationId } },
        orderBy: { id: "asc" },
      }),
      db.rsvp.count({ where: { guest: { party: { invitationId: fixture.invitationId } } } }),
      db.wellEntry.findUniqueOrThrow({ where: { id: entryId } }),
      db.scanEvent.count({ where: { eventId: fixture.eventId } }),
      db.campaign.count({ where: { invitationId: fixture.invitationId } }),
    ]);
    return JSON.stringify({ event, invitation, parties, guests, rsvps, entry, scans, campaigns });
  }

  beforeAll(async () => {
    fixture = await createEventFixture({ plan: "PREMIUM", wellMode: "WISHING_WELL" });
    party = await createPartyFixture(fixture, {
      displayName: "Contract Route Family",
      guests: [{ name: "Cora Contract" }, { name: "Cal Contract" }],
    });
    await db.wellEntry.create({
      data: {
        id: entryId,
        invitationId: fixture.invitationId,
        partyId: party.partyId,
        authorName: "Cora Contract",
        message: "Congratulations to you both",
        visibility: "WALL",
        moderation: "PENDING",
      },
    });
    otherHost = await createTestUser();
    ids = {
      eventId: fixture.eventId,
      partyId: party.partyId,
      guestId: party.guestIds[0] as string,
      entryId,
      leadId: generateId("lead_"),
      eventSlug: fixture.eventSlug,
      guestToken: party.token,
    };
  });

  afterAll(async () => {
    await otherHost?.cleanup();
    if (fixture) await cleanupEventFixture(fixture);
  });

  const sessionRoutes = CONTRACT_ROUTES.filter(
    (route) => route.auth === "event" || route.auth === "session" || route.auth === "staff",
  );
  const openRoutes = CONTRACT_ROUTES.filter(
    (route) => route.auth === "public" || route.auth === "public-token",
  );
  const eventRoutes = CONTRACT_ROUTES.filter((route) => route.auth === "event");
  const staffRoutes = CONTRACT_ROUTES.filter((route) => route.auth === "staff");

  it("covers every kind of route", () => {
    expect(sessionRoutes.length + openRoutes.length).toBe(CONTRACT_ROUTES.length);
    expect(eventRoutes.length).toBeGreaterThan(25);
    expect(staffRoutes).toHaveLength(5);
  });

  it("answers 401 UNAUTHENTICATED on every session route when signed out, and changes nothing", async () => {
    const before = await snapshot();
    for (const route of sessionRoutes) {
      const { path, init } = buildRequest(route, ids);
      const res = await harness.app.request(path, init);
      expect(res.status, label(route)).toBe(401);
      expect(await errorCode(res), label(route)).toBe("UNAUTHENTICATED");
    }
    expect(await snapshot()).toBe(before);
  });

  it("never asks for a session on a public route", async () => {
    // Read-only pass over the public routes: unknown link, so nothing is written.
    const unknownLink: PathIds = { ...ids, guestToken: "nobody-here-23456789" };
    for (const route of openRoutes) {
      const { path, init } = buildRequest(route, unknownLink);
      const res = await harness.app.request(path, init);
      expect(res.status, label(route)).not.toBe(401);
      expect(res.status, label(route)).not.toBe(403);
      // 503 is the honest answer of a provider-backed route without credentials (the webhook).
      expect([500, 502, 504], label(route)).not.toContain(res.status);
      if (route.auth === "public-token") {
        // An unknown link is a real, neutral 404 on every guest route.
        expect(res.status, label(route)).toBe(404);
        expect(await errorCode(res), label(route)).toBe("NOT_FOUND");
      }
    }
  });

  it("serves the public-token read routes for a live link without a session", async () => {
    for (const route of openRoutes.filter((r) => r.auth === "public-token" && r.method === "GET")) {
      const { path, init } = buildRequest(route, ids);
      const res = await harness.app.request(path, init);
      expect(res.status, label(route)).toBe(route.success);
    }
  });

  it("gives another host a neutral 404 on every event route, and changes nothing", async () => {
    const before = await snapshot();
    const headers = harness.actAs(otherHost);
    for (const route of eventRoutes) {
      const { path, init } = buildRequest(route, ids, headers);
      const res = await harness.app.request(path, init);
      expect(res.status, label(route)).toBe(404);
      expect(await errorCode(res), label(route)).toBe("NOT_FOUND");
    }
    expect(await snapshot()).toBe(before);
    expect(harness.queue.jobs).toHaveLength(0);
  });

  it("refuses a host on every staff route with 403", async () => {
    const headers = harness.actAs(otherHost);
    for (const route of staffRoutes) {
      const { path, init } = buildRequest(route, ids, headers);
      const res = await harness.app.request(path, init);
      expect(res.status, label(route)).toBe(403);
      expect(await errorCode(res), label(route)).toBe("FORBIDDEN");
    }
  });

  it("lets the session routes through for a signed-in host (list and create are not event-scoped)", async () => {
    const headers = harness.actAs(otherHost);
    const res = await harness.app.request("/v1/events", { headers });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });
});
