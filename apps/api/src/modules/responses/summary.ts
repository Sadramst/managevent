/**
 * RSVP totals and the dietary matrix, computed from decrypted guest rows.
 *
 * Pure functions (no database), so the counting rules are tested directly. The same rules as the
 * headcount snapshot apply: only live guests of live parties count, a guest without an RSVP is
 * pending, and dietary counts cover attending (`YES`) guests only.
 */
import type { AllergySeverity, DietaryTag, RsvpStatus } from "@managevent/types";
import type { DietaryMatrix, ResponsesSummary } from "@managevent/validators";
import { utcToZonedWallTime } from "../../lib/time.js";

export type DietaryCounts = ResponsesSummary["dietaryCounts"];
type CountedTag = keyof DietaryCounts;

const COUNTED_TAGS: readonly CountedTag[] = [
  "HALAL",
  "VEGETARIAN",
  "VEGAN",
  "GLUTEN_FREE",
  "DAIRY_FREE",
  "KOSHER",
  "NUT_ALLERGY",
  "SHELLFISH_ALLERGY",
  "OTHER_ALLERGY",
];
const COUNTED_TAG_SET: ReadonlySet<string> = new Set(COUNTED_TAGS);
const ALL_TAGS: ReadonlySet<string> = new Set([...COUNTED_TAGS, "NONE"]);
const SEVERITIES: ReadonlySet<string> = new Set(["MILD", "MODERATE", "SEVERE_ANAPHYLAXIS"]);

/** One live guest with their (already decrypted) response. */
export interface ResponseGuest {
  guestId: string;
  name: string;
  isChild: boolean;
  status: RsvpStatus;
  respondedAt: Date | null;
  dietary: string[];
  allergySeverity: string | null;
  allergyNotes: string | null;
  accessibilityNotes: string | null;
  songRequests: string[];
  messageToHost: string | null;
  checkedIn: boolean;
}

export interface ResponseParty {
  displayName: string;
  tableLabel: string | null;
  guests: ResponseGuest[];
}

export function emptyDietaryCounts(): DietaryCounts {
  return {
    HALAL: 0,
    VEGETARIAN: 0,
    VEGAN: 0,
    GLUTEN_FREE: 0,
    DAIRY_FREE: 0,
    KOSHER: 0,
    NUT_ALLERGY: 0,
    SHELLFISH_ALLERGY: 0,
    OTHER_ALLERGY: 0,
  };
}

function addTags(counts: DietaryCounts, dietary: readonly string[]): void {
  for (const tag of new Set(dietary)) {
    if (COUNTED_TAG_SET.has(tag)) counts[tag as CountedTag] += 1;
  }
}

function partyStatus(guests: readonly ResponseGuest[]): RsvpStatus {
  if (guests.some((guest) => guest.status === "YES")) return "YES";
  if (guests.some((guest) => guest.status === "MAYBE")) return "MAYBE";
  if (guests.length > 0 && guests.every((guest) => guest.status === "NO")) return "NO";
  return "PENDING";
}

/** Whole calendar days from `from` to `to` in `timeZone` (negative when `to` is earlier). */
function calendarDaysBetween(from: Date, to: Date, timeZone: string): number {
  const dayNumber = (at: Date): number => {
    const [year = 0, month = 1, day = 1] = utcToZonedWallTime(at, timeZone)
      .slice(0, 10)
      .split("-")
      .map(Number);
    return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
  };
  return dayNumber(to) - dayNumber(from);
}

export function describeDeadline(
  rsvpDeadline: Date | null,
  now: Date,
  timeZone: string,
): ResponsesSummary["deadline"] {
  if (!rsvpDeadline) {
    return { rsvpDeadline: null, rsvpDeadlineLocal: null, state: "NONE", days: null };
  }
  const days = calendarDaysBetween(now, rsvpDeadline, timeZone);
  const state =
    now.getTime() > rsvpDeadline.getTime() ? "CLOSED" : days === 0 ? "DUE_TODAY" : "OPEN";
  return {
    rsvpDeadline: rsvpDeadline.toISOString(),
    rsvpDeadlineLocal: utcToZonedWallTime(rsvpDeadline, timeZone),
    state,
    days,
  };
}

export function buildResponsesSummary(
  parties: readonly ResponseParty[],
  context: {
    now: Date;
    timeZone: string;
    rsvpDeadline: Date | null;
    latestHeadcount: ResponsesSummary["latestHeadcount"];
    linkedOrder: boolean;
  },
): ResponsesSummary {
  const totals: ResponsesSummary["totals"] = {
    parties: parties.length,
    partiesResponded: 0,
    guests: 0,
    adultsYes: 0,
    childrenYes: 0,
    maybe: 0,
    no: 0,
    pending: 0,
    checkedIn: 0,
  };
  const dietaryCounts = emptyDietaryCounts();
  let severeAllergyCount = 0;
  const songRequests: ResponsesSummary["songRequests"] = [];
  const messages: ResponsesSummary["messages"] = [];
  const recent: Array<{ partyDisplayName: string; status: RsvpStatus; at: Date }> = [];

  for (const party of parties) {
    let latest: Date | null = null;
    for (const guest of party.guests) {
      totals.guests += 1;
      if (guest.checkedIn) totals.checkedIn += 1;
      switch (guest.status) {
        case "YES":
          if (guest.isChild) totals.childrenYes += 1;
          else totals.adultsYes += 1;
          addTags(dietaryCounts, guest.dietary);
          if (guest.allergySeverity === "SEVERE_ANAPHYLAXIS") severeAllergyCount += 1;
          break;
        case "MAYBE":
          totals.maybe += 1;
          break;
        case "NO":
          totals.no += 1;
          break;
        default:
          totals.pending += 1;
      }
      if (guest.status === "PENDING" || !guest.respondedAt) continue;
      if (!latest || guest.respondedAt > latest) latest = guest.respondedAt;
    }

    // Song requests and the message belong to the party, not to the guest whose row carries
    // them. They live on the primary guest's row even when that guest has not answered (another
    // member replied for themselves) or was reset to pending by the host, so the carrier's own
    // status never hides them. They are dated from the party's latest response.
    for (const guest of party.guests) {
      for (const song of guest.songRequests) {
        if (song.trim().length > 0)
          songRequests.push({ partyDisplayName: party.displayName, song });
      }
      const notedAt = latest ?? guest.respondedAt;
      if (guest.messageToHost && guest.messageToHost.trim().length > 0 && notedAt) {
        messages.push({
          partyDisplayName: party.displayName,
          message: guest.messageToHost,
          respondedAt: notedAt.toISOString(),
        });
      }
    }
    if (latest) {
      totals.partiesResponded += 1;
      recent.push({
        partyDisplayName: party.displayName,
        status: partyStatus(party.guests),
        at: latest,
      });
    }
  }

  messages.sort((a, b) => b.respondedAt.localeCompare(a.respondedAt));
  recent.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    totals,
    dietaryCounts,
    severeAllergyCount,
    songRequests,
    messages,
    recent: recent.slice(0, 10).map((entry) => ({
      partyDisplayName: entry.partyDisplayName,
      status: entry.status,
      respondedAt: entry.at.toISOString(),
    })),
    deadline: describeDeadline(context.rsvpDeadline, context.now, context.timeZone),
    latestHeadcount: context.latestHeadcount,
    linkedOrder: context.linkedOrder,
  };
}

function hasHealthDetail(guest: ResponseGuest): boolean {
  return (
    guest.dietary.some((tag) => COUNTED_TAG_SET.has(tag)) ||
    guest.allergySeverity !== null ||
    guest.allergyNotes !== null ||
    guest.accessibilityNotes !== null
  );
}

/**
 * Per-guest health detail for attending guests who gave any, with counts overall and per table.
 * This is health information: the route requires `health:read`.
 */
export function buildDietaryMatrix(parties: readonly ResponseParty[]): DietaryMatrix {
  const rows: DietaryMatrix["rows"] = [];
  const counts = emptyDietaryCounts();
  const tables = new Map<string | null, { counts: DietaryCounts; severe: number }>();

  for (const party of parties) {
    for (const guest of party.guests) {
      if (guest.status !== "YES") continue;
      let table = tables.get(party.tableLabel);
      if (!table) {
        table = { counts: emptyDietaryCounts(), severe: 0 };
        tables.set(party.tableLabel, table);
      }
      addTags(counts, guest.dietary);
      addTags(table.counts, guest.dietary);
      if (guest.allergySeverity === "SEVERE_ANAPHYLAXIS") table.severe += 1;
      if (!hasHealthDetail(guest)) continue;

      rows.push({
        guestId: guest.guestId,
        guestName: guest.name,
        partyDisplayName: party.displayName,
        tableLabel: party.tableLabel,
        isChild: guest.isChild,
        dietary: [...new Set(guest.dietary)].filter((tag): tag is DietaryTag => ALL_TAGS.has(tag)),
        allergySeverity:
          guest.allergySeverity && SEVERITIES.has(guest.allergySeverity)
            ? (guest.allergySeverity as AllergySeverity)
            : null,
        allergyNotes: guest.allergyNotes,
        accessibilityNotes: guest.accessibilityNotes,
      });
    }
  }

  const byTable = [...tables.entries()]
    .map(([tableLabel, table]) => ({ tableLabel, counts: table.counts, severe: table.severe }))
    // Named tables in natural order ("Table 2" before "Table 10"), unassigned guests last.
    .sort((a, b) => {
      if (a.tableLabel === null) return b.tableLabel === null ? 0 : 1;
      if (b.tableLabel === null) return -1;
      return a.tableLabel.localeCompare(b.tableLabel, "en-AU", { numeric: true });
    });

  return { rows, counts, byTable };
}
