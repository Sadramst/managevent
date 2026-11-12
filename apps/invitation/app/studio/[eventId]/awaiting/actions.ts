"use server";

import type { EmailCampaignResult } from "@managevent/validators";
import { type ActionResult, fail, runAction } from "@/lib/action-result";
import { revalidateEvent } from "@/lib/guest-list/event";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

/**
 * Queues one reminder email to every household still to reply that has an email address.
 *
 * The API decides everything that matters: the plan (`FEATURE_NOT_IN_PLAN`), whether email is
 * configured (`EMAIL_NOT_CONFIGURED`), quiet hours in the event's time zone (`QUIET_HOURS`),
 * closed replies (`RSVP_CLOSED`) and the two-reminder limit per address (reported as skipped).
 * `idempotencyKey` makes a retry return the same campaign instead of sending twice.
 */
export async function sendRsvpRemindersAction(
  eventId: string,
  consentAttested: boolean,
  idempotencyKey: string,
): Promise<ActionResult<EmailCampaignResult>> {
  await requireHost(routes.eventTab(eventId, "awaiting"));
  if (consentAttested !== true) return fail("VALIDATION_ERROR");
  return runAction(async () => {
    const api = await getServerApi();
    const result = await api.messaging.sendRsvpReminders(
      eventId,
      { partyIds: "ALL", consentAttested: true },
      { idempotencyKey },
    );
    revalidateEvent(eventId);
    return result;
  });
}
