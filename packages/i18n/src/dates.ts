/**
 * Deterministic Gregorian date formatters (en-AU).
 *
 * Zero `Intl` usage so SSR and client hydration produce bit-identical HTML across
 * Node, iOS Safari, Android Chrome, and WhatsApp/Instagram in-app browsers (`WEBSITE.md` §B16).
 */
import type { EnabledLocale } from "@managevent/types";

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

/**
 * Default offset in minutes for `Australia/Perth` (AWST = UTC+08:00, no DST).
 */
export const PERTH_UTC_OFFSET_MINUTES = 480 as const;

export interface DateFormatOptions {
  /** Offset from UTC in minutes (defaults to `480` for `Australia/Perth`). */
  timeZoneOffsetMinutes?: number;
  /** Whether to include the formatted time (e.g. `4:00 PM`). */
  includeTime?: boolean;
  /** Whether to include the weekday name. */
  includeWeekday?: boolean;
}

function getZonedUtcParts(dateInput: Date | string, offsetMinutes: number) {
  const rawMs = typeof dateInput === "string" ? Date.parse(dateInput) : dateInput.getTime();
  if (Number.isNaN(rawMs)) {
    throw new RangeError("Invalid date passed to deterministic formatter");
  }
  const shifted = new Date(rawMs + offsetMinutes * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

function formatDeterministicTime(hours24: number, minutes: number, locale: EnabledLocale): string {
  const paddedMin = String(minutes).padStart(2, "0");
  const period = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hour12}:${paddedMin} ${period}`;
}

/**
 * Formats a date deterministically in the Gregorian calendar without `Intl`.
 */
export function formatGregorianDate(
  dateInput: Date | string,
  locale: EnabledLocale,
  options: DateFormatOptions = {},
): string {
  const offset = options.timeZoneOffsetMinutes ?? PERTH_UTC_OFFSET_MINUTES;
  const parts = getZonedUtcParts(dateInput, offset);

  const monthName = EN_MONTHS[parts.month - 1] ?? "";
  const weekdayPrefix = options.includeWeekday ? `${EN_WEEKDAYS[parts.weekday] ?? ""}, ` : "";
  const datePart = `${weekdayPrefix}${parts.day} ${monthName} ${parts.year}`;
  if (options.includeTime) {
    return `${datePart} at ${formatDeterministicTime(parts.hours, parts.minutes, "en")}`;
  }
  return datePart;
}

/**
 * Formats a ceremony date per `WEBSITE.md` §A4: Gregorian date (and optional time), e.g. `23 October 2026`.
 */
export function formatCeremonyDate(
  dateInput: Date | string,
  locale: EnabledLocale,
  options: DateFormatOptions = {},
): string {
  return formatGregorianDate(dateInput, locale, options);
}
