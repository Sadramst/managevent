/**
 * The one return shape for every server action in this app.
 *
 *   "use server";
 *   export async function renamePartyAction(eventId: string, partyId: string, name: string) {
 *     await requireHost(routes.eventTab(eventId, "guests"));
 *     return runAction(async () => {
 *       const api = await getServerApi();
 *       const party = await api.guestList.updateParty(eventId, partyId, { displayName: name });
 *       revalidatePath(routes.eventTab(eventId, "guests"));
 *       return party;
 *     });
 *   }
 *
 * The client then branches on `result.ok`; on failure it shows `result.message` (already in
 * plain en-AU from `packages/i18n`) and `result.fieldErrors` beside the fields.
 *
 * Client components may import the TYPES from this file (`import type`). The helpers are for
 * server code.
 */
import { isApiError } from "@managevent/api-client";
import { getInvitationShell, type InvitationErrorCode } from "@managevent/i18n";
import { unstable_rethrow } from "next/navigation";

export type FieldErrors = Record<string, string[]>;

export interface ActionSuccess<T> {
  ok: true;
  data: T;
}

export interface ActionFailure {
  ok: false;
  /** Stable API error code (`STALE_WRITE`, `PLAN_LIMIT_EXCEEDED`, ...) or `UNKNOWN`. */
  code: string;
  /** Plain-language message for the person, ready to show. */
  message: string;
  /** Messages per input name, for inline validation. */
  fieldErrors?: FieldErrors;
  /** The API's `details`, when it sent any (for example `{ missing: [...] }` on publish). */
  details?: unknown;
}

export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

/** A successful result. `ok()` with no argument is `ActionResult<void>`. */
export function ok(): ActionSuccess<void>;
export function ok<T>(data: T): ActionSuccess<T>;
export function ok<T>(data?: T): ActionSuccess<T | undefined> {
  return { ok: true, data };
}

/** The plain-language message for an error code. Unknown codes get the generic message. */
export function errorMessage(code: string): string {
  const messages = getInvitationShell("en").errors;
  return Object.hasOwn(messages, code) ? messages[code as InvitationErrorCode] : messages.UNKNOWN;
}

/** A failed result built by hand, for example after validating a form in the action. */
export function fail(
  code: string,
  options: { message?: string; fieldErrors?: FieldErrors; details?: unknown } = {},
): ActionFailure {
  return {
    ok: false,
    code,
    message: options.message ?? errorMessage(code),
    ...(options.fieldErrors && Object.keys(options.fieldErrors).length > 0
      ? { fieldErrors: options.fieldErrors }
      : {}),
    ...(options.details !== undefined ? { details: options.details } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keeps only `{ [field]: string[] }` entries with at least one message. */
function toFieldErrors(value: unknown): FieldErrors | undefined {
  if (!isRecord(value)) return undefined;
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(value)) {
    if (!Array.isArray(messages)) continue;
    const texts = messages.filter((item): item is string => typeof item === "string");
    if (texts.length > 0) result[field] = texts;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

interface ZodLikeError extends Error {
  flatten(): { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> };
}

/** A ZodError from any copy of zod (the api-client validates input before it sends). */
function isZodError(err: unknown): err is ZodLikeError {
  return (
    err instanceof Error &&
    err.name === "ZodError" &&
    typeof (err as { flatten?: unknown }).flatten === "function"
  );
}

/**
 * Turns anything thrown by the api-client into an `ActionFailure`:
 *
 * - `ManageventApiClientError` → its `code`, the friendly message for that code, and for
 *   `VALIDATION_ERROR` the per-field messages from the API's `details.fieldErrors`;
 * - a `ZodError` (input rejected before the request was sent) → `VALIDATION_ERROR` with
 *   per-field messages;
 * - anything else → `UNKNOWN`. Only the error's name is logged: no message, no arguments.
 */
export function toActionFailure(err: unknown): ActionFailure {
  if (isApiError(err)) {
    const fieldErrors =
      err.code === "VALIDATION_ERROR" && isRecord(err.details)
        ? toFieldErrors(err.details.fieldErrors)
        : undefined;
    if (err.status >= 500) {
      console.error(`[action] API ${err.status} ${err.code} requestId=${err.requestId}`);
    }
    return fail(err.code, {
      ...(fieldErrors ? { fieldErrors } : {}),
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }
  if (isZodError(err)) {
    const fieldErrors = toFieldErrors(err.flatten().fieldErrors);
    return fail("VALIDATION_ERROR", fieldErrors ? { fieldErrors } : {});
  }
  console.error(`[action] unexpected ${err instanceof Error ? err.name : typeof err}`);
  return fail("UNKNOWN");
}

/**
 * Runs the body of a server action and returns an `ActionResult`. `redirect()` and `notFound()`
 * thrown inside still work (they are re-thrown for Next to handle).
 */
export async function runAction<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await body());
  } catch (err) {
    unstable_rethrow(err);
    return toActionFailure(err);
  }
}
