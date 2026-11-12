/**
 * Maps party rows to the host DTO. Pure, so the derivation rules are tested without a database.
 */
import type { RsvpStatus } from "@managevent/db";
import type { HostGuest, HostParty } from "@managevent/validators";
import { fromLocalized } from "../../lib/localized.js";
import { hashEmailAddress } from "../messaging/unsubscribe-token.js";

/** The slice of a party row (with its live guests) the DTO needs. */
export interface PartyViewRow {
  id: string;
  displayName: unknown;
  token: string;
  tokenRevokedAt: Date | null;
  maxSeats: number;
  allowPlusOnes: boolean;
  childrenAllowed: boolean;
  tags: string[];
  tableLabel: string | null;
  createdAt: Date;
  guests: Array<{
    id: string;
    name: unknown;
    email: string | null;
    phone: string | null;
    isChild: boolean;
    isPlusOne: boolean;
    rsvp: { status: RsvpStatus; respondedAt: Date } | null;
    passes: Array<{ checkedInAt: Date | null }>;
  }>;
}

/** What has been emailed to one address for this event (keyed by address hash). */
export interface AddressEmailActivity {
  inviteSentAt: Date | null;
  remindersSent: number;
}

export type EmailActivityByHash = ReadonlyMap<string, AddressEmailActivity>;

/**
 * Party status from its guests: any `YES` → `YES`; else any `MAYBE` → `MAYBE`; else every guest
 * `NO` → `NO`; else `PENDING` (including a party with no guests).
 */
export function derivePartyStatus(statuses: readonly RsvpStatus[]): RsvpStatus {
  if (statuses.includes("YES")) return "YES";
  if (statuses.includes("MAYBE")) return "MAYBE";
  if (statuses.length > 0 && statuses.every((status) => status === "NO")) return "NO";
  return "PENDING";
}

export const invitePath = (eventSlug: string, token: string): string => `/i/${eventSlug}/${token}`;

function toHostGuest(guest: PartyViewRow["guests"][number]): HostGuest {
  const status: RsvpStatus = guest.rsvp?.status ?? "PENDING";
  const checkIns = guest.passes
    .map((pass) => pass.checkedInAt)
    .filter((at): at is Date => at !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  return {
    id: guest.id,
    name: fromLocalized(guest.name),
    email: guest.email,
    phone: guest.phone,
    isChild: guest.isChild,
    isPlusOne: guest.isPlusOne,
    status,
    // A response the host reset to pending is not a response.
    respondedAt: guest.rsvp && status !== "PENDING" ? guest.rsvp.respondedAt.toISOString() : null,
    checkedInAt: checkIns[0]?.toISOString() ?? null,
  };
}

export interface HostPartyViewOptions {
  eventSlug: string;
  /**
   * Whether the caller may see the party's guest link. The token is the whole credential for
   * answering as that party, so it only goes to callers who hold `guest:write`; everyone else
   * (a VIEWER co-host) gets `token: null` and `invitePath: null`.
   */
  showLink: boolean;
  emailActivity?: EmailActivityByHash;
}

export function toHostParty(row: PartyViewRow, options: HostPartyViewOptions): HostParty {
  const { eventSlug, showLink } = options;
  const emailActivity = options.emailActivity ?? new Map<string, AddressEmailActivity>();
  const guests = row.guests.map(toHostGuest);
  const responded = guests
    .map((guest) => guest.respondedAt)
    .filter((at): at is string => at !== null)
    .sort();

  let hasAddress = false;
  let inviteSentAt: Date | null = null;
  let remindersSent = 0;
  for (const guest of row.guests) {
    if (!guest.email) continue;
    hasAddress = true;
    const activity = emailActivity.get(hashEmailAddress(guest.email));
    if (!activity) continue;
    if (activity.inviteSentAt && (!inviteSentAt || activity.inviteSentAt < inviteSentAt)) {
      inviteSentAt = activity.inviteSentAt;
    }
    // Reminders are capped per address, so report the address that has had the most.
    remindersSent = Math.max(remindersSent, activity.remindersSent);
  }

  return {
    id: row.id,
    displayName: fromLocalized(row.displayName),
    token: showLink ? row.token : null,
    invitePath: showLink ? invitePath(eventSlug, row.token) : null,
    tokenRevokedAt: row.tokenRevokedAt?.toISOString() ?? null,
    maxSeats: row.maxSeats,
    allowPlusOnes: row.allowPlusOnes,
    childrenAllowed: row.childrenAllowed,
    tags: row.tags,
    tableLabel: row.tableLabel,
    status: derivePartyStatus(guests.map((guest) => guest.status)),
    respondedAt: responded.at(-1) ?? null,
    email: { hasAddress, inviteSentAt: inviteSentAt?.toISOString() ?? null, remindersSent },
    guests,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Case-insensitive match of `q` against the party name, guest names and guest emails. */
export function partyMatchesQuery(party: HostParty, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (needle.length === 0) return true;
  if (party.displayName.toLowerCase().includes(needle)) return true;
  return party.guests.some(
    (guest) =>
      guest.name.toLowerCase().includes(needle) ||
      (guest.email?.toLowerCase().includes(needle) ?? false),
  );
}
