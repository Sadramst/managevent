import { describe, expect, it } from "vitest";
import { formatDayMonthYear, formatEventDateTime, localHour } from "./format.js";

describe("email date formatting (en-AU)", () => {
  // 16:00 on Sunday 20 December 2026 in Perth (UTC+8).
  const instant = new Date("2026-12-20T08:00:00.000Z");

  it("formats DD/MM/YYYY in the given time zone", () => {
    expect(formatDayMonthYear(instant)).toBe("20/12/2026");
    // 23:30 UTC on the 5th is already the 6th in Perth.
    expect(formatDayMonthYear(new Date("2027-03-05T23:30:00.000Z"), "Australia/Perth")).toBe(
      "06/03/2027",
    );
    expect(formatDayMonthYear(new Date("2027-03-05T23:30:00.000Z"), "Europe/London")).toBe(
      "05/03/2027",
    );
  });

  it("formats a full event date and time", () => {
    expect(formatEventDateTime(instant, "Australia/Perth")).toBe(
      "Sunday 20 December 2026 at 4:00 pm",
    );
    expect(formatEventDateTime(instant, "Australia/Sydney")).toBe(
      "Sunday 20 December 2026 at 7:00 pm",
    );
    expect(formatEventDateTime(new Date("2026-12-20T01:05:00.000Z"), "Australia/Perth")).toBe(
      "Sunday 20 December 2026 at 9:05 am",
    );
  });

  it("reads the wall-clock hour and falls back to Perth for an unknown zone", () => {
    expect(localHour(instant, "Australia/Perth")).toBe(16);
    expect(localHour(new Date("2026-12-20T16:00:00.000Z"), "Australia/Perth")).toBe(0);
    expect(localHour(instant, "Not/AZone")).toBe(16);
    expect(formatDayMonthYear(instant, "Not/AZone")).toBe("20/12/2026");
  });
});
