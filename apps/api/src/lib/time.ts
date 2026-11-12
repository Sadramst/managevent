/**
 * Wall-clock ↔ UTC conversion for IANA time zones, using only `Intl` (no date library).
 *
 * Inputs and outputs use `YYYY-MM-DDTHH:mm` for the wall clock. Daylight saving is handled
 * explicitly:
 * - a wall time that occurs twice (clocks go back) resolves to the EARLIER instant;
 * - a wall time that does not exist (clocks go forward) resolves to the instant the same
 *   distance after the gap starts, i.e. `02:30` in a `02:00 → 03:00` gap becomes `03:30`.
 * These match the "compatible" disambiguation of the TC39 Temporal proposal.
 */
const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("en-AU", {
        timeZone,
        calendar: "gregory",
        numberingSystem: "latn",
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      throw new RangeError(`Invalid IANA time zone: ${timeZone}`);
    }
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

interface WallFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallFieldsAt(utcMs: number, timeZone: string): WallFields {
  const fields: WallFields = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  for (const part of getFormatter(timeZone).formatToParts(new Date(utcMs))) {
    if (part.type in fields) {
      fields[part.type as keyof WallFields] = Number(part.value);
    }
  }
  // Some engines print midnight as 24 even with h23.
  if (fields.hour === 24) fields.hour = 0;
  return fields;
}

/** Offset of `timeZone` from UTC at the given instant, in milliseconds (east is positive). */
function offsetMsAt(utcMs: number, timeZone: string): number {
  const f = wallFieldsAt(utcMs, timeZone);
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

const pad = (value: number, width = 2) => String(value).padStart(width, "0");

/** Formats an instant as the wall clock in `timeZone`: `YYYY-MM-DDTHH:mm`. */
export function utcToZonedWallTime(d: Date, timeZone: string): string {
  const ms = d.getTime();
  if (Number.isNaN(ms)) throw new RangeError("Invalid date");
  const f = wallFieldsAt(ms, timeZone);
  return `${pad(f.year, 4)}-${pad(f.month)}-${pad(f.day)}T${pad(f.hour)}:${pad(f.minute)}`;
}

/** Converts a wall-clock `YYYY-MM-DDTHH:mm` in `timeZone` to the UTC instant. */
export function zonedWallTimeToUtc(local: string, timeZone: string): Date {
  const match = LOCAL_PATTERN.exec(local);
  if (!match) {
    throw new RangeError("Local date-time must be in the form YYYY-MM-DDTHH:mm");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  // The wall-clock fields read as if they were UTC.
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(wallAsUtc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new RangeError("Local date-time is not a real calendar date");
  }

  // Offsets in force a day either side: at most one transition falls between them in practice.
  const offsetBefore = offsetMsAt(wallAsUtc - DAY_MS, timeZone);
  const offsetAfter = offsetMsAt(wallAsUtc + DAY_MS, timeZone);

  const candidates = [...new Set([wallAsUtc - offsetBefore, wallAsUtc - offsetAfter])].sort(
    (a, b) => a - b,
  );
  for (const candidate of candidates) {
    // A candidate is right when the zone really shows this wall time at that instant.
    if (wallAsUtc - candidate === offsetMsAt(candidate, timeZone)) {
      return new Date(candidate);
    }
  }

  // No instant shows this wall time: it sits in a spring-forward gap. Carry it past the gap.
  return new Date(wallAsUtc - offsetBefore);
}
