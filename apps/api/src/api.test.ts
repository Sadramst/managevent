import { describe, expect, it } from "vitest";
import { db } from "@managevent/db";
import { HealthResponseSchema, LeadResponseSchema } from "@managevent/validators";
import {
  createApiApp,
  generateOpenApiSpec,
  type JobQueueProducer,
  type LeadCreatedJobPayload,
  LeadRepository,
  LeadService,
} from "./index.js";

describe("@managevent/api", () => {
  it("GET /health returns 200 OK matching HealthResponseSchema and sets X-Request-Id", async () => {
    const logs: Array<Record<string, unknown>> = [];
    const app = createApiApp({
      logSink: (entry) => logs.push(entry),
    });

    const res = await app.request("/health", {
      headers: { "x-request-id": "req_custom_health_1" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req_custom_health_1");

    const body: unknown = await res.json();
    const parsed = HealthResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.requestId).toBe("req_custom_health_1");
  });

  it("GET /openapi.json returns a valid OpenAPI 3.1 specification generated from Zod", async () => {
    const app = createApiApp();
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);

    const spec = (await res.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.paths["/health"]).toBeDefined();
    expect(spec.paths["/v1/leads"]).toBeDefined();

    const directSpec = generateOpenApiSpec();
    expect(directSpec.openapi).toBe("3.1.0");
  });

  it("POST /v1/leads validates with Zod, normalises Farsi text, stores Lead + ConsentRecord in Postgres, enqueues lead.created job, and supports Idempotency-Key", async () => {
    const enqueuedJobs: Array<{ payload: LeadCreatedJobPayload; singletonKey: string }> = [];
    const mockProducer: JobQueueProducer = {
      async enqueueLeadCreated(payload, singletonKey) {
        enqueuedJobs.push({ payload, singletonKey });
        return `job_${singletonKey}`;
      },
    };

    const service = new LeadService(new LeadRepository(db), mockProducer);
    const app = createApiApp({ leadService: service });

    const idempotencyKey = `idem-lead-${Date.now()}`;
    const payload = {
      source: "BUILDER",
      name: "سارا احمدي", // Contains Arabic Yeh (\u064A) -> should be normalised to Persian Yeh (\u06CC)
      email: `sara-${Date.now()}@example.com`,
      phone: "+61412345678",
      preferredLanguage: "fa",
      preferredChannel: "WHATSAPP",
      ceremonySlug: "sofreh-aghd",
      guestEstimate: 90,
      area: "Swan Valley",
      marketingConsent: true,
    };

    // First POST creates a new Lead (201) and enqueues the job
    const res1 = await app.request("/v1/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    expect(res1.status).toBe(201);
    const body1: unknown = await res1.json();
    const parsedLead = LeadResponseSchema.parse(body1);
    expect(parsedLead.name).toBe("سارا احمدی"); // Normalised Persian Yeh!
    expect(parsedLead.marketingConsentId).toMatch(/^cns_/);
    expect(enqueuedJobs).toHaveLength(1);
    expect(enqueuedJobs[0]?.payload.leadId).toBe(parsedLead.id);

    // Second POST with same Idempotency-Key returns 200 without duplicating Lead or job
    const res2 = await app.request("/v1/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    expect(res2.status).toBe(200);
    const body2 = LeadResponseSchema.parse(await res2.json());
    expect(body2.id).toBe(parsedLead.id);
    expect(enqueuedJobs).toHaveLength(1);

    // Cleanup test lead and consent record
    await db.lead.delete({ where: { id: parsedLead.id } });
    if (parsedLead.marketingConsentId) {
      await db.consentRecord.delete({ where: { id: parsedLead.marketingConsentId } });
    }
  });

  it("POST /v1/leads rejects invalid payloads (400) and enforces rate limiting (429)", async () => {
    const app = createApiApp({
      rateLimit: { windowMs: 60_000, maxRequests: 2 },
    });

    // Invalid payload -> 400
    const badRes = await app.request("/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.99" },
      body: JSON.stringify({ source: "CONTACT_FORM", name: "", email: "not-an-email" }),
    });
    expect(badRes.status).toBe(400);

    // Second request from 10.0.0.99 -> 400 (within limit of 2)
    await app.request("/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.99" },
      body: JSON.stringify({ source: "CONTACT_FORM", name: "", email: "not-an-email" }),
    });

    // Third request from 10.0.0.99 -> 429 RATE_LIMITED
    const rateLimitedRes = await app.request("/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.99" },
      body: JSON.stringify({ source: "CONTACT_FORM", name: "Sara", email: "sara@example.com" }),
    });
    expect(rateLimitedRes.status).toBe(429);
  });

  it("GET /v1/leads enforces requirePermission('lead:read') (401 unauthenticated, 403 CUSTOMER_HOST, 200 PLANNER_STAFF)", async () => {
    const app = createApiApp();

    const unauthRes = await app.request("/v1/leads");
    expect(unauthRes.status).toBe(401);

    const forbiddenRes = await app.request("/v1/leads", {
      headers: {
        "x-managevent-user-id": "usr_host_1",
        "x-managevent-roles": "CUSTOMER_HOST",
      },
    });
    expect(forbiddenRes.status).toBe(403);

    const allowedRes = await app.request("/v1/leads", {
      headers: {
        "x-managevent-user-id": "usr_staff_1",
        "x-managevent-roles": "PLANNER_STAFF",
      },
    });
    expect(allowedRes.status).toBe(200);
    const data = (await allowedRes.json()) as { items: unknown[] };
    expect(Array.isArray(data.items)).toBe(true);
  });
});
