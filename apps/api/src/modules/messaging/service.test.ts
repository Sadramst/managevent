import { describe, expect, it } from "vitest";
import type { AudienceParty } from "./repo.js";
import { isQuietHour, selectRecipients } from "./service.js";
import { hashEmailAddress } from "./unsubscribe-token.js";

const party = (
  id: string,
  guests: Array<[id: string, email: string | null, status?: "PENDING" | "YES" | "NO" | "MAYBE"]>,
  revoked = false,
): AudienceParty => ({
  id,
  tokenRevokedAt: revoked ? new Date() : null,
  guests: guests.map(([guestId, email, status]) => ({
    id: guestId,
    email,
    status: status ?? "PENDING",
  })),
});

const none = { unsubscribed: new Set<string>(), sentCount: new Map<string, number>() };
const hash = hashEmailAddress;

describe("selectRecipients", () => {
  it("invites every reachable address once per party and explains what it leaves out", () => {
    const audience = selectRecipients(
      "INVITE",
      [
        party("p1", [
          ["g1", "ada@example.com"],
          ["g2", "ADA@example.com"], // same address: one email
          ["g3", "byron@example.com"],
          ["g4", null],
        ]),
        party("p2", [["g5", null]]),
        party("p3", [["g6", "revoked@example.com"]], true),
        party("p4", [["g7", "gone@example.com"]]),
        party("p5", [["g8", "had-it@example.com"]]),
        party("p6", [
          ["g9", "had-it@example.com"],
          ["g10", "new@example.com"],
        ]),
      ],
      {
        unsubscribed: new Set([hash("gone@example.com")]),
        sentCount: new Map([[hash("had-it@example.com"), 1]]),
      },
      { reportNotPending: true },
    );

    expect(audience.kind).toBe("INVITE");
    expect(audience.recipients).toEqual([
      { partyId: "p1", guestId: "g1" },
      { partyId: "p1", guestId: "g3" },
      { partyId: "p6", guestId: "g10" },
    ]);
    expect(audience.skipped).toEqual([
      { partyId: "p2", reason: "NO_EMAIL" },
      { partyId: "p3", reason: "LINK_REVOKED" },
      { partyId: "p4", reason: "UNSUBSCRIBED" },
      { partyId: "p5", reason: "ALREADY_SENT" },
    ]);
  });

  it("invites a party that has already answered (an invitation is not a reminder)", () => {
    const audience = selectRecipients(
      "INVITE",
      [party("p1", [["g1", "ada@example.com", "YES"]])],
      none,
      { reportNotPending: true },
    );
    expect(audience.recipients).toEqual([{ partyId: "p1", guestId: "g1" }]);
  });

  it("reminds only parties with a pending guest, at most twice per address", () => {
    const parties = [
      party("p1", [
        ["g1", "contact@example.com", "YES"],
        ["g2", null, "PENDING"],
      ]),
      party("p2", [["g3", "answered@example.com", "NO"]]),
      party("p3", [["g4", "twice@example.com", "PENDING"]]),
      party("p4", [["g5", "once@example.com", "PENDING"]]),
      party("p5", [["g6", "revoked@example.com", "PENDING"]], true),
      party("p6", [["g7", null, "PENDING"]]),
    ];
    const facts = {
      unsubscribed: new Set<string>(),
      sentCount: new Map([
        [hash("twice@example.com"), 2],
        [hash("once@example.com"), 1],
      ]),
    };

    const explicit = selectRecipients("REMINDER", parties, facts, { reportNotPending: true });
    // The party's contact is reminded even though they answered for themselves.
    expect(explicit.recipients).toEqual([
      { partyId: "p1", guestId: "g1" },
      { partyId: "p4", guestId: "g5" },
    ]);
    expect(explicit.skipped).toEqual([
      { partyId: "p2", reason: "NOT_PENDING" },
      { partyId: "p3", reason: "REMINDER_LIMIT" },
      { partyId: "p5", reason: "LINK_REVOKED" },
      { partyId: "p6", reason: "NO_EMAIL" },
    ]);

    // "ALL" means all pending parties, so an answered party is simply not part of the audience.
    const all = selectRecipients("REMINDER", parties, facts, { reportNotPending: false });
    expect(all.skipped.map((entry) => entry.partyId)).toEqual(["p3", "p5", "p6"]);
  });
});

describe("isQuietHour", () => {
  it("allows 08:00 to 19:59 on the event's wall clock", () => {
    // Perth is UTC+8 all year.
    expect(isQuietHour(new Date("2026-11-10T23:59:00.000Z"), "Australia/Perth")).toBe(true); // 07:59
    expect(isQuietHour(new Date("2026-11-11T00:00:00.000Z"), "Australia/Perth")).toBe(false); // 08:00
    expect(isQuietHour(new Date("2026-11-11T11:59:00.000Z"), "Australia/Perth")).toBe(false); // 19:59
    expect(isQuietHour(new Date("2026-11-11T12:00:00.000Z"), "Australia/Perth")).toBe(true); // 20:00
    // The same instant is mid-evening in Perth but mid-morning in London.
    const instant = new Date("2026-11-11T13:00:00.000Z");
    expect(isQuietHour(instant, "Australia/Perth")).toBe(true);
    expect(isQuietHour(instant, "Europe/London")).toBe(false);
  });
});
