/**
 * Calls a server action from a client component without letting a dropped connection become an
 * unhandled error, and without mistaking a redirect for a failure.
 *
 * - The action answered: its `ActionResult`.
 * - The request never reached the server, or its answer never came back (offline, timed out,
 *   server restarting): a failure with code `NETWORK_ERROR` and the message passed in, so the
 *   form can show it and keep what was typed. Left uncaught inside `startTransition`, the same
 *   rejection is rethrown during render and replaces the page with the error screen.
 * - The action redirected (a create or delete, or `requireHost()` after the session ended):
 *   `null`. Next rejects the action's promise with its redirect error and is already
 *   navigating, so the caller must leave its state alone (button busy, nothing reported).
 *
 * Safe to import from client components: types and pure functions only.
 */
import type { ActionResult } from "@/lib/action-result";

/**
 * True for the error Next rejects a server action's promise with when the action called
 * `redirect()`. Its `digest` is `NEXT_REDIRECT;{push|replace};{url};{status};`.
 */
export function isRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT;");
}

export async function settle<T>(
  call: () => Promise<ActionResult<T> | undefined>,
  networkMessage: string,
): Promise<ActionResult<T> | null> {
  try {
    return (await call()) ?? null;
  } catch (error) {
    if (isRedirectError(error)) return null;
    return { ok: false, code: "NETWORK_ERROR", message: networkMessage };
  }
}
