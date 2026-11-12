/**
 * The single list of module routers. `createApiApp` (HTTP) and `generateOpenApiSpec` (contract)
 * both mount through here, so a route can never be served without being documented or the reverse.
 */
import type { OpenAPIHono } from "@hono/zod-openapi";
import type { ApiDeps } from "./lib/deps.js";
import type { ApiEnv } from "./middleware/context.js";
import { createBillingRoutes } from "./modules/billing/routes.js";
import { createCheckInRoutes } from "./modules/checkin/routes.js";
import { LeadRepository } from "./modules/crm/repo.js";
import { createCrmRoutes } from "./modules/crm/routes.js";
import { type JobQueueProducer, LeadService } from "./modules/crm/service.js";
import { createEventRoutes } from "./modules/events/routes.js";
import { createGuestListRoutes } from "./modules/guest-list/routes.js";
import { createGuestSiteRoutes } from "./modules/guest-site/routes.js";
import { createIdentityRoutes } from "./modules/identity/routes.js";
import { createMessagingRoutes } from "./modules/messaging/routes.js";
import { createResponsesRoutes } from "./modules/responses/routes.js";
import { createWellRoutes } from "./modules/well/routes.js";
import { createStripeWebhookRoute } from "./webhooks/stripe.js";

/**
 * The CRM service on the shared job queue: one long-lived pg-boss producer for the process
 * instead of a connect/start/stop cycle per lead.
 */
export function createDefaultLeadService(deps: ApiDeps): LeadService {
  const producer: JobQueueProducer = {
    enqueueLeadCreated: (payload, singletonKey) =>
      deps.queue.enqueue("lead.created", { ...payload }, { singletonKey }),
  };
  return new LeadService(new LeadRepository(deps.db), producer);
}

export function mountApiRouters(
  app: OpenAPIHono<ApiEnv>,
  deps: ApiDeps,
  options: { leadService?: LeadService } = {},
): void {
  // Engineer 1: identity, events, billing, Stripe webhook
  app.route("/", createIdentityRoutes(deps));
  app.route("/", createEventRoutes(deps));
  app.route("/", createBillingRoutes(deps));
  app.route("/", createStripeWebhookRoute(deps));

  // Engineer 2: guest micro-site, check-in, well
  app.route("/", createGuestSiteRoutes(deps));
  app.route("/", createCheckInRoutes(deps));
  app.route("/", createWellRoutes(deps));

  // Engineer 3: guest list, responses, messaging, CRM
  app.route("/", createGuestListRoutes(deps));
  app.route("/", createResponsesRoutes(deps));
  app.route("/", createMessagingRoutes(deps));
  app.route("/", createCrmRoutes(options.leadService ?? createDefaultLeadService(deps)));
}
