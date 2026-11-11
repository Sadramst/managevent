import { describe, expect, it } from "vitest";
import {
  buildReminderText,
  formatDateAu,
  getAwaitingParties,
  getChaseCounts,
  getDeadlineStatus,
  getReminderMode,
} from "./rsvp-chase";
import type { EventModel, GuestParty } from "./types";

const perth = "Australia/Perth";
const party = (id: string, status: GuestParty["status"]): GuestParty => ({
  id,
  stableId: `s_${id}`,
  displayName: `Family ${id}`,
  token: `tok_secret_${id}`,
  maxSeats: 2,
  allowPlusOnes: true,
  childrenAllowed: true,
  tags: [],
  status,
  members: [
    { id: `m_${id}`, name: `Hidden${id}`, isPrimary: true, status, allergyNotes: "peanuts" },
  ],
});
const ev = (over: Partial<EventModel> = {}): EventModel =>
  ({
    title: "Anna and Ben Wedding",
    timeZone: perth,
    ceremonySlug: "wedding",
    experienceMode: "CELEBRATION",
    rsvpDeadline: "2026-12-10T00:00:00+08:00",
    parties: [party("a", "PENDING"), party("b", "YES"), party("c", "NO")],
    ...over,
  }) as unknown as EventModel;

describe("awaiting parties", () => {
  it("lists only pending parties and counts", () => {
    expect(getAwaitingParties(ev()).map((p) => p.id)).toEqual(["a"]);
    expect(getChaseCounts(ev())).toEqual({ awaiting: 1, replied: 2, total: 3 });
  });
});

describe("getDeadlineStatus", () => {
  const e = ev();
  it("no deadline", () => {
    expect(getDeadlineStatus(ev({ rsvpDeadline: undefined }), new Date())).toEqual({
      kind: "no-deadline",
    });
  });
  it("open", () => {
    expect(getDeadlineStatus(e, new Date("2026-12-07T04:00:00Z"))).toEqual({
      kind: "open",
      daysRemaining: 3,
    });
  });
  it("due today", () => {
    expect(getDeadlineStatus(e, new Date("2026-12-10T02:00:00Z"))).toEqual({ kind: "due-today" });
  });
  it("closed", () => {
    expect(getDeadlineStatus(e, new Date("2026-12-12T02:00:00Z"))).toEqual({
      kind: "closed",
      daysOverdue: 2,
    });
  });
  it("Perth boundary where UTC date and Perth date differ", () => {
    // 17:00Z on 9 Dec is 01:00 on 10 Dec in Perth: due today although the UTC date is 9 Dec.
    expect(getDeadlineStatus(e, new Date("2026-12-09T17:00:00Z"))).toEqual({ kind: "due-today" });
    // 15:59Z on 9 Dec is 23:59 on 9 Dec in Perth: one day remaining.
    expect(getDeadlineStatus(e, new Date("2026-12-09T15:59:00Z"))).toEqual({
      kind: "open",
      daysRemaining: 1,
    });
    expect(formatDateAu("2026-12-09T17:00:00Z", perth)).toBe("10/12/2026");
  });
});

describe("buildReminderText", () => {
  it("names party, event and date, and leaks nothing", () => {
    const p = party("a", "PENDING");
    const t = buildReminderText(ev(), p, "celebration");
    expect(t).toContain("Family a");
    expect(t).toContain("Anna and Ben Wedding");
    expect(t).toContain("10/12/2026");
    expect(t).not.toContain(p.token);
    expect(t).not.toContain("http");
    expect(t).not.toContain("peanuts");
    expect(t).not.toContain("Hiddena");
  });
  it("omits the date when there is no deadline", () => {
    const t = buildReminderText(
      ev({ rsvpDeadline: undefined }),
      party("a", "PENDING"),
      "celebration",
    );
    expect(t).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
  it("memorial text is calm", () => {
    const e = ev({ ceremonySlug: "memorial-service", title: "Service for Margaret" });
    expect(getReminderMode(e)).toBe("memorial");
    const t = buildReminderText(e, party("a", "PENDING"), "memorial").toLowerCase();
    for (const bad of ["!", "party", "celebrate", "countdown", "days to go"]) {
      expect(t).not.toContain(bad);
    }
  });
});
