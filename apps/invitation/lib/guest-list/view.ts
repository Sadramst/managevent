/**
 * View models for the guest list screens. Pages map API DTOs to these on the server, with every
 * date already formatted, so client components receive plain, serialisable data and never
 * format a date or build a URL themselves.
 *
 * `inviteUrl` is a credential for answering as that household. It is shown to the host and
 * copied by them; it is never logged.
 *
 * This file is safe to import from client components (types and pure functions only).
 */

export type RsvpStatus = "PENDING" | "YES" | "NO" | "MAYBE";

export interface GuestView {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isChild: boolean;
  isPlusOne: boolean;
  status: RsvpStatus;
  checkedIn: boolean;
}

export interface PartyView {
  id: string;
  displayName: string;
  /** Absolute private link, or null for a read-only co-host. */
  inviteUrl: string | null;
  /** True when the host turned the link off (`tokenRevokedAt`). */
  linkOff: boolean;
  maxSeats: number;
  allowPlusOnes: boolean;
  childrenAllowed: boolean;
  tags: string[];
  tableLabel: string | null;
  status: RsvpStatus;
  /** "12 November 2026", or null when no one has answered. */
  repliedOn: string | null;
  hasEmail: boolean;
  /** "12 November 2026" when an invitation email has gone out. */
  emailedOn: string | null;
  remindersSent: number;
  /** The first phone number in the household, for the WhatsApp link. */
  phone: string | null;
  guests: GuestView[];
}

/** One person as the Share and Awaiting screens show them: a name and an answer, no contact details. */
export interface LinkGuestView {
  id: string;
  name: string;
  isChild: boolean;
  status: RsvpStatus;
}

/**
 * One household as the Share and Awaiting screens see it: its private link and what is needed
 * to send it. A screen receives only what it shows, so this carries no email address and only
 * the one phone number the WhatsApp button opens a chat with. The full `PartyView` is for the
 * Guests tab, where contact details are edited.
 */
export interface LinkPartyView {
  id: string;
  displayName: string;
  /** Absolute private link, or null for a read-only co-host. */
  inviteUrl: string | null;
  linkOff: boolean;
  tableLabel: string | null;
  status: RsvpStatus;
  emailedOn: string | null;
  remindersSent: number;
  /** The first phone number in the household, for the WhatsApp link. */
  phone: string | null;
  guests: LinkGuestView[];
}

/**
 * One household in the "email invitations" list: a name to tick and whether it can be sent to.
 * No link and no contact details: the API sends the emails, the page only chooses households.
 */
export interface EmailPartyView {
  id: string;
  displayName: string;
  linkOff: boolean;
  emailedOn: string | null;
}

/** The household fields `matchesQuery` searches. Every view of a household has these. */
export interface SearchableParty {
  displayName: string;
  tableLabel: string | null;
  tags?: readonly string[];
  guests: readonly { name: string; email?: string | null; phone?: string | null }[];
}

/** True when at least one person in the household has not answered yet. */
export function hasPendingGuest(party: { guests: readonly { status: RsvpStatus }[] }): boolean {
  return party.guests.some((guest) => guest.status === "PENDING");
}

export interface PartyFilter {
  /** Free text: household, guest name, email, table or tag. */
  query: string;
  status: RsvpStatus | "";
  tag: string;
}

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** True when every word of the query appears somewhere in the given texts. */
export function textMatches(texts: readonly (string | null | undefined)[], query: string): boolean {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalise(texts.filter(Boolean).join(" "));
  return words.every((word) => haystack.includes(word));
}

/** True when every word of the query appears somewhere in the household's searchable text. */
export function matchesQuery(party: SearchableParty, query: string): boolean {
  return textMatches(
    [
      party.displayName,
      party.tableLabel,
      ...(party.tags ?? []),
      ...party.guests.flatMap((guest) => [guest.name, guest.email, guest.phone]),
    ],
    query,
  );
}

/** The households that pass the search box, the reply filter and the tag filter. */
export function filterParties(parties: readonly PartyView[], filter: PartyFilter): PartyView[] {
  return parties.filter(
    (party) =>
      (filter.status === "" || party.status === filter.status) &&
      (filter.tag === "" || party.tags.includes(filter.tag)) &&
      matchesQuery(party, filter.query),
  );
}

/** Every tag in use, sorted for the tag filter. */
export function collectTags(parties: readonly PartyView[]): string[] {
  const tags = new Set<string>();
  for (const party of parties) for (const tag of party.tags) tags.add(tag);
  return [...tags].sort((a, b) => a.localeCompare(b, "en"));
}

export interface GuestListTotals {
  households: number;
  guests: number;
  attending: number;
  awaiting: number;
}

/** Totals over guests (not households): who is coming and who has yet to answer. */
export function guestListTotals(parties: readonly PartyView[]): GuestListTotals {
  let guests = 0;
  let attending = 0;
  let awaiting = 0;
  for (const party of parties) {
    for (const guest of party.guests) {
      guests += 1;
      if (guest.status === "YES") attending += 1;
      if (guest.status === "PENDING") awaiting += 1;
    }
  }
  return { households: parties.length, guests, attending, awaiting };
}

/** Splits a "Family, Interstate" tags field into clean, unique tags. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(/[,;\n]/)) {
    const tag = raw.trim();
    const key = tag.toLowerCase();
    if (tag.length === 0 || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

/** True when the tags fit the API's limits (at most 10, each up to 40 characters). */
export function tagsAreValid(tags: readonly string[]): boolean {
  return tags.length <= 10 && tags.every((tag) => tag.length <= 40);
}

/** A safe file-name stem from a household name: "The Nguyen family" → "the-nguyen-family". */
export function fileSlug(name: string, fallback = "guest"): string {
  const slug = normalise(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug.length > 0 ? slug : fallback;
}

/**
 * A table label for display. Hosts type "3", "7B", "Table 3", "Head table" or "Row 2". The word
 * "Table" is added only to a bare number or letter, so "3" reads "Table 3" while a label that
 * already says what it is ("Head table", "Row 2", "Garden room") stays as the host wrote it.
 */
export function tableLabelText(label: string, template: string): string {
  const bare = /^(\d{1,3}[a-z]?|[a-z])$/i.test(label.trim());
  return bare ? template.replace("{table}", label.trim()) : label;
}
