import "server-only";

import { isApiError, type ManageventApiClient } from "@managevent/api-client";
import { getExperienceMode } from "@managevent/i18n";
import type { HostEventDetail } from "@managevent/validators";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { Capabilities } from "@/lib/session";
import { routes, wwwLinks } from "@/lib/urls";

/** The event for a studio page. An event the host may not read answers 404, never 403. */
export async function loadEvent(
  api: ManageventApiClient,
  eventId: string,
): Promise<HostEventDetail> {
  try {
    return await api.events.get(eventId);
  } catch (err) {
    if (isApiError(err, "NOT_FOUND") || isApiError(err, "VALIDATION_ERROR")) notFound();
    throw err;
  }
}

/** Memorial Mode for an event: the calm palette, respectful wording and no upsell. */
export function isMemorial(event: Pick<HostEventDetail, "experienceMode">): boolean {
  return getExperienceMode({ experienceMode: event.experienceMode }) === "MEMORIAL";
}

/** Spread on a page wrapper so everything inside (dialogs included) uses the memorial tokens. */
export function experienceModeAttr(memorial: boolean): { "data-experience-mode"?: "memorial" } {
  return memorial ? { "data-experience-mode": "memorial" } : {};
}

/**
 * Where a host is pointed when a feature or limit needs the Premium Event Pass.
 *
 * `stripeCheckout` false means card payments are not switched on for this deployment: the UI
 * then says so and offers "Contact us" instead of an upgrade link that cannot complete.
 */
export interface PremiumPointerInfo {
  stripeCheckout: boolean;
  /** The event's Settings tab, where the upgrade lives. */
  settingsHref: string;
  /** www `/contact`. */
  contactHref: string;
}

/**
 * The Premium pointer for an event, or null when it must not be shown: memorial events include
 * everything at no cost and never see an upsell, and an event already on a paid plan has
 * nothing to upgrade to.
 */
export function premiumPointerFor(
  event: Pick<HostEventDetail, "id" | "experienceMode" | "invitation">,
  capabilities: Capabilities,
): PremiumPointerInfo | null {
  if (isMemorial(event)) return null;
  if (event.invitation.effectivePlan !== "FREE") return null;
  return {
    stripeCheckout: capabilities.stripeCheckout,
    settingsHref: routes.eventTab(event.id, "settings"),
    contactHref: wwwLinks.contact,
  };
}

/** After any change to guests or replies: every tab of the event shows counts, so refresh all. */
export function revalidateEvent(eventId: string): void {
  revalidatePath(routes.event(eventId), "layout");
  revalidatePath(routes.checkIn(eventId));
}
