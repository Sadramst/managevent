/**
 * CRM OpenAPI routes (`/v1/leads`).
 *
 * Follows the mandatory Managevent route pattern:
 * Zod input validation -> `requirePermission()` or public rate limit -> `LeadService` -> `LeadRepository`.
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { requirePermission } from "@managevent/auth";
import { normalizePersianText } from "@managevent/i18n";
import { ApiErrorSchema, LeadCreateSchema, LeadResponseSchema } from "@managevent/validators";
import type { ApiEnv } from "../../middleware/context.js";
import { LeadService } from "./service.js";

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
  summary: "List leads in the CRM inbox (requires PLANNER_STAFF or SUPER_ADMIN)",
  responses: {
    200: {
      description: "List of leads",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(LeadResponseSchema),
          }),
        },
      },
    },
    401: {
      description: "Unauthenticated",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ApiErrorSchema,
        },
      },
    },
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
    const ipAddress =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip")?.trim();

    // Normalize Persian characters on save (`docs/design/I18N_RTL.md`)
    const normalizedInput = {
      ...validatedBody,
      name: normalizePersianText(validatedBody.name),
      ...(validatedBody.message ? { message: normalizePersianText(validatedBody.message) } : {}),
    };

    const { lead, createdNew } = await service.submitLead({
      input: normalizedInput,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(ipAddress ? { ipAddress } : {}),
    });

    return c.json(lead, createdNew ? 201 : 200);
  });

  router.openapi(getLeadsRoute, async (c) => {
    const actor = c.get("actor");
    requirePermission(actor, "lead:read");
    const items = await service.listLeads();
    return c.json({ items }, 200);
  });

  return router;
}
