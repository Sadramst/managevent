import "server-only";

import type { CheckInGuest, CheckInRoster } from "@managevent/validators";
import { formatLocalDateTime } from "@/lib/dates";
import type { DoorGuest, DoorRoster } from "./door";
import { formatInstantTime } from "./instants";

/** One guest on the door list, with the arrival time formatted in the event's time zone. */
export function toDoorGuest(guest: CheckInGuest, timeZone: string): DoorGuest {
  return {
    guestId: guest.guestId,
    name: guest.name,
    isChild: guest.isChild,
    household: guest.partyDisplayName,
    tableLabel: guest.tableLabel,
    status: guest.status,
    arrivedAt: guest.checkedInAt ? formatInstantTime(guest.checkedInAt, timeZone) : null,
    severeAllergy: guest.severeAllergy,
    dietaryFlags: guest.dietaryFlags,
  };
}

/** The door list, sorted by name so a guest is where the eye expects them. */
export function toDoorRoster(roster: CheckInRoster): DoorRoster {
  const { timeZone } = roster.event;
  return {
    title: roster.event.title,
    startsOn: formatLocalDateTime(roster.event.startsAtLocal),
    guests: roster.guests
      .map((guest) => toDoorGuest(guest, timeZone))
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name, "en") || a.household.localeCompare(b.household, "en"),
      ),
  };
}
