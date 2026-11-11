/**
 * Deterministic en-AU date formatting utilities (`WEBSITE.md` §A4, §B16).
 * Zero Intl dependency so SSR and client hydration produce bit-identical HTML across all browsers.
 */

const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const EN_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export interface DateFormatOptions {
  includeTime?: boolean;
  includeWeekday?: boolean;
  timeZoneOffsetMinutes?: number;
  /** IANA zone (e.g. "Australia/Perth"). Ignored when timeZoneOffsetMinutes is given. */
  timeZone?: string;
}

/**
 * Deterministic Australian UTC offsets (minutes) for an IANA zone at a given instant.
 * No Intl. DST (first Sunday in October 2:00am standard to first Sunday in April
 * 2:00am standard) applies to NSW, ACT, VIC, TAS and SA. QLD, NT and WA have none.
 * Unknown zones fall back to Australia/Perth (+08:00), the launch market.
 */
const AU_ZONES: Record<string, { std: number; dst: boolean }> = {
  "Australia/Perth": { std: 480, dst: false },
  "Australia/Darwin": { std: 570, dst: false },
  "Australia/Brisbane": { std: 600, dst: false },
  "Australia/Adelaide": { std: 570, dst: true },
  "Australia/Sydney": { std: 600, dst: true },
  "Australia/Melbourne": { std: 600, dst: true },
  "Australia/Canberra": { std: 600, dst: true },
  "Australia/Hobart": { std: 600, dst: true },
};

function firstSundayUtcMs(year: number, monthIndex: number): number {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  return Date.UTC(year, monthIndex, 1 + ((7 - first.getUTCDay()) % 7));
}

export function getAustralianOffsetMinutes(timeZone: string | undefined, instant: Date): number {
  const zone = AU_ZONES[timeZone ?? ""] ?? AU_ZONES["Australia/Perth"]!;
  if (!zone.dst) return zone.std;
  const t = instant.getTime();
  const stdMs = zone.std * 60_000;
  // Local standard time 2:00am on the transition Sundays, expressed in UTC.
  const year = new Date(t + stdMs).getUTCFullYear();
  const dstEnd = firstSundayUtcMs(year, 3) + 2 * 3_600_000 - stdMs;
  const dstStart = firstSundayUtcMs(year, 9) + 2 * 3_600_000 - stdMs;
  const inDst = t < dstEnd || t >= dstStart;
  return zone.std + (inDst ? 60 : 0);
}

/** Formats a "HH:MM" schedule time as "6:30 PM"; returns the input if it is not HH:MM. */
export function formatScheduleTime(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return time;
  return formatDeterministicTime(Number(m[1]), Number(m[2]));
}

export function formatDeterministicTime(hours24: number, minutes: number): string {
  const paddedMin = String(minutes).padStart(2, "0");
  const period = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hour12}:${paddedMin} ${period}`;
}

export function formatCeremonyDate(
  dateInput: Date | string,
  _locale: "en",
  options: DateFormatOptions = {},
): string {
  const instant = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const offset =
    options.timeZoneOffsetMinutes ??
    (options.timeZone ? getAustralianOffsetMinutes(options.timeZone, instant) : 0);
  const date = new Date(instant.getTime() + offset * 60_000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const weekday = date.getUTCDay();

  const monthName = EN_MONTHS[month - 1] ?? "";
  const weekdayPrefix = options.includeWeekday ? `${EN_WEEKDAYS[weekday] ?? ""}, ` : "";
  const timePart = options.includeTime ? ` at ${formatDeterministicTime(hours, minutes)}` : "";

  return `${weekdayPrefix}${day} ${monthName} ${year}${timePart}`;
}
