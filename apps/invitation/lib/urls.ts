/**
 * Absolute URLs for this site and its sibling, www.managevent.com.au, plus this site's routes.
 *
 * Safe to import from client components: it reads only `NEXT_PUBLIC_*` variables, which Next
 * inlines at build time.
 */

const isProduction = process.env.NODE_ENV === "production";

function origin(value: string | undefined, fallback: string): string {
  return (value?.trim() || fallback).replace(/\/+$/, "");
}

/** This site's public origin, without a trailing slash. */
export const invitationUrl = origin(
  process.env.NEXT_PUBLIC_INVITATION_URL,
  isProduction ? "https://invitation.managevent.com.au" : "http://localhost:3001",
);

/** The www (event planning) site's origin, without a trailing slash. */
export const marketingUrl = origin(
  process.env.NEXT_PUBLIC_MARKETING_URL,
  isProduction ? "https://www.managevent.com.au" : "http://localhost:3100",
);

function join(base: string, path: string): string {
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Absolute URL on this site for a path such as `/templates`. */
export function absoluteUrl(path = "/"): string {
  return join(invitationUrl, path);
}

/**
 * The link a host shares with one party: `HostParty.invitePath` (`/i/{eventSlug}/{token}`) made
 * absolute. Returns null when the path is null, which is what read-only co-hosts receive.
 * A guest link is a credential: show and copy it, never log it.
 */
export function absoluteInviteUrl(invitePath: string | null | undefined): string | null {
  if (!invitePath || !invitePath.startsWith("/i/")) return null;
  return join(invitationUrl, invitePath);
}

/** Absolute URL on www for a path such as `/contact`. */
export function wwwUrl(path = "/"): string {
  return join(marketingUrl, path);
}

/** The www pages this site links to. Legal documents live only on www. */
export const wwwLinks = {
  home: wwwUrl("/"),
  invitations: wwwUrl("/invitations"),
  contact: wwwUrl("/contact"),
  privacy: wwwUrl("/privacy"),
  terms: wwwUrl("/terms"),
  accessibility: wwwUrl("/accessibility"),
} as const;

/** The event tabs under `/studio/{eventId}/`. The overview is the bare event path. */
export type EventTabSegment =
  "design" | "content" | "guests" | "share" | "responses" | "awaiting" | "settings";

/** Every route on this site, in one place for navigation, redirects and tests. */
export const routes = {
  home: "/",
  templates: "/templates",
  pricing: "/pricing",
  signIn: "/sign-in",
  signUp: "/sign-up",
  twoFactor: "/sign-in/two-factor",
  resetPassword: "/reset-password",
  unsubscribe: "/unsubscribe",
  studio: "/studio",
  studioNew: "/studio/new",
  event: (eventId: string) => `/studio/${encodeURIComponent(eventId)}`,
  eventTab: (eventId: string, tab: EventTabSegment) =>
    `/studio/${encodeURIComponent(eventId)}/${tab}`,
  responsesCsv: (eventId: string) => `/studio/${encodeURIComponent(eventId)}/responses/export.csv`,
  checkIn: (eventId: string) => `/check-in/${encodeURIComponent(eventId)}`,
} as const;
