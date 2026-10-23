/**
 * @managevent/api
 *
 * Hono API server on Node 22 (port 4000 by default).
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApiApp, type CreateApiAppOptions } from "./app.js";
import { LeadRepository } from "./modules/crm/repo.js";
import {
  type JobQueueProducer,
  type LeadCreatedJobPayload,
  LeadService,
  PgBossLeadQueueProducer,
} from "./modules/crm/service.js";
import { generateOpenApiSpec, OPENAPI_DOCUMENT_CONFIG } from "./openapi.js";

export {
  createApiApp,
  type CreateApiAppOptions,
  generateOpenApiSpec,
  type JobQueueProducer,
  type LeadCreatedJobPayload,
  LeadRepository,
  LeadService,
  OPENAPI_DOCUMENT_CONFIG,
  PgBossLeadQueueProducer,
};

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isMainModule) {
  const port = Number.parseInt(process.env.PORT ?? "4000", 10);
  const app = createApiApp();
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.info(
        JSON.stringify({
          level: "info",
          msg: "Managevent API listening",
          port: info.port,
          region: process.env.FLY_REGION ?? "syd",
        }),
      );
    },
  );
}
