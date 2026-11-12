import { invitationStudioEn } from "@managevent/i18n";
import { describe, expect, it } from "vitest";
import { formatLocalDate, formatLocalDateTime, formatLocalTime } from "@/lib/dates";
import {
  fill,
  formatDateInput,
  formatDateTimeInputs,
  formatTimeInput,
  isRealDate,
  isTime,
  todayIso,
} from "./local-date";

const names = invitationStudioEn.catalog.dateNames;

describe("browser-side date formatting", () => {
  it("matches the server formatter for every month, weekday and hour", () => {
    const samples: [string, string][] = [];
    for (let month = 1; month <= 12; month += 1) {
      for (const day of [1, 9, 17, 28]) {
        const date = `2027-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const hours = String((month * day) % 24).padStart(2, "0");
        const minutes = String((day * 7) % 60).padStart(2, "0");
        samples.push([date, `${hours}:${minutes}`]);
      }
    }
    samples.push(["2028-02-29", "00:00"], ["2026-12-31", "12:00"], ["2027-01-01", "23:59"]);
    for (const [date, time] of samples) {
      const local = `${date}T${time}`;
      expect(formatDateTimeInputs(date, time, names)).toBe(formatLocalDateTime(local));
      expect(formatDateInput(date, names)).toBe(formatLocalDate(local, { weekday: true }));
      expect(formatTimeInput(time)).toBe(formatLocalTime(local));
    }
  });

  it("shows the date alone until a time is chosen, and nothing without a real date", () => {
    expect(formatDateTimeInputs("2027-03-20", "", names)).toBe("Saturday, 20 March 2027");
    expect(formatDateTimeInputs("", "16:30", names)).toBe("");
    expect(formatDateTimeInputs("2027-02-31", "16:30", names)).toBe("");
  });

  it("recognises real calendar days and HH:mm times only", () => {
    expect(isRealDate("2028-02-29")).toBe(true);
    expect(isRealDate("2027-02-29")).toBe(false);
    expect(isRealDate("2027-13-01")).toBe(false);
    expect(isRealDate("20/03/2027")).toBe(false);
    expect(isTime("23:59")).toBe(true);
    expect(isTime("24:00")).toBe(false);
    expect(isTime("9:00")).toBe(false);
  });

  it("gives today in the local zone as YYYY-MM-DD", () => {
    expect(todayIso(new Date(2027, 0, 5, 23, 30))).toBe("2027-01-05");
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    expect(fill("{count} of {limit} guests", { count: 4, limit: 30 })).toBe("4 of 30 guests");
    expect(fill("Hello {name}", {})).toBe("Hello {name}");
  });
});
