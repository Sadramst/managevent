"use server";

import { type ActionResult, runAction } from "@/lib/action-result";
import { revalidateEvent } from "@/lib/guest-list/event";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

const responsesPath = (eventId: string) => routes.eventTab(eventId, "responses");

/**
 * Approves or hides a wish or tribute. Only approved entries that the guest asked to share are
 * shown to other guests on the invitation.
 */
export async function moderateWishAction(
  eventId: string,
  entryId: string,
  moderation: "APPROVED" | "REJECTED",
): Promise<ActionResult> {
  await requireHost(responsesPath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    await api.well.moderate(eventId, entryId, { moderation });
    revalidateEvent(eventId);
  });
}

/** Deletes a wish or tribute for the hosts and for guests. */
export async function removeWishAction(eventId: string, entryId: string): Promise<ActionResult> {
  await requireHost(responsesPath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    await api.well.remove(eventId, entryId);
    revalidateEvent(eventId);
  });
}
