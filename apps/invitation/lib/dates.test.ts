import { describe, expect, it } from "vitest";
import {
  formatLocalDate,
  formatLocalDateShort,
  formatLocalDateTime,
  formatLocalTime,
  formatScheduleTime,
  joinLocal,
  splitLocal,
} from "./dates";

/**
 * The API sends every time twice: the instant, and the wall clock in the event's time zone
 * (`"YYYY-MM-DDTHH:mm"`). Pages show the second, and these helpers format it. They must give
 * the same text on the server and in every browser, so nothing here may depend on the machine's
 * own time zone or locale.
 */

describe("formatLocalDateTime", () => {
  it("writes the date the Australian way: weekday, day, month, year, then the time", () => {
    expect(formatLocalDateTime("2026-10-23T16:30")).toBe("Friday, 23 October 2026 at 4:30 PM");
    expect(formatLocalDateTime("2027-01-01T09:05")).toBe("Friday, 1 January 2027 at 9:05 AM");
  });

  it("can leave out the weekday, the time, or both", () => {
    expect(formatLocalDateTime("2026-10-23T16:30", { weekday: false })).toBe(
      "23 October 2026 at 4:30 PM",
    );
    expect(formatLocalDateTime("2026-10-23T16:30", { time: false })).toBe(
      "Friday, 23 October 2026",
    );
    expect(formatLocalDateTime("2026-10-23T16:30", { weekday: false, time: false })).toBe(
      "23 October 2026",
    );
  });

  it("does not shift the day at either end of the clock", () => {
    // A wall-clock value has no zone: 00:00 and 23:59 stay on the day that was written.
    expect(formatLocalDateTime("2026-12-31T00:00")).toBe("Thursday, 31 December 2026 at 12:00 AM");
    expect(formatLocalDateTime("2026-12-31T23:59")).toBe("Thursday, 31 December 2026 at 11:59 PM");
  });

  it("knows a leap day", () => {
    expect(formatLocalDateTime("2028-02-29T12:00")).toBe("Tuesday, 29 February 2028 at 12:00 PM");
  });

  it("gives every month its name", () => {
    const months = Array.from({ length: 12 }, (_, index) =>
      formatLocalDate(`2026-${String(index + 1).padStart(2, "0")}-15T10:00`),
    );
    expect(months).toEqual([
      "15 January 2026",
      "15 February 2026",
      "15 March 2026",
      "15 April 2026",
      "15 May 2026",
      "15 June 2026",
      "15 July 2026",
      "15 August 2026",
      "15 September 2026",
      "15 October 2026",
      "15 November 2026",
      "15 December 2026",
    ]);
  });

  it("returns a value it cannot read unchanged, rather than throwing in a page", () => {
    for (const value of ["", "soon", "2026-10-23", "2026-10-23T24:00", "2026-10-23T16:30:00Z"]) {
      expect(formatLocalDateTime(value)).toBe(value);
    }
  });
});

describe("formatLocalDate and formatLocalDateShort", () => {
  it("drops the time; the weekday is optional", () => {
    expect(formatLocalDate("2026-10-23T16:30")).toBe("23 October 2026");
    expect(formatLocalDate("2026-10-23T16:30", { weekday: true })).toBe("Friday, 23 October 2026");
  });

  it("writes the compact form as DD/MM/YYYY, never month first", () => {
    expect(formatLocalDateShort("2026-10-03T09:05")).toBe("03/10/2026");
    expect(formatLocalDateShort("2026-03-10T09:05")).toBe("10/03/2026");
    expect(formatLocalDateShort("tomorrow")).toBe("tomorrow");
  });
});

describe("times", () => {
  it("uses a 12-hour clock with AM and PM", () => {
    expect(formatLocalTime("2026-10-23T00:00")).toBe("12:00 AM");
    expect(formatLocalTime("2026-10-23T00:05")).toBe("12:05 AM");
    expect(formatLocalTime("2026-10-23T11:59")).toBe("11:59 AM");
    expect(formatLocalTime("2026-10-23T12:00")).toBe("12:00 PM");
    expect(formatLocalTime("2026-10-23T13:07")).toBe("1:07 PM");
    expect(formatLocalTime("2026-10-23T23:59")).toBe("11:59 PM");
    expect(formatLocalTime("2026-10-23")).toBe("2026-10-23");
  });

  it("formats a schedule item's HH:mm the same way", () => {
    expect(formatScheduleTime("00:00")).toBe("12:00 AM");
    expect(formatScheduleTime("09:30")).toBe("9:30 AM");
    expect(formatScheduleTime("12:00")).toBe("12:00 PM");
    expect(formatScheduleTime("18:30")).toBe("6:30 PM");
    expect(formatScheduleTime(" 18:30 ")).toBe("6:30 PM");
  });

  it("leaves a schedule time it cannot read as the host typed it", () => {
    for (const value of ["late", "6pm", "24:00", "18:60", "8:30"]) {
      expect(formatScheduleTime(value)).toBe(value);
    }
  });
});

describe("splitLocal and joinLocal", () => {
  it("split a value for the date and time inputs, and join them back", () => {
    const parts = splitLocal("2026-10-23T16:30");
    expect(parts).toEqual({ date: "2026-10-23", time: "16:30" });
    expect(joinLocal(parts.date, parts.time)).toBe("2026-10-23T16:30");
  });

  it("give empty inputs for a missing or unreadable value", () => {
    for (const value of [null, undefined, "", "2026-10-23", "23/10/2026 16:30"]) {
      expect(splitLocal(value)).toEqual({ date: "", time: "" });
    }
  });

  it("refuse to join a half-filled or impossible pair", () => {
    expect(joinLocal("2026-10-23", "")).toBeNull();
    expect(joinLocal("", "16:30")).toBeNull();
    expect(joinLocal("2026-10-23", "24:00")).toBeNull();
    expect(joinLocal("23/10/2026", "16:30")).toBeNull();
    expect(joinLocal("2026-10-23", "4:30 PM")).toBeNull();
  });
});
