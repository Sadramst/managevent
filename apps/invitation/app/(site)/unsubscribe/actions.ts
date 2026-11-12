"use server";

import { UnsubscribeSchema } from "@managevent/validators";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getServerApi } from "@/lib/server-api";
import { routes } from "@/lib/urls";

/**
 * Takes the address behind a signed unsubscribe token off invitation and reminder emails
 * (`POST /v1/public/unsubscribe`). Public: the token is the proof, so there is no session check.
 * The token is never logged. Unsubscribing twice is harmless.
 */
export async function unsubscribeAction(token: string): Promise<ActionResult> {
  return runAction(async () => {
    const input = UnsubscribeSchema.parse({ token });
    const api = await getServerApi();
    await api.messaging.unsubscribe(input);
  });
}

/**
 * The form on `/unsubscribe`. It works without JavaScript: the result is a redirect to the same
 * page with a `status`, and the token leaves the address bar once it has been used.
 */
export async function unsubscribeFormAction(formData: FormData): Promise<void> {
  const raw = formData.get("t");
  const token = typeof raw === "string" ? raw.trim() : "";
  const result = await unsubscribeAction(token);
  if (result.ok) redirect(`${routes.unsubscribe}?status=done`);
  if (result.code === "VALIDATION_ERROR" || result.code === "NOT_FOUND") {
    redirect(`${routes.unsubscribe}?status=invalid`);
  }
  // Anything else (the API is down, too many attempts) can be retried with the same link.
  redirect(`${routes.unsubscribe}?status=error&t=${encodeURIComponent(token)}`);
}
