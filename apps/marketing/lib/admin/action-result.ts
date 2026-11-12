/**
 * The result shape every console server action returns, and the lookup from a failure code to
 * the message a form shows. No imports, so client forms can use it without pulling the API
 * client into the browser bundle.
 */
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; code: string; fieldErrors?: Record<string, string[]> };

export type ActionFailure = Extract<ActionResult<never>, { ok: false }>;

/** The message for a failure code, from the console copy's `errors` table. */
export function actionErrorMessage(
  messages: Readonly<Record<string, string>> & { readonly fallback: string },
  code: string,
): string {
  return Object.hasOwn(messages, code) ? (messages[code] ?? messages.fallback) : messages.fallback;
}
