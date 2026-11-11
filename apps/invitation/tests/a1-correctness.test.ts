import { describe, it, expect } from "vitest";
import { formatCeremonyDate, formatScheduleTime, getAustralianOffsetMinutes } from "../lib/i18n";
import { buildCsvWithBom } from "../lib/csv-helper";
import {
  escapeIcsText,
  formatIcsDate,
} from "../app/i/[eventSlug]/[guestToken]/calendar.ics/ics-helpers";
import { getExperienceMode } from "@managevent/i18n";

describe("invitation-app-6: event time zone formatting", () => {
  it("shows Perth 18:30 +08:00 as 6:30 PM", () => {
    const out = formatCeremonyDate("2026-09-18T18:30:00+08:00", "en", {
      includeTime: true,
      includeWeekday: true,
      timeZone: "Australia/Perth",
    });
    expect(out).toBe("Friday, 18 September 2026 at 6:30 PM");
  });
  it("rolls the date over across midnight in the event zone", () => {
    const out = formatCeremonyDate("2026-09-18T20:00:00Z", "en", {
      timeZone: "Australia/Perth",
    });
    expect(out).toBe("19 September 2026");
  });
  it("uses DST for Sydney in summer and not in winter", () => {
    expect(getAustralianOffsetMinutes("Australia/Sydney", new Date("2026-12-25T00:00:00Z"))).toBe(
      660,
    );
    expect(getAustralianOffsetMinutes("Australia/Sydney", new Date("2026-07-01T00:00:00Z"))).toBe(
      600,
    );
    expect(getAustralianOffsetMinutes("Australia/Brisbane", new Date("2026-12-25T00:00:00Z"))).toBe(
      600,
    );
    expect(getAustralianOffsetMinutes("Australia/Adelaide", new Date("2026-12-25T00:00:00Z"))).toBe(
      630,
    );
  });
  it("formats schedule times as 12-hour", () => {
    expect(formatScheduleTime("18:30")).toBe("6:30 PM");
    expect(formatScheduleTime("00:05")).toBe("12:05 AM");
    expect(formatScheduleTime("Late")).toBe("Late");
  });
});

describe("invitation-app-11: experience mode helper", () => {
  it("derives memorial from ceremony slug even if experienceMode is stale", () => {
    expect(
      getExperienceMode({ ceremonySlug: "celebration-of-life", experienceMode: "CELEBRATION" }),
    ).toBe("MEMORIAL");
    expect(getExperienceMode({ ceremonySlug: "wedding", experienceMode: "CELEBRATION" })).toBe(
      "CELEBRATION",
    );
  });
});

describe("invitation-app-12: CSV formula injection", () => {
  it("prefixes risky string cells with a single quote", () => {
    const csv = buildCsvWithBom(
      ["a"],
      [["=1+1"], ["+1"], ["-1"], ["@x"], ["\tx"], ["\rx"], ["safe"]],
    );
    const lines = csv.replace("﻿", "").split("\r\n");
    expect(lines.slice(1, 5)).toEqual([`"'=1+1"`, `"'+1"`, `"'-1"`, `"'@x"`]);
    expect(csv).toContain(`"'\tx"`);
    expect(csv).toContain(`"'\rx"`);
    expect(csv).toContain(`"safe"`);
  });
  it("leaves numbers untouched", () => {
    expect(buildCsvWithBom(["n"], [[-5]])).toContain(`"-5"`);
  });
});

describe("invitation-app-19: ICS text escaping", () => {
  it("escapes backslashes before other characters", () => {
    expect(escapeIcsText(String.raw`a\b`)).toBe(String.raw`a\\b`);
  });
  it("escapes newlines, commas and semicolons", () => {
    expect(escapeIcsText("l1\r\nl2\nl3,x;y")).toBe(String.raw`l1\nl2\nl3\,x\;y`);
  });
  it("formats the instant in UTC basic format", () => {
    expect(formatIcsDate("2026-09-18T18:30:00+08:00")).toBe("20260918T103000Z");
  });
});
