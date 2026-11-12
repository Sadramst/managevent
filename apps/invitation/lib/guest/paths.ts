/**
 * Paths and small formatters for the guest micro-site. Pure, safe on the server and in the
 * browser. A guest path contains the guest's token: build it, link to it, never log it.
 */

export interface GuestLink {
  eventSlug: string;
  guestToken: string;
}

export function guestPath({ eventSlug, guestToken }: GuestLink): string {
  return `/i/${encodeURIComponent(eventSlug)}/${encodeURIComponent(guestToken)}`;
}

/** The invitation with the gate already opened, optionally at a section (`#rsvp`). */
export function guestOpenedPath(link: GuestLink, hash?: string): string {
  return `${guestPath(link)}?opened=1${hash ? `#${hash}` : ""}`;
}

export function guestPassPath(link: GuestLink): string {
  return `${guestPath(link)}/pass`;
}

export function guestCalendarPath(link: GuestLink): string {
  return `${guestPath(link)}/calendar.ics`;
}

/**
 * Splits `/i/{eventSlug}/{guestToken}[/...]` into its two parts, or returns null when the path is
 * not a guest link. Used by `proxy.ts`, which sees the raw pathname.
 */
export function parseGuestPath(pathname: string): GuestLink | null {
  const segments = pathname.split("/");
  // ["", "i", slug, token, ...]
  if (segments[1] !== "i") return null;
  const slug = segments[2];
  const token = segments[3];
  if (!slug || !token) return null;
  try {
    return { eventSlug: decodeURIComponent(slug), guestToken: decodeURIComponent(token) };
  } catch {
    return null;
  }
}

/**
 * A maps link for a venue: the host's own link when they gave one, otherwise a search for the
 * venue name and address. The universal Google Maps URL opens the Maps app on Android and iOS
 * when it is installed, and the website otherwise.
 */
export function venueMapsUrl(venue: {
  name: string;
  address: string;
  mapsUrl?: string | undefined;
}): string {
  if (venue.mapsUrl) return venue.mapsUrl;
  const query = [venue.name, venue.address].filter((part) => part.trim().length > 0).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** "Perth" from "Australia/Perth"; "Ho Chi Minh" from "Asia/Ho_Chi_Minh". */
export function timeZoneCity(timeZone: string): string {
  const last = timeZone.split("/").pop() ?? timeZone;
  return last.replace(/_/g, " ");
}

/** True when the two local date-times fall on the same calendar day. */
export function sameLocalDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}
