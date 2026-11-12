/**
 * Formats a wall-clock `"YYYY-MM-DDTHH:mm"` value in the browser, for the live invitation
 * preview while a host types a date.
 *
 * `@/lib/dates` does the same on the server; it cannot be used in a client component because it
 * pulls the whole `@managevent/i18n` dictionary into the bundle. The month and weekday names
 * come in as props (`invitationStudioEn.catalog.dateNames`), and a unit test keeps the two
 * formatters in step.
 */

export interface DateNames {
  months: readonly string[];
  weekdays: readonly string[];
  /** "{date} at {time}" */
  dateAtTime: string;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** True when `YYYY-MM-DD` names a real calendar day. */
export function isRealDate(date: string): boolean {
  const match = DATE_PATTERN.exec(date);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isTime(time: string): boolean {
  return TIME_PATTERN.test(time);
}

/** "Friday, 23 October 2026", or an empty string for a missing or impossible date. */
export function formatDateInput(date: string, names: DateNames): string {
  const match = DATE_PATTERN.exec(date);
  if (!match || !isRealDate(date)) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${names.weekdays[weekday] ?? ""}, ${day} ${names.months[month - 1] ?? ""} ${year}`;
}

/** "4:30 PM", or an empty string when the value is not `HH:mm`. */
export function formatTimeInput(time: string): string {
  const match = TIME_PATTERN.exec(time);
  if (!match) return "";
  const hours = Number(match[1]);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${match[2]} ${period}`;
}

/** "Friday, 23 October 2026 at 4:30 PM"; the date alone when no time is set; "" with no date. */
export function formatDateTimeInputs(date: string, time: string, names: DateNames): string {
  const datePart = formatDateInput(date, names);
  if (!datePart) return "";
  const timePart = formatTimeInput(time);
  if (!timePart) return datePart;
  return names.dateAtTime.replace("{date}", datePart).replace("{time}", timePart);
}

/** Today's date as `YYYY-MM-DD` in the browser's own time zone (for `min` on a date input). */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Fills `{placeholders}` in a copy string. The client-side twin of `fillCopy` from i18n. */
export function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.hasOwn(params, key) ? String(params[key]) : whole,
  );
}
