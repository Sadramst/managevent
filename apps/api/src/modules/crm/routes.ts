/**
 * CRM OpenAPI routes (`/v1/leads`).
 *
 * Follows the mandatory Managevent route pattern:
 * Zod input validation -> `requirePermission()` or public rate limit -> `LeadService` -> `LeadRepository`.
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { requirePermission } from "@managevent/auth";
import {
  ApiErrorSchema,
  LeadCreateSchema,
  LeadDetailSchema,
  LeadListQuerySchema,
  LeadListSchema,
  LeadResponseSchema,
  LeadUpdateSchema,
} from "@managevent/validators";
import { ApiProblem, notFound } from "../../lib/errors.js";
import { clientIp, RL } from "../../lib/rate-limit.js";
import { errorResponses, jsonContent } from "../../lib/router.js";
import type { ApiEnv } from "../../middleware/context.js";
import { InvalidLeadAssigneeError, LeadService } from "./service.js";

/** Loose on purpose: an id that is not a lead id gets the same 404 as a lead that does not exist. */
const LeadParamsSchema = z.object({ leadId: z.string().min(1).max(80) });

export const postLeadRoute = createRoute({
  method: "post",
  path: "/v1/leads",
  tags: ["CRM"],
  summary: "Submit a new ceremony enquiry or Builder lead",
  request: {
    headers: z.object({
      "idempotency-key": z.string().min(8).max(128).optional(),
    }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: LeadCreateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Lead created and planner notification enqueued",
      content: {
        "application/json": {
          schema: LeadResponseSchema,
        },
      },
    },
    200: {
      description: "Idempotent replay of existing lead",
      content: {
        "application/json": {
          schema: LeadResponseSchema,
        },
      },
    },
    400: {
      description: "Validation error",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    429: {
      description: "Rate limit exceeded",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
  },
});

export const getLeadsRoute = createRoute({
  method: "get",
  path: "/v1/leads",
  tags: ["CRM"],
  summary: "List leads in the CRM inbox, newest first (requires PLANNER_STAFF or SUPER_ADMIN)",
  middleware: [RL.hostRead] as const,
  request: { query: LeadListQuerySchema },
  responses: {
    200: { description: "A page of leads", content: jsonContent(LeadListSchema) },
    ...errorResponses(400, 401, 403, 429),
  },
});

export const getLeadRoute = createRoute({
  method: "get",
  path: "/v1/leads/{leadId}",
  tags: ["CRM"],
  summary: "One lead with its message, notes and assignee (staff only)",
  middleware: [RL.hostRead] as const,
  request: { params: LeadParamsSchema },
  responses: {
    200: { description: "The lead", content: jsonContent(LeadDetailSchema) },
    ...errorResponses(401, 403, 404, 429),
  },
});

export const patchLeadRoute = createRoute({
  method: "patch",
  path: "/v1/leads/{leadId}",
  tags: ["CRM"],
  summary: "Move a lead to another stage, edit planner notes or assign it (staff only)",
  middleware: [RL.hostWrite] as const,
  request: {
    params: LeadParamsSchema,
    body: { required: true, content: jsonContent(LeadUpdateSchema) },
  },
  responses: {
    200: { description: "The updated lead", content: jsonContent(LeadDetailSchema) },
    ...errorResponses(400, 401, 403, 404, 429),
  },
});

export function createCrmRoutes(service: LeadService = new LeadService()) {
  const router = new OpenAPIHono<ApiEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const requestId = c.get("requestId") ?? "req_unknown";
        return c.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid lead request payload",
              details: result.error.flatten(),
              requestId,
            },
          },
          400,
        );
      }
      return undefined;
    },
  });

  router.openapi(postLeadRoute, async (c) => {
    const validatedBody = c.req.valid("json");
    const headers = c.req.valid("header");
    const idempotencyKey = headers["idempotency-key"];
    // Goes on the marketing ConsentRecord, so it must not be an address the caller typed.
    const ipAddress = clientIp(c);

    const { lead, createdNew } = await service.submitLead({
      input: validatedBody,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(ipAddress === "unknown" ? {} : { ipAddress }),
    });

    return c.json(lead, createdNew ? 201 : 200);
  });

  router.openapi(getLeadsRoute, async (c) => {
    requirePermission(c.get("actor"), "lead:read");
    return c.json(await service.listLeadsPage(c.req.valid("query")), 200);
  });

  router.openapi(getLeadRoute, async (c) => {
    requirePermission(c.get("actor"), "lead:read");
    const lead = await service.getLead(c.req.valid("param").leadId);
    if (!lead) throw notFound("Lead not found");
    return c.json(lead, 200);
  });

  router.openapi(patchLeadRoute, async (c) => {
    const actor = c.get("actor");
    requirePermission(actor, "lead:write");
    const ip = clientIp(c);
    try {
      const lead = await service.updateLead({
        leadId: c.req.valid("param").leadId,
        input: c.req.valid("json"),
        actor,
        ...(ip === "unknown" ? {} : { ipAddress: ip }),
      });
      if (!lead) throw notFound("Lead not found");
      return c.json(lead, 200);
    } catch (err) {
      if (err instanceof InvalidLeadAssigneeError) {
        throw new ApiProblem(400, "VALIDATION_ERROR", err.message, {
          formErrors: [],
          fieldErrors: { assignedToUserId: [err.message] },
        });
      }
      throw err;
    }
  });

  return router;
}
