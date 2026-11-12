import "server-only";

import { isApiError } from "@managevent/api-client";
import type { GuestInvitationView, GuestPassesView } from "@managevent/validators";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getServerApi } from "@/lib/server-api";

/**
 * What a guest link resolves to.
 *
 * - `ok`: the guest-safe view (this party only; no token, ids, emails or plan internals).
 * - `gone`: the host turned the link off. `proxy.ts` normally answers these with a 410 page
 *   before a page renders; this is the fallback when the link is revoked between the two calls.
 * - `busy`: the API's rate limit for guest pages was reached.
 *
 * An unknown link calls `notFound()`: a real 404, with no hint that a link ever existed.
 * Never log the slug or token: together they are the guest's credential.
 */
export type GuestLoad<T> = { kind: "ok"; data: T } | { kind: "gone" } | { kind: "busy" };

async function load<T>(request: () => Promise<T>): Promise<GuestLoad<T>> {
  try {
    return { kind: "ok", data: await request() };
  } catch (err) {
    if (isApiError(err, "NOT_FOUND") || isApiError(err, "VALIDATION_ERROR")) notFound();
    if (isApiError(err, "LINK_REVOKED")) return { kind: "gone" };
    if (isApiError(err, "RATE_LIMITED")) return { kind: "busy" };
    throw err;
  }
}

/** `guestSite.getView`, shared by `generateMetadata`, `generateViewport` and the page. */
export const loadGuestView = cache(
  async (eventSlug: string, guestToken: string): Promise<GuestLoad<GuestInvitationView>> => {
    const api = await getServerApi();
    return load(() => api.guestSite.getView(eventSlug, guestToken));
  },
);

/** `guestSite.getPasses`, shared by the pass page and its metadata. */
export const loadGuestPasses = cache(
  async (eventSlug: string, guestToken: string): Promise<GuestLoad<GuestPassesView>> => {
    const api = await getServerApi();
    return load(() => api.guestSite.getPasses(eventSlug, guestToken));
  },
);
