import { routes } from "@/lib/urls";

/**
 * Where "Create your invitation" and "Use this template" go.
 *
 * A signed-in host goes straight to the wizard. A signed-out visitor creates an account first;
 * `next` (checked by `safeNextPath` on the sign-up page) brings them to the wizard afterwards,
 * with the template and optional card design they chose still selected.
 */
export function createInvitationHref(
  signedIn: boolean,
  templateSlug?: string,
  cardId?: string,
): string {
  const params = new URLSearchParams();
  if (templateSlug) params.set("template", templateSlug);
  if (cardId) params.set("card", cardId);
  const query = params.toString();
  const target = query ? `${routes.studioNew}?${query}` : routes.studioNew;
  return signedIn ? target : `${routes.signUp}?next=${encodeURIComponent(target)}`;
}

/**
 * The guest page of a sample invitation from `GET /v1/public/demos`. Samples are ordinary
 * `/i/` pages (noindex, never in the sitemap); their links are public by design.
 */
export function samplePath(demo: { eventSlug: string; guestToken: string }): string {
  return `/i/${encodeURIComponent(demo.eventSlug)}/${encodeURIComponent(demo.guestToken)}`;
}
