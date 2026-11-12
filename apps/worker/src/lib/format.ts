/**
 * en-AU date formatting for emails, in a named IANA time zone.
 *
 * The worker is not a rendering path, so `Intl` is fine here (the deterministic formatters in
 * `@managevent/i18n` exist for SSR and take a fixed offset, not a time zone name).
 */
const DEFAULT_TIME_ZONE = "Australia/Perth";

function partsOf(at: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-AU", { ...options, timeZone });
  } catch {
    formatter = new Intl.DateTimeFormat("en-AU", { ...options, timeZone: DEFAULT_TIME_ZONE });
  }
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(at)) parts[part.type] = part.value;
  return parts;
}

/** `DD/MM/YYYY` in `timeZone`. */
export function formatDayMonthYear(at: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  const parts = partsOf(at, timeZone, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${parts.day}/${parts.month}/${parts.year}`;
}

/** For example `Saturday 20 December 2026 at 4:00 pm`, in `timeZone`. */
export function formatEventDateTime(at: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  const parts = partsOf(at, timeZone, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const period = (parts.dayPeriod ?? "").toLowerCase().replace(/\./g, "");
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year} at ${parts.hour}:${parts.minute} ${period}`.trim();
}

/** The hour (0-23) on the wall clock in `timeZone`. */
export function localHour(at: Date, timeZone: string = DEFAULT_TIME_ZONE): number {
  const parts = partsOf(at, timeZone, { hour: "2-digit", hourCycle: "h23" });
  const hour = Number(parts.hour);
  return hour === 24 ? 0 : hour;
}
