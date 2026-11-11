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
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
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
