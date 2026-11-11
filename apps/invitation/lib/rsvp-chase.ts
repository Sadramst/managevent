import { getExperienceMode } from "@managevent/i18n";
import type { EventModel, GuestParty } from "./types";
import { chaseCopy } from "./rsvp-chase-copy";

export type ReminderMode = "celebration" | "memorial";

export type DeadlineStatus =
  | { kind: "no-deadline" }
  | { kind: "open"; daysRemaining: number }
  | { kind: "due-today" }
  | { kind: "closed"; daysOverdue: number };

/** A party is awaiting when its status is PENDING (no yes or no yet). */
export function getAwaitingParties(event: Pick<EventModel, "parties">): GuestParty[] {
  return event.parties.filter((p) => p.status === "PENDING");
}

export function getChaseCounts(event: Pick<EventModel, "parties">) {
  const total = event.parties.length;
  const awaiting = getAwaitingParties(event).length;
  return { awaiting, replied: total - awaiting, total };
}

export function getReminderMode(
  event: Pick<EventModel, "experienceMode" | "ceremonySlug">,
): ReminderMode {
  const mode = getExperienceMode({
    ceremonySlug: event.ceremonySlug,
    experienceMode: event.experienceMode,
  });
  return mode === "MEMORIAL" ? "memorial" : "celebration";
}

function safeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone });
    return timeZone;
  } catch {
    return "Australia/Perth";
  }
}

/** Calendar date parts of an instant in the given time zone. Deterministic, locale independent. */
function zonedParts(date: Date, timeZone: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone(timeZone),
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Formats as DD/MM/YYYY in the given time zone using fixed parts. */
export function formatDateAu(iso: string | Date, timeZone: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  const { y, m, d } = zonedParts(date, timeZone);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String(y).padStart(4, "0")}`;
}

export function getDeadlineStatus(
  event: Pick<EventModel, "rsvpDeadline" | "timeZone">,
  now: Date,
): DeadlineStatus {
  if (!event.rsvpDeadline) return { kind: "no-deadline" };
  const deadline = new Date(event.rsvpDeadline);
  if (Number.isNaN(deadline.getTime())) return { kind: "no-deadline" };
  const a = zonedParts(now, event.timeZone);
  const b = zonedParts(deadline, event.timeZone);
  const diff = Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
  if (diff > 0) return { kind: "open", daysRemaining: diff };
  if (diff === 0) return { kind: "due-today" };
  return { kind: "closed", daysOverdue: -diff };
}

/** Plain-text reminder. Never includes the token, URLs, dietary notes or other members' names. */
export function buildReminderText(
  event: Pick<EventModel, "title" | "rsvpDeadline" | "timeZone">,
  party: Pick<GuestParty, "displayName">,
  mode: ReminderMode,
): string {
  const c = chaseCopy.reminder[mode];
  const lines: string[] = [c.greeting(party.displayName), "", c.intro(event.title)];
  const date = event.rsvpDeadline ? formatDateAu(event.rsvpDeadline, event.timeZone) : "";
  lines.push(date ? c.deadline(date) : c.noDeadline, "", c.close);
  return lines.join("\n");
}
