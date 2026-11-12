/**
 * Maps an error thrown by the API client to the `ActionResult` failure a server action returns.
 */
import { isApiError } from "@managevent/api-client";
import type { ActionFailure } from "./action-result";

/** `details.fieldErrors` from a `VALIDATION_ERROR` body, when it has the expected shape. */
function fieldErrorsOf(details: unknown): Record<string, string[]> | undefined {
  if (typeof details !== "object" || details === null) return undefined;
  const raw = (details as { fieldErrors?: unknown }).fieldErrors;
  if (typeof raw !== "object" || raw === null) return undefined;
  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(raw)) {
    if (Array.isArray(messages)) {
      const texts = messages.filter((message): message is string => typeof message === "string");
      if (texts.length > 0) result[field] = texts;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Turns a thrown error into a failure the form can show. Only the stable error code and the
 * field messages of a validation error cross to the browser: never the API's general message,
 * a stack or a request id.
 */
export function toActionFailure(err: unknown): ActionFailure {
  if (!isApiError(err)) return { ok: false, code: "INTERNAL_ERROR" };
  const fieldErrors = err.code === "VALIDATION_ERROR" ? fieldErrorsOf(err.details) : undefined;
  return { ok: false, code: err.code, ...(fieldErrors ? { fieldErrors } : {}) };
}
