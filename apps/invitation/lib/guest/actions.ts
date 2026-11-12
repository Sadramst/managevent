"use server";

import type {
  GuestPartyView,
  GuestRsvpSubmitInput,
  GuestRsvpView,
  GuestWishSubmitInput,
} from "@managevent/validators";
import { type ActionResult, fail, runAction } from "@/lib/action-result";
import { getServerApi } from "@/lib/server-api";

/**
 * Server actions for the guest micro-site. A guest has no account: the event slug and the token
 * from their link are the credential, exactly as on the API (`/v1/i/{eventSlug}/{guestToken}`).
 * The API validates the body, checks it against the party, applies the rate limits (per visitor
 * address, which `getServerApi()` forwards) and refuses sample and preview invitations.
 *
 * Never log the arguments: the token is a credential and the body can hold health information.
 */

/** What the reply form needs back: the party and reply as now stored. Pass QR payloads stay on the server. */
export interface RsvpActionData {
  /** True when this was a repeat of an earlier submission with the same key. */
  replayed: boolean;
  party: GuestPartyView;
  rsvp: GuestRsvpView;
  /** True when at least one door pass now exists for this party. */
  hasPasses: boolean;
}

function validKey(key: unknown): key is string {
  return typeof key === "string" && key.length >= 8 && key.length <= 128;
}

/**
 * `POST /v1/i/{eventSlug}/{guestToken}/rsvp`.
 *
 * `idempotencyKey` identifies one submission: the form reuses it when it retries the same
 * answers after a failure, and makes a new one for changed answers or after a success.
 */
export async function submitRsvpAction(
  eventSlug: string,
  guestToken: string,
  input: GuestRsvpSubmitInput,
  idempotencyKey: string,
): Promise<ActionResult<RsvpActionData>> {
  if (!validKey(idempotencyKey)) return fail("VALIDATION_ERROR");
  return runAction(async () => {
    const api = await getServerApi();
    const result = await api.guestSite.submitRsvp(eventSlug, guestToken, input, {
      idempotencyKey,
    });
    return {
      replayed: result.replayed,
      party: result.party,
      rsvp: result.rsvp,
      hasPasses: result.passes.length > 0,
    };
  });
}

export interface WishActionData {
  /** True when the guest asked for the message to be shown to other guests once approved. */
  shared: boolean;
}

/** `POST /v1/i/{eventSlug}/{guestToken}/wishes`: a wishing well message or a tribute. */
export async function submitWishAction(
  eventSlug: string,
  guestToken: string,
  input: GuestWishSubmitInput,
  idempotencyKey: string,
): Promise<ActionResult<WishActionData>> {
  if (!validKey(idempotencyKey)) return fail("VALIDATION_ERROR");
  return runAction(async () => {
    const api = await getServerApi();
    const result = await api.guestSite.submitWish(eventSlug, guestToken, input, {
      idempotencyKey,
    });
    return { shared: result.visibility === "WALL" };
  });
}
