/**
 * Runs a rate limiter from inside a handler, after the caller has been authorised.
 *
 * The `bulk` bucket is counted per event. As route middleware it would run before authorisation,
 * so anyone who knew an event id could use up a host's allowance with requests that are then
 * rejected. Called from here, only requests that passed the permission check are counted.
 */
import type { Context, MiddlewareHandler } from "hono";
import { ApiProblem } from "../../lib/errors.js";
import type { ApiEnv } from "../../middleware/context.js";

export async function enforceLimit(
  c: Context<ApiEnv>,
  limiter: MiddlewareHandler<ApiEnv>,
): Promise<void> {
  let passed = false;
  // A rejecting limiter sets `retry-after` on the context; the error response keeps it.
  await limiter(c, async () => {
    passed = true;
  });
  if (!passed) {
    throw new ApiProblem(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
  }
}
