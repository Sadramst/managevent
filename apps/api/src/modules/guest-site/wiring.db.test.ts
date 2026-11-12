/**
 * How the guest-site, check-in and well routers are wired into the app: documented in the OpenAPI
 * spec, rate limited, and logged without the guest token.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiApp } from "../../app.js";
import { InMemoryJobQueue } from "../../lib/queue.js";
import { generateOpenApiSpec } from "../../openapi.js";
import { dbAvailable, TEST_CLIENT_IP } from "../../test/db.js";
import {
  cleanupEventFixture,
  createEventFixture,
  createPartyFixture,
  type EventFixture,
  type PartyFixture,
  uniqueTestSuffix,
} from "./test-fixtures.js";

describe("guest-site, check-in and well routes in the OpenAPI document", () => {
  it("documents every route of the contract with its request and responses", () => {
    const spec = generateOpenApiSpec();
    const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
    );
    expect(operations).toEqual(
      expect.arrayContaining([
        "GET /v1/i/{eventSlug}/{guestToken}/status",
        "GET /v1/i/{eventSlug}/{guestToken}",
        "POST /v1/i/{eventSlug}/{guestToken}/rsvp",
        "GET /v1/i/{eventSlug}/{guestToken}/passes",
        "GET /v1/i/{eventSlug}/{guestToken}/calendar",
        "POST /v1/i/{eventSlug}/{guestToken}/wishes",
        "GET /v1/public/demos",
        "POST /v1/public/legacy/resolve",
        "GET /v1/events/{eventId}/check-in",
        "POST /v1/events/{eventId}/check-in/scans",
        "GET /v1/events/{eventId}/well-entries",
        "PATCH /v1/events/{eventId}/well-entries/{entryId}",
        "DELETE /v1/events/{eventId}/well-entries/{entryId}",
      ]),
    );

    const responsesOf = (path: string, method: string) =>
      Object.keys(
        (spec.paths[path]?.[method] as { responses: Record<string, unknown> }).responses,
      ).sort();
    expect(responsesOf("/v1/i/{eventSlug}/{guestToken}/rsvp", "post")).toEqual(
      ["200", "400", "403", "404", "409", "410", "429"].sort(),
    );
    expect(responsesOf("/v1/i/{eventSlug}/{guestToken}/wishes", "post")).toEqual(
      ["200", "201", "400", "403", "404", "409", "410", "429"].sort(),
    );
    expect(responsesOf("/v1/events/{eventId}/well-entries/{entryId}", "delete")).toContain("204");

    const rsvp = spec.paths["/v1/i/{eventSlug}/{guestToken}/rsvp"]?.post as {
      parameters: Array<{ name: string; in: string; required?: boolean }>;
    };
    expect(rsvp.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "idempotency-key", in: "header", required: true }),
        expect.objectContaining({ name: "guestToken", in: "path", required: true }),
      ]),
    );
  });
});

describe.skipIf(!dbAvailable)("guest-site wiring (database)", () => {
  let fixture: EventFixture;
  let party: PartyFixture;

  beforeAll(async () => {
    fixture = await createEventFixture({ wellMode: "WISHING_WELL" });
    party = await createPartyFixture(fixture, {
      displayName: "Wiring Family",
      guests: [{ name: "Wil Wiring" }],
    });
  });

  afterAll(async () => {
    await cleanupEventFixture(fixture);
  });

  /** A real app with rate limits ON. Counters are per app, so each test gets fresh ones. */
  function limitedApp(logSink?: (entry: Record<string, unknown>) => void) {
    return createApiApp({
      deps: { queue: new InMemoryJobQueue() },
      resolveActor: async () => null,
      clientIp: TEST_CLIENT_IP,
      ...(logSink ? { logSink } : {}),
    });
  }

  it("stops link guessing: after 30 misses from one address, even a real link gets 429", async () => {
    const app = limitedApp();
    const ip = "198.51.100.77";
    const good = `/v1/i/${fixture.eventSlug}/${party.token}/status`;
    expect((await app.request(good, { headers: { "x-forwarded-for": ip } })).status).toBe(200);

    for (let i = 0; i < 30; i += 1) {
      const res = await app.request(
        `/v1/i/${fixture.eventSlug}/guess-${i}-2345678${(i % 8) + 2}/status`,
        {
          headers: { "x-forwarded-for": ip },
        },
      );
      expect(res.status, `miss ${i + 1}`).toBe(404);
    }
    const blocked = await app.request(good, { headers: { "x-forwarded-for": ip } });
    expect(blocked.status).toBe(429);
    expect(((await blocked.json()) as { error: { code: string } }).error.code).toBe("RATE_LIMITED");
    expect(blocked.headers.get("retry-after")).toMatch(/^\d+$/);

    // Another visitor is unaffected.
    const other = await app.request(good, { headers: { "x-forwarded-for": "198.51.100.78" } });
    expect(other.status).toBe(200);
  });

  it("counts a miss on EVERY link route against the same budget: there is no unguarded oracle", async () => {
    const good = `/v1/i/${fixture.eventSlug}/${party.token}`;
    const guess = (i: number) => `/v1/i/${fixture.eventSlug}/guess-${i}-2345678${(i % 8) + 2}`;
    const routes: Array<{ suffix: string; init?: RequestInit }> = [
      { suffix: "/calendar" },
      { suffix: "/passes" },
      {
        suffix: "/wishes",
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ authorName: "Guess", message: "Guess" }),
        },
      },
    ];

    for (const [index, route] of routes.entries()) {
      // Counters are per app, so every route starts from zero.
      const app = limitedApp();
      const ip = `198.51.100.${90 + index}`;
      const send = (path: string) =>
        app.request(`${path}${route.suffix}`, {
          ...route.init,
          headers: { ...(route.init?.headers as Record<string, string>), "x-forwarded-for": ip },
        });
      const status = () => app.request(`${good}/status`, { headers: { "x-forwarded-for": ip } });
      // 20 misses on a route that has always been guarded...
      for (let i = 0; i < 20; i += 1) {
        const res = await app.request(`${guess(i)}/status`, {
          headers: { "x-forwarded-for": ip },
        });
        expect(res.status).toBe(404);
      }
      expect((await status()).status).toBe(200);
      // ...then 10 on the route under test. They must count too.
      for (let i = 20; i < 30; i += 1) {
        expect((await send(guess(i))).status, `${route.suffix} miss ${i + 1}`).toBe(404);
      }
      // The budget is spent: the route refuses the next guess...
      expect((await send(guess(31))).status, route.suffix).toBe(429);
      // ...and so does every other link route for that caller, real link or not.
      expect((await status()).status, route.suffix).toBe(429);
    }
  });

  it("limits writes per guest link (10 a minute), whatever address they come from", async () => {
    const app = limitedApp();
    const path = `/v1/i/${fixture.eventSlug}/${party.token}/wishes`;
    const post = (i: number) =>
      app.request(path, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${i + 1}` },
        // Invalid on purpose: the limiter runs before validation and nothing is stored.
        body: JSON.stringify({ authorName: "", message: "" }),
      });
    for (let i = 0; i < 10; i += 1) expect((await post(i)).status, `write ${i + 1}`).toBe(400);
    expect((await post(10)).status).toBe(429);
  });

  it("never writes the guest token to the request log", async () => {
    const entries: Array<Record<string, unknown>> = [];
    const app = limitedApp((entry) => entries.push(entry));
    const key = `idem-${uniqueTestSuffix()}`;
    await app.request(`/v1/i/${fixture.eventSlug}/${party.token}`);
    await app.request(`/v1/i/${fixture.eventSlug}/${party.token}/rsvp`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({
        members: [{ guestId: party.guestIds[0], status: "YES" }],
        messageToHost: "A private message that must not be logged",
      }),
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.status)).toEqual([200, 200]);
    expect(entries[1]?.path).toBe(`/v1/i/${fixture.eventSlug}/[REDACTED]/rsvp`);
    const logged = JSON.stringify(entries);
    expect(logged).not.toContain(party.token);
    expect(logged).not.toContain(party.token.slice(-8));
    expect(logged).not.toContain("private message");
    expect(logged).not.toContain(key);
  });
});
