/**
 * @managevent/api
 *
 * Hono API server on Node 22 (port 4000 by default).
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApiApp, type CreateApiAppOptions } from "./app.js";
import { clientIpConfigFromEnv } from "./lib/client-ip.js";
import { type ApiDeps, createDefaultDeps } from "./lib/deps.js";
import { InMemoryJobQueue, type JobName, type JobQueue, PgBossJobQueue } from "./lib/queue.js";
import { LeadRepository } from "./modules/crm/repo.js";
import {
  type JobQueueProducer,
  type LeadCreatedJobPayload,
  LeadService,
  PgBossLeadQueueProducer,
} from "./modules/crm/service.js";
import { generateOpenApiSpec, OPENAPI_DOCUMENT_CONFIG } from "./openapi.js";

export {
  type ApiDeps,
  createApiApp,
  type CreateApiAppOptions,
  createDefaultDeps,
  InMemoryJobQueue,
  type JobName,
  type JobQueue,
  PgBossJobQueue,
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
  const clientIpConfig = clientIpConfigFromEnv();
  if (process.env.NODE_ENV === "production" && !clientIpConfig.proxySecret) {
    // Not fatal, but worth saying loudly: without the shared secret the API cannot tell the
    // web apps' visitors apart, so they all share one rate-limit bucket per web server.
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "API_PROXY_SECRET is not set: forwarded client addresses are ignored",
        trustedClientIpHeader: clientIpConfig.trustedHeader,
      }),
    );
  }
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
