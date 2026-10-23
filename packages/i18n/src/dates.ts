/**
 * Deterministic Gregorian and Jalali (Solar Hijri) date formatters.
 *
 * Zero `Intl` usage so SSR and client hydration produce bit-identical HTML across
 * Node, iOS Safari, Android Chrome, and WhatsApp/Instagram in-app browsers (`WEBSITE.md` §B16).
 */
import type { EnabledLocale } from "@managevent/types";
import { toPersianDigits } from "./digits.js";

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

const FA_GREGORIAN_MONTHS = [
  "ژانویه",
  "فوریه",
  "مارس",
  "آوریل",
  "مه",
  "ژوئن",
  "ژوئیه",
  "اوت",
  "سپتامبر",
  "اکتبر",
  "نوامبر",
  "دسامبر",
] as const;

const FA_JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

const EN_JALALI_MONTHS = [
  "Farvardin",
  "Ordibehesht",
  "Khordad",
  "Tir",
  "Mordad",
  "Shahrivar",
  "Mehr",
  "Aban",
  "Azar",
  "Dey",
  "Bahman",
  "Esfand",
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

const FA_WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"] as const;

/**
 * Default offset in minutes for `Australia/Perth` (AWST = UTC+08:00, no DST).
 */
export const PERTH_UTC_OFFSET_MINUTES = 480 as const;

export interface JalaliDateParts {
  jy: number;
  jm: number;
  jd: number;
}

/**
 * Pure mathematical conversion from Gregorian `(gy, gm, gd)` (1-indexed month/day)
 * to Jalali / Solar Hijri `(jy, jm, jd)`.
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDateParts {
  const gDaysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] as const;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    (gDaysInMonth[gm - 1] ?? 0);

  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);

  return { jy, jm, jd };
}

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
  if (locale === "fa") {
    const paddedHour = String(hours24).padStart(2, "0");
    return toPersianDigits(`${paddedHour}:${paddedMin}`);
  }
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

  if (locale === "fa") {
    const monthName = FA_GREGORIAN_MONTHS[parts.month - 1] ?? "";
    const weekdayPrefix = options.includeWeekday ? `${FA_WEEKDAYS[parts.weekday] ?? ""}، ` : "";
    const datePart = `${weekdayPrefix}${toPersianDigits(parts.day)} ${monthName} ${toPersianDigits(parts.year)}`;
    if (options.includeTime) {
      return `${datePart}، ساعت ${formatDeterministicTime(parts.hours, parts.minutes, "fa")}`;
    }
    return datePart;
  }

  const monthName = EN_MONTHS[parts.month - 1] ?? "";
  const weekdayPrefix = options.includeWeekday ? `${EN_WEEKDAYS[parts.weekday] ?? ""}, ` : "";
  const datePart = `${weekdayPrefix}${parts.day} ${monthName} ${parts.year}`;
  if (options.includeTime) {
    return `${datePart} at ${formatDeterministicTime(parts.hours, parts.minutes, "en")}`;
  }
  return datePart;
}

/**
 * Formats a date deterministically in the Jalali (Solar Hijri) calendar without `Intl`.
 */
export function formatJalaliDate(
  dateInput: Date | string,
  locale: EnabledLocale = "fa",
  options: DateFormatOptions = {},
): string {
  const offset = options.timeZoneOffsetMinutes ?? PERTH_UTC_OFFSET_MINUTES;
  const parts = getZonedUtcParts(dateInput, offset);
  const { jy, jm, jd } = gregorianToJalali(parts.year, parts.month, parts.day);

  if (locale === "fa") {
    const monthName = FA_JALALI_MONTHS[jm - 1] ?? "";
    return `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
  }

  const monthName = EN_JALALI_MONTHS[jm - 1] ?? "";
  return `${jd} ${monthName} ${jy}`;
}

/**
 * Formats a ceremony date per `WEBSITE.md` §A4:
 * - `en`: Gregorian date (and optional time)
 * - `fa`: Gregorian date with the Jalali date in brackets, e.g. `۱۵ دسامبر ۲۰۲۶ (۲۴ آذر ۱۴۰۵)`
 */
export function formatCeremonyDate(
  dateInput: Date | string,
  locale: EnabledLocale,
  options: DateFormatOptions = {},
): string {
  const gregorian = formatGregorianDate(dateInput, locale, options);
  if (locale === "fa") {
    const jalali = formatJalaliDate(dateInput, "fa", options);
    return `${gregorian} (${jalali})`;
  }
  return gregorian;
}
