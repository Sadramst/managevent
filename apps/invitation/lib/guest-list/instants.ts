/**
 * Formatting for UTC instants (`respondedAt`, `checkedInAt`, `createdAt`) in the event's time
 * zone. SERVER ONLY in practice: pages format on the server and hand finished strings to client
 * components, so the browser never formats a date and hydration cannot disagree.
 *
 * The instant is first turned into the event's wall-clock string (`YYYY-MM-DDTHH:mm`), then
 * formatted by the same deterministic helpers as every other date in the app (`lib/dates`).
 */
import {
  formatLocalDate,
  formatLocalDateShort,
  formatLocalDateTime,
  formatLocalTime,
} from "@/lib/dates";

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-AU", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** `2026-11-12T08:30:00.000Z` in `Australia/Perth` → `2026-11-12T16:30`. Null if unparseable. */
export function instantToLocal(iso: string, timeZone: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const parts: Record<string, string> = {};
    for (const part of formatterFor(timeZone).formatToParts(date)) parts[part.type] = part.value;
    const hour = parts.hour === "24" ? "00" : parts.hour;
    return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
  } catch {
    // An unknown time zone name: show UTC rather than fail the page.
    return iso.slice(0, 16);
  }
}

/** "12/11/2026, 4:30 PM": compact, for lists and tables. */
export function formatInstantShort(iso: string, timeZone: string): string {
  const local = instantToLocal(iso, timeZone);
  return local ? `${formatLocalDateShort(local)}, ${formatLocalTime(local)}` : "";
}

/** "12 November 2026": the day only. */
export function formatInstantDate(iso: string, timeZone: string): string {
  const local = instantToLocal(iso, timeZone);
  return local ? formatLocalDate(local) : "";
}

/** "Thursday, 12 November 2026 at 4:30 PM". */
export function formatInstantLong(iso: string, timeZone: string): string {
  const local = instantToLocal(iso, timeZone);
  return local ? formatLocalDateTime(local) : "";
}

/** "4:30 PM": for the door list. */
export function formatInstantTime(iso: string, timeZone: string): string {
  const local = instantToLocal(iso, timeZone);
  return local ? formatLocalTime(local) : "";
}
