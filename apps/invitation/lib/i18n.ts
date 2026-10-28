/**
 * Deterministic i18n & Jalali/Gregorian date formatting utilities (`WEBSITE.md` §A4, §B16).
 * Zero Intl dependency so SSR and client hydration produce bit-identical HTML across all browsers.
 */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

export function toPersianDigits(input: string | number): string {
  return String(input)
    .replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number.parseInt(d, 10)] ?? d)
    .replace(/[\u0660-\u0669]/g, (d) => PERSIAN_DIGITS[d.charCodeAt(0) - 0x0660] ?? d);
}

export function toLatinDigits(input: string): string {
  return input
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

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

export interface DateFormatOptions {
  includeTime?: boolean;
  includeWeekday?: boolean;
  timeZoneOffsetMinutes?: number;
}

export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number,
): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    (g_d_m[gm - 1] ?? 0);
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

export function formatDeterministicTime(
  hours24: number,
  minutes: number,
  locale: "en" | "fa",
): string {
  const paddedMin = String(minutes).padStart(2, "0");
  if (locale === "fa") {
    const paddedHour = String(hours24).padStart(2, "0");
    return toPersianDigits(`${paddedHour}:${paddedMin}`);
  }
  const period = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hour12}:${paddedMin} ${period}`;
}

export function formatCeremonyDate(
  dateInput: Date | string,
  locale: "en" | "fa",
  options: DateFormatOptions = {},
): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const weekday = date.getUTCDay();

  if (locale === "fa") {
    const monthName = FA_GREGORIAN_MONTHS[month - 1] ?? "";
    const weekdayPrefix = options.includeWeekday ? `${FA_WEEKDAYS[weekday] ?? ""}، ` : "";
    const gregorianPart = `${weekdayPrefix}${toPersianDigits(day)} ${monthName} ${toPersianDigits(year)}`;
    const timePart = options.includeTime
      ? `، ساعت ${formatDeterministicTime(hours, minutes, "fa")}`
      : "";

    const { jy, jm, jd } = gregorianToJalali(year, month, day);
    const jalaliMonth = FA_JALALI_MONTHS[jm - 1] ?? "";
    const jalaliPart = ` (${toPersianDigits(jd)} ${jalaliMonth} ${toPersianDigits(jy)})`;

    return `${gregorianPart}${jalaliPart}${timePart}`;
  }

  const monthName = EN_MONTHS[month - 1] ?? "";
  const weekdayPrefix = options.includeWeekday ? `${EN_WEEKDAYS[weekday] ?? ""}, ` : "";
  const timePart = options.includeTime
    ? ` at ${formatDeterministicTime(hours, minutes, "en")}`
    : "";

  return `${weekdayPrefix}${day} ${monthName} ${year}${timePart}`;
}
