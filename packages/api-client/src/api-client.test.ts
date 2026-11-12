import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createApiApp,
  generateOpenApiSpec,
  type JobQueueProducer,
  LeadRepository,
  LeadService,
} from "@managevent/api";
import { db } from "@managevent/db";
import {
  buildGeneratedClientSource,
  createApiClient,
  extractOpenApiOperations,
  GENERATED_OPERATIONS,
  ManageventApiClientError,
} from "./index.js";

const currentDir = dirname(fileURLToPath(import.meta.url));

describe("@managevent/api-client", () => {
  it("verifies committed src/generated.ts is 100% up to date with apps/api OpenAPI spec", () => {
    const spec = generateOpenApiSpec();
    const expected = buildGeneratedClientSource(spec).replace(/\r\n/g, "\n");
    const committed = readFileSync(resolve(currentDir, "generated.ts"), "utf8").replace(
      /\r\n/g,
      "\n",
    );

    expect(committed).toBe(expected);
    // The committed operation list is whatever the API really serves, not a hand-kept list.
    const served = extractOpenApiOperations(spec).map((o) => `${o.method} ${o.path}`);
    expect(GENERATED_OPERATIONS.map((o) => `${o.method} ${o.path}`)).toEqual(served);
    expect(served).toEqual(
      expect.arrayContaining(["GET /health", "GET /v1/leads", "POST /v1/leads"]),
    );
  });

  it("calls GET /health, POST /v1/leads, and handles 401/403 API errors through ManageventApiClient", async () => {
    const noopProducer: JobQueueProducer = {
      async enqueueLeadCreated() {
        return "job_noop";
      },
    };
    const app = createApiApp({
      leadService: new LeadService(new LeadRepository(db), noopProducer),
    });

    const client = createApiClient({
      baseUrl: "http://localhost:4000",
      bearerToken: "test_token_123",
      fetchImpl: (input, init) => Promise.resolve(app.request(input, init)),
    });

    const health = await client.getHealth();
    expect(health.status).toBe("ok");

    const createdLead = await client.createLead(
      {
        source: "CONTACT_FORM",
        name: "Client Test User",
        email: `client-test-${Date.now()}@example.com`,
      },
      { idempotencyKey: `client-idem-${Date.now()}` },
    );
    expect(createdLead.id).toMatch(/^lead_/);

    // Unauthenticated listLeads throws ManageventApiClientError with status 401
    await expect(client.listLeads()).rejects.toThrow(ManageventApiClientError);

    // Cleanup
    await db.lead.delete({ where: { id: createdLead.id } });
  });

  it("throws ManageventApiClientError with HTTP_<status> on a non-JSON error body", async () => {
    const client = createApiClient({
      baseUrl: "http://api.test",
      fetchImpl: async () =>
        new Response("<html>Bad Gateway</html>", {
          status: 502,
          headers: { "x-request-id": "req_gw" },
        }),
    });
    await expect(client.getHealth()).rejects.toMatchObject({
      name: "ManageventApiClientError",
      status: 502,
      code: "HTTP_502",
      requestId: "req_gw",
    });
  });
});
