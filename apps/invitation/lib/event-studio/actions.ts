"use server";

/**
 * Server actions for the host's own events: create, publish, design, details, settings, plan
 * and delete (CONTRACT F). Every action requires a signed-in host, calls the API through the
 * typed client and returns an `ActionResult`; the API enforces permissions and plan rules.
 *
 * Arguments arrive from the browser, so nothing here trusts their shape: the api-client parses
 * every body with the shared Zod schema before it is sent.
 */
import type {
  HostEventCreateInput,
  HostEventUpdate,
  HostInvitationUpdateInput,
} from "@managevent/validators";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, fail, runAction } from "@/lib/action-result";
import { getServerApi } from "@/lib/server-api";
import { requireHost } from "@/lib/session";
import { routes } from "@/lib/urls";
import { type FirstParty, WIZARD_MAX_HOUSEHOLDS } from "./wizard";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

function isId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

/** Every page of one event shares the event layout, so one call refreshes them all. */
function revalidateEvent(eventId: string): void {
  revalidatePath(routes.event(eventId), "layout");
  revalidatePath(routes.studio, "layout");
}

/** What the editors need back after a save: the new concurrency stamp and the link. */
export interface InvitationSaved {
  invitationUpdatedAt: string;
  eventSlug: string;
}

/**
 * Creates the event, then the first households. A household that cannot be added (for example
 * over the free guest limit) does not undo the event: the host lands on the new event and is
 * told how many were left out.
 */
export async function createEventAction(
  input: HostEventCreateInput,
  firstParties: FirstParty[],
): Promise<ActionResult<never>> {
  await requireHost(routes.studioNew);
  return runAction(async () => {
    const api = await getServerApi();
    const event = await api.events.create(input);

    const parties = Array.isArray(firstParties) ? firstParties.slice(0, WIZARD_MAX_HOUSEHOLDS) : [];
    let skipped = 0;
    for (const party of parties) {
      try {
        const key: unknown = party?.idempotencyKey;
        await api.guestList.createParty(
          event.id,
          party.input,
          typeof key === "string" && IDEMPOTENCY_KEY_PATTERN.test(key)
            ? { idempotencyKey: key }
            : undefined,
        );
      } catch {
        skipped += 1;
      }
    }

    revalidatePath(routes.studio, "layout");
    const query = skipped > 0 ? `?created=1&skipped=${skipped}` : "?created=1";
    redirect(`${routes.event(event.id)}${query}`);
  });
}

export async function publishAction(
  eventId: string,
): Promise<ActionResult<{ publishedAt: string | null }>> {
  if (!isId(eventId)) return fail("VALIDATION_ERROR");
  await requireHost(routes.event(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    const detail = await api.events.publish(eventId);
    revalidateEvent(eventId);
    return { publishedAt: detail.invitation.publishedAt };
  });
}

export async function unpublishAction(
  eventId: string,
): Promise<ActionResult<{ publishedAt: string | null }>> {
  if (!isId(eventId)) return fail("VALIDATION_ERROR");
  await requireHost(routes.event(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    const detail = await api.events.unpublish(eventId);
    revalidateEvent(eventId);
    return { publishedAt: detail.invitation.publishedAt };
  });
}

/**
 * `PATCH /v1/events/{eventId}/invitation`: design, content (a full replace), reply settings,
 * the well and the link words. Pass `expectedUpdatedAt` so a newer save elsewhere is reported
 * as `STALE_WRITE` and not overwritten.
 */
export async function updateInvitationAction(
  eventId: string,
  input: HostInvitationUpdateInput,
): Promise<ActionResult<InvitationSaved>> {
  if (!isId(eventId)) return fail("VALIDATION_ERROR");
  await requireHost(routes.event(eventId));
  return runAction(async () => {
    const api = await getServerApi();
    const detail = await api.events.updateInvitation(eventId, input);
    revalidateEvent(eventId);
    return {
      invitationUpdatedAt: detail.invitation.updatedAt,
      eventSlug: detail.invitation.eventSlug,
    };
  });
}

/** `PATCH /v1/events/{eventId}`: the event name, start, end and time zone. */
export async function updateEventAction(
  eventId: string,
  input: HostEventUpdate,
): Promise<ActionResult<InvitationSaved>> {
  if (!isId(eventId)) return fail("VALIDATION_ERROR");
  await requireHost(routes.eventTab(eventId, "content"));
  return runAction(async () => {
    const api = await getServerApi();
    const detail = await api.events.update(eventId, input);
    revalidateEvent(eventId);
    return {
      invitationUpdatedAt: detail.invitation.updatedAt,
      eventSlug: detail.invitation.eventSlug,
    };
  });
}

/**
 * Starts a Stripe Checkout session for the Premium Event Pass and returns its URL; the browser
 * then leaves for Stripe. The idempotency key comes from the page, so a double press opens one
 * session. Without card payments configured the API answers `PAYMENTS_NOT_CONFIGURED`.
 */
export async function startCheckoutAction(
  eventId: string,
  idempotencyKey: string,
): Promise<ActionResult<{ checkoutUrl: string }>> {
  if (!isId(eventId)) return fail("VALIDATION_ERROR");
  if (typeof idempotencyKey !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return fail("VALIDATION_ERROR");
  }
  await requireHost(routes.eventTab(eventId, "settings"));
  return runAction(async () => {
    const api = await getServerApi();
    const session = await api.billing.createCheckout(eventId, { idempotencyKey });
    return { checkoutUrl: session.checkoutUrl };
  });
}

/**
 * Applies the upgrade once Stripe reports the session paid. Safe to repeat.
 *
 * Applying the plan writes the invitation, which moves its `updatedAt`. The new value comes
 * back as `invitationUpdatedAt` so the Settings forms on the page keep saving against the
 * current stamp; without it the next save would be refused as `STALE_WRITE`.
 */
export async function confirmCheckoutAction(
  eventId: string,
  sessionId: string,
): Promise<ActionResult<{ effectivePlan: string; invitationUpdatedAt: string }>> {
  if (!isId(eventId) || typeof sessionId !== "string") return fail("VALIDATION_ERROR");
  await requireHost(routes.eventTab(eventId, "settings"));
  return runAction(async () => {
    const api = await getServerApi();
    const plan = await api.billing.confirmCheckout(eventId, { sessionId });
    const detail = await api.events.get(eventId);
    revalidateEvent(eventId);
    return {
      effectivePlan: plan.effectivePlan,
      invitationUpdatedAt: detail.invitation.updatedAt,
    };
  });
}

/** Deletes the event (owner only) and returns to the list. */
export async function deleteEventAction(eventId: string): Promise<ActionResult<never>> {
  if (!isId(eventId)) return fail("VALIDATION_ERROR");
  await requireHost(routes.studio);
  return runAction(async () => {
    const api = await getServerApi();
    await api.events.remove(eventId);
    revalidatePath(routes.studio, "layout");
    redirect(`${routes.studio}?deleted=1`);
  });
}
