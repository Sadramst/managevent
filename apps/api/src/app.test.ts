/**
 * Application wiring: every contract router is mounted, the OpenAPI document describes exactly
 * what the app serves, and the cross-cutting middleware (CORS allowlist, origin guard, shared
 * dependencies) is in place.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@managevent/db";
import { LeadResponseSchema } from "@managevent/validators";
import { createApiApp } from "./app.js";
import { InMemoryJobQueue } from "./lib/queue.js";
import { createBillingRoutes } from "./modules/billing/routes.js";
import { createCheckInRoutes } from "./modules/checkin/routes.js";
import { createCrmRoutes } from "./modules/crm/routes.js";
import { createEventRoutes } from "./modules/events/routes.js";
import { createGuestListRoutes } from "./modules/guest-list/routes.js";
import { createGuestSiteRoutes } from "./modules/guest-site/routes.js";
import { createIdentityRoutes } from "./modules/identity/routes.js";
import { createMessagingRoutes } from "./modules/messaging/routes.js";
import { createResponsesRoutes } from "./modules/responses/routes.js";
import { createWellRoutes } from "./modules/well/routes.js";
import { generateOpenApiSpec } from "./openapi.js";
import { dbAvailable, uniqueTestSuffix } from "./test/db.js";
import { createStripeWebhookRoute } from "./webhooks/stripe.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

function operationsOf(spec: { paths: Record<string, Record<string, unknown>> }): string[] {
  const operations: string[] = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      if (item[method]) operations.push(`${method.toUpperCase()} ${path}`);
    }
  }
  return operations.sort();
}

describe("application wiring", () => {
  // The allowlist is derived from the environment; pin it so a developer's .env cannot change
  // what these tests mean.
  const savedTrustedOrigins = process.env.AUTH_TRUSTED_ORIGINS;
  beforeAll(() => {
    delete process.env.AUTH_TRUSTED_ORIGINS;
  });
  afterAll(() => {
    if (savedTrustedOrigins !== undefined) process.env.AUTH_TRUSTED_ORIGINS = savedTrustedOrigins;
  });

  it("exposes every contract router factory by its binding name", () => {
    const factories = {
      createIdentityRoutes,
      createEventRoutes,
      createBillingRoutes,
      createStripeWebhookRoute,
      createGuestSiteRoutes,
      createCheckInRoutes,
      createWellRoutes,
      createGuestListRoutes,
      createResponsesRoutes,
      createMessagingRoutes,
      createCrmRoutes,
    };
    for (const [name, factory] of Object.entries(factories)) {
      expect(typeof factory, name).toBe("function");
    }
  });

  it("serves an OpenAPI document identical in operations to generateOpenApiSpec()", async () => {
    const app = createApiApp({ disableRateLimits: true });
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    const served = (await res.json()) as { paths: Record<string, Record<string, unknown>> };
    const generated = generateOpenApiSpec();

    expect(operationsOf(served)).toEqual(operationsOf(generated));
    expect(operationsOf(generated)).toEqual(
      expect.arrayContaining(["GET /health", "GET /v1/leads", "POST /v1/leads"]),
    );
  });

  it("answers unknown routes with a 404 in the standard envelope", async () => {
    const app = createApiApp({ disableRateLimits: true });
    const res = await app.request("/v1/nope");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.requestId).toBeTruthy();
  });

  it("allows credentialed CORS only for trusted web origins", async () => {
    const app = createApiApp({ disableRateLimits: true });
    const preflight = (origin: string) =>
      app.request("/v1/leads", {
        method: "OPTIONS",
        headers: {
          origin,
          "access-control-request-method": "POST",
          "access-control-request-headers": "content-type,idempotency-key",
        },
      });

    const trusted = await preflight("http://localhost:3001");
    expect(trusted.headers.get("access-control-allow-origin")).toBe("http://localhost:3001");
    expect(trusted.headers.get("access-control-allow-credentials")).toBe("true");
    expect(trusted.headers.get("access-control-allow-headers")?.toLowerCase()).toContain(
      "idempotency-key",
    );
    expect(
      (await preflight("http://localhost:3100")).headers.get("access-control-allow-origin"),
    ).toBe("http://localhost:3100");

    for (const origin of ["https://evil.example", "http://localhost:30010", "null"]) {
      const res = await preflight(origin);
      expect(res.headers.get("access-control-allow-origin"), origin).toBeNull();
    }

    const simple = await app.request("/health", { headers: { origin: "https://evil.example" } });
    expect(simple.status).toBe(200);
    expect(simple.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects cookie-authenticated writes from untrusted origins before any handler runs", async () => {
    let resolved = 0;
    const app = createApiApp({
      disableRateLimits: true,
      resolveActor: async () => {
        resolved += 1;
        return { userId: "usr_host_1", roles: ["CUSTOMER_HOST"] };
      },
    });
    const res = await app.request("/v1/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "managevent.session_token=abc",
        origin: "https://evil.example",
      },
      body: JSON.stringify({ source: "CONTACT_FORM", name: "Sara", email: "sara@example.com" }),
    });
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("FORBIDDEN");
    expect(resolved).toBe(0);
  });

  it("can switch rate limiting off for tests", async () => {
    const limited = createApiApp({ rateLimit: { windowMs: 60_000, maxRequests: 1 } });
    const open = createApiApp({
      rateLimit: { windowMs: 60_000, maxRequests: 1 },
      disableRateLimits: true,
    });
    const bad = (target: typeof limited) =>
      target.request("/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.77" },
        body: JSON.stringify({ source: "CONTACT_FORM", name: "", email: "nope" }),
      });
    expect((await bad(limited)).status).toBe(400);
    expect((await bad(limited)).status).toBe(429);
    for (let i = 0; i < 3; i += 1) expect((await bad(open)).status).toBe(400);
  });
});

describe.skipIf(!dbAvailable)("application wiring (database)", () => {
  it("routes lead.created through the shared job queue from deps", async () => {
    const queue = new InMemoryJobQueue();
    const app = createApiApp({ deps: { queue }, disableRateLimits: true });
    const email = `lead-${uniqueTestSuffix()}@test.managevent.invalid`;

    const res = await app.request("/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "CONTACT_FORM", name: "Queue Test", email }),
    });
    expect(res.status).toBe(201);
    const lead = LeadResponseSchema.parse(await res.json());
    try {
      expect(queue.jobs).toHaveLength(1);
      expect(queue.jobs[0]).toMatchObject({
        name: "lead.created",
        payload: { leadId: lead.id },
        opts: { singletonKey: `lead.created:${lead.id}` },
      });
    } finally {
      await db.lead.deleteMany({ where: { id: lead.id } });
    }
  });
});
