/**
 * Formatting for the `...Local` wall-clock strings every API DTO carries (`"YYYY-MM-DDTHH:mm"`,
 * already in the event's time zone).
 *
 * Deterministic and `Intl`-free, so server HTML and client hydration match in every browser,
 * including the WhatsApp and Instagram in-app browsers. Never format `startsAt` (the UTC
 * instant) for display: use `startsAtLocal`.
 */
import { formatGregorianDate } from "@managevent/i18n";

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;

function toUtcIso(local: string): string | null {
  return LOCAL_PATTERN.test(local) ? `${local}:00.000Z` : null;
}

/** "4:30 PM" from hours and minutes. */
function clock(hours: number, minutes: number): string {
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * "Friday, 23 October 2026 at 4:30 PM". Options drop the weekday or the time.
 * An unparseable value is returned unchanged rather than throwing in a page.
 */
export function formatLocalDateTime(
  local: string,
  options: { weekday?: boolean; time?: boolean } = {},
): string {
  const iso = toUtcIso(local);
  if (!iso) return local;
  return formatGregorianDate(iso, "en", {
    timeZoneOffsetMinutes: 0,
    includeWeekday: options.weekday ?? true,
    includeTime: options.time ?? true,
  });
}

/** "23 October 2026" (or with the weekday: "Friday, 23 October 2026"). */
export function formatLocalDate(local: string, options: { weekday?: boolean } = {}): string {
  return formatLocalDateTime(local, { weekday: options.weekday ?? false, time: false });
}

/** "23/10/2026": the compact en-AU form for tables. */
export function formatLocalDateShort(local: string): string {
  const match = LOCAL_PATTERN.exec(local);
  if (!match) return local;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** "4:30 PM" from a local date-time. */
export function formatLocalTime(local: string): string {
  const match = LOCAL_PATTERN.exec(local);
  if (!match) return local;
  return clock(Number(match[4]), Number(match[5]));
}

/** "4:30 PM" from a schedule item's `"HH:mm"`. Returns the input if it is not `HH:mm`. */
export function formatScheduleTime(time: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) return time;
  return clock(Number(match[1]), Number(match[2]));
}

/** Splits a local date-time for `<input type="date">` and `<input type="time">`. */
export function splitLocal(local: string | null | undefined): { date: string; time: string } {
  const match = local ? LOCAL_PATTERN.exec(local) : null;
  if (!match) return { date: "", time: "" };
  return { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` };
}

/** Joins date and time inputs back into `"YYYY-MM-DDTHH:mm"`, or null when either is missing. */
export function joinLocal(date: string, time: string): string | null {
  const joined = `${date}T${time}`;
  return LOCAL_PATTERN.test(joined) ? joined : null;
}
