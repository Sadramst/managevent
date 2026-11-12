import { describe, expect, it } from "vitest";
import { utcToZonedWallTime, zonedWallTimeToUtc } from "./time.js";

const iso = (local: string, timeZone: string) => zonedWallTimeToUtc(local, timeZone).toISOString();

describe("lib/time", () => {
  describe("Australia/Perth (UTC+8, no daylight saving)", () => {
    it("converts wall time to UTC and back all year round", () => {
      expect(iso("2027-03-20T16:00", "Australia/Perth")).toBe("2027-03-20T08:00:00.000Z");
      expect(iso("2026-12-25T00:00", "Australia/Perth")).toBe("2026-12-24T16:00:00.000Z");
      expect(iso("2026-07-01T07:59", "Australia/Perth")).toBe("2026-06-30T23:59:00.000Z");
      expect(utcToZonedWallTime(new Date("2027-03-20T08:00:00.000Z"), "Australia/Perth")).toBe(
        "2027-03-20T16:00",
      );
      expect(utcToZonedWallTime(new Date("2026-12-31T16:00:00.000Z"), "Australia/Perth")).toBe(
        "2027-01-01T00:00",
      );
    });

    it("is unaffected on the dates the eastern states change their clocks", () => {
      expect(iso("2026-10-04T02:30", "Australia/Perth")).toBe("2026-10-03T18:30:00.000Z");
      expect(iso("2027-04-04T02:30", "Australia/Perth")).toBe("2027-04-03T18:30:00.000Z");
    });
  });

  describe("Australia/Sydney across daylight saving", () => {
    it("uses AEDT (UTC+11) in summer and AEST (UTC+10) in winter", () => {
      expect(iso("2027-01-15T16:00", "Australia/Sydney")).toBe("2027-01-15T05:00:00.000Z");
      expect(iso("2026-07-15T16:00", "Australia/Sydney")).toBe("2026-07-15T06:00:00.000Z");
    });

    it("handles the start of daylight saving (Sunday 4 October 2026, 02:00 → 03:00)", () => {
      // Last minute of standard time and first minute of daylight time are one minute apart.
      expect(iso("2026-10-04T01:59", "Australia/Sydney")).toBe("2026-10-03T15:59:00.000Z");
      expect(iso("2026-10-04T03:00", "Australia/Sydney")).toBe("2026-10-03T16:00:00.000Z");
      // Later the same day the new offset applies.
      expect(iso("2026-10-04T12:00", "Australia/Sydney")).toBe("2026-10-04T01:00:00.000Z");
      // The day before is still standard time.
      expect(iso("2026-10-03T12:00", "Australia/Sydney")).toBe("2026-10-03T02:00:00.000Z");

      // 02:30 does not exist that night: it is carried past the gap to 03:30 daylight time.
      const skipped = zonedWallTimeToUtc("2026-10-04T02:30", "Australia/Sydney");
      expect(skipped.toISOString()).toBe("2026-10-03T16:30:00.000Z");
      expect(utcToZonedWallTime(skipped, "Australia/Sydney")).toBe("2026-10-04T03:30");
    });

    it("handles the end of daylight saving (Sunday 4 April 2027, 03:00 → 02:00)", () => {
      expect(iso("2027-04-04T01:59", "Australia/Sydney")).toBe("2027-04-03T14:59:00.000Z");
      // 02:30 happens twice: the earlier instant (still daylight time) is chosen.
      expect(iso("2027-04-04T02:30", "Australia/Sydney")).toBe("2027-04-03T15:30:00.000Z");
      // 03:00 exists once, in standard time.
      expect(iso("2027-04-04T03:00", "Australia/Sydney")).toBe("2027-04-03T17:00:00.000Z");
      expect(iso("2027-04-04T12:00", "Australia/Sydney")).toBe("2027-04-04T02:00:00.000Z");

      // Both instants of the repeated hour format to the same wall time.
      expect(utcToZonedWallTime(new Date("2027-04-03T15:30:00.000Z"), "Australia/Sydney")).toBe(
        "2027-04-04T02:30",
      );
      expect(utcToZonedWallTime(new Date("2027-04-03T16:30:00.000Z"), "Australia/Sydney")).toBe(
        "2027-04-04T02:30",
      );
    });

    it("round-trips every hour across both transition weekends", () => {
      for (const start of ["2026-10-02T00:00:00.000Z", "2027-04-02T00:00:00.000Z"]) {
        const startMs = new Date(start).getTime();
        for (let hour = 0; hour < 96; hour += 1) {
          const instant = new Date(startMs + hour * 60 * 60 * 1000);
          const wall = utcToZonedWallTime(instant, "Australia/Sydney");
          const back = zonedWallTimeToUtc(wall, "Australia/Sydney");
          // Exact, except inside the repeated hour where the earlier instant is returned.
          const diffMs = instant.getTime() - back.getTime();
          expect(diffMs === 0 || diffMs === 60 * 60 * 1000).toBe(true);
          expect(utcToZonedWallTime(back, "Australia/Sydney")).toBe(wall);
        }
      }
    });

    it("keeps a Perth and a Sydney event at the same wall time three hours apart in summer, two in winter", () => {
      const summerGap =
        zonedWallTimeToUtc("2027-01-15T16:00", "Australia/Perth").getTime() -
        zonedWallTimeToUtc("2027-01-15T16:00", "Australia/Sydney").getTime();
      const winterGap =
        zonedWallTimeToUtc("2026-07-15T16:00", "Australia/Perth").getTime() -
        zonedWallTimeToUtc("2026-07-15T16:00", "Australia/Sydney").getTime();
      expect(summerGap).toBe(3 * 60 * 60 * 1000);
      expect(winterGap).toBe(2 * 60 * 60 * 1000);
    });
  });

  describe("other zones and bad input", () => {
    it("handles half-hour offsets and UTC", () => {
      expect(iso("2027-01-15T16:00", "Australia/Adelaide")).toBe("2027-01-15T05:30:00.000Z");
      expect(iso("2026-07-15T16:00", "Australia/Darwin")).toBe("2026-07-15T06:30:00.000Z");
      expect(iso("2026-07-15T16:00", "UTC")).toBe("2026-07-15T16:00:00.000Z");
    });

    it("handles midnight and year boundaries", () => {
      expect(iso("2027-01-01T00:00", "Australia/Sydney")).toBe("2026-12-31T13:00:00.000Z");
      expect(utcToZonedWallTime(new Date("2026-12-31T13:00:00.000Z"), "Australia/Sydney")).toBe(
        "2027-01-01T00:00",
      );
    });

    it("rejects malformed wall times, impossible dates and unknown zones", () => {
      expect(() => zonedWallTimeToUtc("2027-03-20T16:00:00", "Australia/Perth")).toThrow(
        RangeError,
      );
      expect(() => zonedWallTimeToUtc("2027-03-20T16:00Z", "Australia/Perth")).toThrow(RangeError);
      expect(() => zonedWallTimeToUtc("2027-02-30T10:00", "Australia/Perth")).toThrow(RangeError);
      expect(() => zonedWallTimeToUtc("2027-03-20T16:00", "Mars/Olympus_Mons")).toThrow(RangeError);
      expect(() => utcToZonedWallTime(new Date("nope"), "Australia/Perth")).toThrow(RangeError);
    });
  });
});
