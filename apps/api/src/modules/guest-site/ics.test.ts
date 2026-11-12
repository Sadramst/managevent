import { describe, expect, it } from "vitest";
import { buildInvitationIcs, escapeIcsText, foldIcsLine, formatIcsDate } from "./ics.js";

const octets = (line: string) => Buffer.byteLength(line, "utf8");

/** Reverses RFC 5545 folding: a CRLF followed by one space joins two physical lines. */
const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("guest-site/ics", () => {
  it("escapes backslashes first, then newlines, commas and semicolons", () => {
    expect(escapeIcsText("a\\b")).toBe("a\\\\b");
    expect(escapeIcsText("Hall, Perth; WA")).toBe("Hall\\, Perth\\; WA");
    expect(escapeIcsText("one\r\ntwo\nthree\rfour")).toBe("one\\ntwo\\nthree\\nfour");
    // A literal backslash-n in the input must not become a line break.
    expect(escapeIcsText("C:\\new")).toBe("C:\\\\new");
  });

  it("formats instants as UTC basic date-times", () => {
    expect(formatIcsDate(new Date("2027-03-06T08:30:00.000Z"))).toBe("20270306T083000Z");
    // 16:00 in Perth (UTC+8) is 08:00 UTC.
    expect(formatIcsDate("2027-03-06T16:00:00+08:00")).toBe("20270306T080000Z");
  });

  it("leaves a line of exactly 75 octets alone and folds a longer one", () => {
    const exact = `SUMMARY:${"a".repeat(67)}`;
    expect(octets(exact)).toBe(75);
    expect(foldIcsLine(exact)).toBe(exact);

    const long = `SUMMARY:${"a".repeat(200)}`;
    const folded = foldIcsLine(long);
    const physical = folded.split("\r\n");
    expect(physical.length).toBe(3);
    expect(octets(physical[0] ?? "")).toBe(75);
    for (const line of physical.slice(1)) {
      expect(line.startsWith(" ")).toBe(true);
      expect(octets(line)).toBeLessThanOrEqual(75);
    }
    expect(unfold(folded)).toBe(long);
  });

  it("folds on octets, not characters, and never splits a multi-byte character", () => {
    // Each character is 3 octets in UTF-8, the emoji 4 (a surrogate pair in UTF-16).
    const long = `DESCRIPTION:${"日本語のテキスト".repeat(12)}🎉${"é".repeat(40)}`;
    const folded = foldIcsLine(long);
    for (const line of folded.split("\r\n")) {
      expect(octets(line)).toBeLessThanOrEqual(75);
      // A split character would decode to U+FFFD after a round trip.
      expect(Buffer.from(line, "utf8").toString("utf8")).toBe(line);
      expect(line).not.toContain("\uFFFD");
    }
    expect(unfold(folded)).toBe(long);
  });

  it("builds one VEVENT in UTC with CRLF line endings and a five-hour default length", () => {
    const ics = buildInvitationIcs({
      uid: "evt_1-pty_1@managevent.com.au",
      stamp: new Date("2026-11-12T01:02:03.000Z"),
      startsAt: new Date("2027-03-06T08:00:00.000Z"),
      endsAt: null,
      summary: "Sara & Ali; the wedding, at last",
      description: "Line one\nLine two\n\nhttps://invitation.example/i/slug-abcd/token-abcdefgh",
      location: "The Old Hall, 1 Test Street, Perth WA",
      url: "https://invitation.example/i/slug-abcd/token-abcdefgh",
    });

    expect(ics.endsWith("\r\n")).toBe(true);
    // No bare LF or CR anywhere.
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    for (const line of ics.split("\r\n")) expect(octets(line)).toBeLessThanOrEqual(75);

    const lines = unfold(ics).split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
    expect(lines).toContain("UID:evt_1-pty_1@managevent.com.au");
    expect(lines).toContain("DTSTAMP:20261112T010203Z");
    expect(lines).toContain("DTSTART:20270306T080000Z");
    expect(lines).toContain("DTEND:20270306T130000Z");
    expect(lines).toContain("SUMMARY:Sara & Ali\\; the wedding\\, at last");
    expect(lines).toContain(
      "DESCRIPTION:Line one\\nLine two\\n\\nhttps://invitation.example/i/slug-abcd/token-abcdefgh",
    );
    expect(lines).toContain("LOCATION:The Old Hall\\, 1 Test Street\\, Perth WA");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
  });

  it("uses the given end time, ignores one that is not after the start, and omits an empty location", () => {
    const base = {
      uid: "u@managevent.com.au",
      stamp: new Date("2026-11-12T00:00:00.000Z"),
      startsAt: new Date("2027-03-06T08:00:00.000Z"),
      summary: "Event",
      description: "Details",
      location: null,
      url: "https://invitation.example/i/a-bcde/b-cdefghjk",
    };
    const withEnd = buildInvitationIcs({ ...base, endsAt: new Date("2027-03-06T10:30:00.000Z") });
    expect(withEnd).toContain("DTEND:20270306T103000Z");
    expect(withEnd).not.toContain("LOCATION");

    const badEnd = buildInvitationIcs({ ...base, endsAt: new Date("2027-03-06T07:00:00.000Z") });
    expect(badEnd).toContain("DTEND:20270306T130000Z");
  });
});
