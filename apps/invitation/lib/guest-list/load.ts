import "server-only";

import type { ManageventApiClient } from "@managevent/api-client";
import type { HostParty, HostPartyListQueryInput } from "@managevent/validators";
import { absoluteInviteUrl } from "@/lib/urls";
import { formatInstantDate } from "./instants";
import type { EmailPartyView, LinkPartyView, PartyView } from "./view";

/** The API returns at most 500 households a page; eight pages covers any real guest list. */
const PAGE_SIZE = 500;
const MAX_PAGES = 8;

export interface LoadedParties {
  items: HostParty[];
  totals: { parties: number; guests: number };
  /** True when the list is longer than one page load can show. */
  truncated: boolean;
}

/** Every household of an event (following `nextCursor`), optionally filtered by the API. */
export async function loadAllParties(
  api: ManageventApiClient,
  eventId: string,
  query: Pick<HostPartyListQueryInput, "status" | "tag" | "q"> = {},
): Promise<LoadedParties> {
  const items: HostParty[] = [];
  let totals = { parties: 0, guests: 0 };
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await api.guestList.listParties(eventId, {
      ...query,
      limit: PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...result.items);
    totals = result.totals;
    cursor = result.nextCursor;
    if (!cursor) return { items, totals, truncated: false };
  }
  return { items, totals, truncated: true };
}

/**
 * One household for the Share and Awaiting screens. Built field by field (never by spreading
 * the API's object), so nothing the screen does not show can reach the page: no guest email
 * addresses, and no phone numbers beyond the one the WhatsApp button uses.
 */
export function toLinkPartyView(party: HostParty, timeZone: string): LinkPartyView {
  return {
    id: party.id,
    displayName: party.displayName,
    inviteUrl: absoluteInviteUrl(party.invitePath),
    linkOff: party.tokenRevokedAt !== null,
    tableLabel: party.tableLabel,
    status: party.status,
    emailedOn: party.email.inviteSentAt
      ? formatInstantDate(party.email.inviteSentAt, timeZone)
      : null,
    remindersSent: party.email.remindersSent,
    phone: party.guests.find((guest) => guest.phone)?.phone ?? null,
    guests: party.guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      isChild: guest.isChild,
      status: guest.status,
    })),
  };
}

/** One household for the "email invitations" list: no link and no contact details at all. */
export function toEmailPartyView(party: HostParty, timeZone: string): EmailPartyView {
  return {
    id: party.id,
    displayName: party.displayName,
    linkOff: party.tokenRevokedAt !== null,
    emailedOn: party.email.inviteSentAt
      ? formatInstantDate(party.email.inviteSentAt, timeZone)
      : null,
  };
}

/**
 * One household as the Guests tab sees it (contact details included, because that is where
 * they are edited), with dates formatted in the event's zone.
 */
export function toPartyView(party: HostParty, timeZone: string): PartyView {
  return {
    id: party.id,
    displayName: party.displayName,
    inviteUrl: absoluteInviteUrl(party.invitePath),
    linkOff: party.tokenRevokedAt !== null,
    maxSeats: party.maxSeats,
    allowPlusOnes: party.allowPlusOnes,
    childrenAllowed: party.childrenAllowed,
    tags: party.tags,
    tableLabel: party.tableLabel,
    status: party.status,
    repliedOn: party.respondedAt ? formatInstantDate(party.respondedAt, timeZone) : null,
    hasEmail: party.email.hasAddress,
    emailedOn: party.email.inviteSentAt
      ? formatInstantDate(party.email.inviteSentAt, timeZone)
      : null,
    remindersSent: party.email.remindersSent,
    phone: party.guests.find((guest) => guest.phone)?.phone ?? null,
    guests: party.guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      isChild: guest.isChild,
      isPlusOne: guest.isPlusOne,
      status: guest.status,
      checkedIn: guest.checkedInAt !== null,
    })),
  };
}
