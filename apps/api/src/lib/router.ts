/**
 * Shared building blocks for module routers, so every module reports validation failures and
 * documents its error responses the same way.
 */
import { OpenAPIHono, type z } from "@hono/zod-openapi";
import { ApiErrorSchema } from "@managevent/validators";
import type { ApiEnv } from "../middleware/context.js";

/**
 * A module router whose request-validation failures become
 * `400 { error: { code: "VALIDATION_ERROR", details, requestId } }`.
 *
 * The guest-site router does not use this: its own hook turns a bad path parameter into a
 * neutral 404.
 */
export function createApiRouter(): OpenAPIHono<ApiEnv> {
  return new OpenAPIHono<ApiEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Request validation failed",
              details: result.error.flatten(),
              requestId: c.get("requestId") ?? "req_unknown",
            },
          },
          400,
        );
      }
      return undefined;
    },
  });
}

/** `content` block for a JSON body or response in `createRoute`. */
export function jsonContent<T extends z.ZodTypeAny>(schema: T) {
  return { "application/json": { schema } } as const;
}

const ERROR_DESCRIPTIONS: Readonly<Record<number, string>> = {
  400: "Validation error",
  401: "Unauthenticated",
  403: "Forbidden",
  404: "Not found",
  409: "Conflict",
  410: "Gone",
  422: "Unprocessable",
  429: "Rate limit exceeded",
  503: "Service not configured",
};

type ErrorResponse = {
  description: string;
  content: { "application/json": { schema: typeof ApiErrorSchema } };
};

/**
 * Error responses in the standard envelope for `createRoute({ responses })`, e.g.
 * `responses: { 200: {...}, ...errorResponses(400, 401, 403, 404) }`.
 */
export function errorResponses<const S extends readonly number[]>(
  ...statuses: S
): { [K in S[number]]: ErrorResponse } {
  const responses: Record<number, ErrorResponse> = {};
  for (const status of statuses) {
    responses[status] = {
      description: ERROR_DESCRIPTIONS[status] ?? "Error",
      content: { "application/json": { schema: ApiErrorSchema } },
    };
  }
  return responses as { [K in S[number]]: ErrorResponse };
}
