/**
 * View models for door check-in. Built on the server (times already formatted in the event's
 * time zone) and safe to import from client components: types and pure functions only.
 *
 * The door sees flags, never notes: `severeAllergy` and the dietary tags, nothing else.
 */
import type { RsvpStatus } from "./view";
import { textMatches } from "./view";

export type DoorDietaryTag =
  | "HALAL"
  | "VEGETARIAN"
  | "VEGAN"
  | "GLUTEN_FREE"
  | "DAIRY_FREE"
  | "NUT_ALLERGY"
  | "SHELLFISH_ALLERGY"
  | "OTHER_ALLERGY"
  | "KOSHER"
  | "NONE";

export interface DoorGuest {
  guestId: string;
  name: string;
  isChild: boolean;
  household: string;
  tableLabel: string | null;
  status: RsvpStatus;
  /** "4:32 PM" once checked in, otherwise null. */
  arrivedAt: string | null;
  severeAllergy: boolean;
  dietaryFlags: DoorDietaryTag[];
}

export interface DoorRoster {
  title: string;
  /** "Saturday, 20 March 2027 at 4:00 PM". */
  startsOn: string;
  guests: DoorGuest[];
}

export type ScanOutcome = "OK" | "DUPLICATE" | "INVALID" | "WRONG_EVENT";

export interface DoorScanResult {
  result: ScanOutcome;
  guest: DoorGuest | null;
  /** "4:32 PM": when the guest first arrived (for a duplicate scan). */
  firstArrivedAt: string | null;
}

export type DoorFilter = "all" | "waiting" | "arrived";

export interface DoorTotals {
  expected: number;
  checkedIn: number;
}

/** Expected = guests who said yes; checked in = everyone marked as arrived. */
export function doorTotals(guests: readonly DoorGuest[]): DoorTotals {
  let expected = 0;
  let checkedIn = 0;
  for (const guest of guests) {
    if (guest.status === "YES") expected += 1;
    if (guest.arrivedAt !== null) checkedIn += 1;
  }
  return { expected, checkedIn };
}

/** The door list after the search box and the arrived filter. */
export function filterDoorGuests(
  guests: readonly DoorGuest[],
  query: string,
  filter: DoorFilter,
): DoorGuest[] {
  return guests.filter(
    (guest) =>
      (filter === "all" || (filter === "arrived") === (guest.arrivedAt !== null)) &&
      textMatches([guest.name, guest.household, guest.tableLabel], query),
  );
}
