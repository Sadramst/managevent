"use server";

import type { EmailCampaignResult } from "@managevent/validators";
import { type ActionResult, fail, runAction } from "@/lib/action-result";
import { revalidateEvent } from "@/lib/guest-list/event";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";

const sharePath = (eventId: string) => routes.eventTab(eventId, "share");

/**
 * Turns a household's private link off. Their replies are kept; the link answers 410 until a
 * new one is issued.
 */
export async function revokeLinkAction(eventId: string, partyId: string): Promise<ActionResult> {
  await requireHost(sharePath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    await api.guestList.revokeLink(eventId, partyId);
    revalidateEvent(eventId);
  });
}

/** Issues a brand new link for a household. The old one stops working for good. */
export async function reissueLinkAction(eventId: string, partyId: string): Promise<ActionResult> {
  await requireHost(sharePath(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    await api.guestList.reissueLink(eventId, partyId);
    revalidateEvent(eventId);
  });
}

/**
 * Queues invitation emails for the chosen households. The host must attest they may email these
 * guests (Spam Act); the API refuses without it. `idempotencyKey` makes a retry safe: the same
 * key returns the same campaign instead of sending twice.
 */
export async function sendEmailInvitationsAction(
  eventId: string,
  partyIds: string[],
  consentAttested: boolean,
  idempotencyKey: string,
): Promise<ActionResult<EmailCampaignResult>> {
  await requireHost(sharePath(eventId));
  if (consentAttested !== true || !Array.isArray(partyIds) || partyIds.length === 0) {
    return fail("VALIDATION_ERROR");
  }
  return runAction(async () => {
    const api = await getServerApi();
    const result = await api.messaging.sendEmailInvitations(
      eventId,
      { partyIds, consentAttested: true },
      { idempotencyKey },
    );
    revalidateEvent(eventId);
    return result;
  });
}
