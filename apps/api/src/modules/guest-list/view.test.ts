import { HostPartySchema } from "@managevent/validators";
import { describe, expect, it } from "vitest";
import { hashEmailAddress } from "../messaging/unsubscribe-token.js";
import { derivePartyStatus, partyMatchesQuery, type PartyViewRow, toHostParty } from "./view.js";

const PARTY_ID = "pty_018f2f6e-7c1a-7b3c-9d2e-1a2b3c4d5e6f";
const GUEST_A = "gst_018f2f6e-7c1a-7b3c-9d2e-1a2b3c4d5e01";
const GUEST_B = "gst_018f2f6e-7c1a-7b3c-9d2e-1a2b3c4d5e02";

function row(overrides: Partial<PartyViewRow> = {}): PartyViewRow {
  return {
    id: PARTY_ID,
    displayName: { en: "Lovelace Family" },
    token: "lovelace-family-k7m2p9qx",
    tokenRevokedAt: null,
    maxSeats: 2,
    allowPlusOnes: false,
    childrenAllowed: true,
    tags: ["family"],
    tableLabel: null,
    createdAt: new Date("2026-11-01T02:00:00.000Z"),
    guests: [
      {
        id: GUEST_A,
        name: { en: "Ada Lovelace" },
        email: "Ada@Example.com",
        phone: null,
        isChild: false,
        isPlusOne: false,
        rsvp: { status: "YES", respondedAt: new Date("2026-11-03T01:00:00.000Z") },
        passes: [{ checkedInAt: new Date("2026-12-20T08:05:00.000Z") }],
      },
      {
        id: GUEST_B,
        name: { en: "Byron Lovelace" },
        email: null,
        phone: null,
        isChild: true,
        isPlusOne: false,
        rsvp: null,
        passes: [],
      },
    ],
    ...overrides,
  };
}

describe("derivePartyStatus", () => {
  it("follows the contract order: YES, then MAYBE, then all NO, else PENDING", () => {
    expect(derivePartyStatus(["NO", "YES", "PENDING"])).toBe("YES");
    expect(derivePartyStatus(["NO", "MAYBE", "PENDING"])).toBe("MAYBE");
    expect(derivePartyStatus(["NO", "NO"])).toBe("NO");
    expect(derivePartyStatus(["NO", "PENDING"])).toBe("PENDING");
    expect(derivePartyStatus([])).toBe("PENDING");
  });
});

describe("toHostParty", () => {
  it("produces a DTO that satisfies HostPartySchema", () => {
    const party = toHostParty(row(), { eventSlug: "test-event-abcd", showLink: true });
    expect(() => HostPartySchema.parse(party)).not.toThrow();
    expect(party).toMatchObject({
      displayName: "Lovelace Family",
      invitePath: "/i/test-event-abcd/lovelace-family-k7m2p9qx",
      status: "YES",
      respondedAt: "2026-11-03T01:00:00.000Z",
      email: { hasAddress: true, inviteSentAt: null, remindersSent: 0 },
    });
    expect(party.guests).toEqual([
      expect.objectContaining({
        name: "Ada Lovelace",
        status: "YES",
        respondedAt: "2026-11-03T01:00:00.000Z",
        checkedInAt: "2026-12-20T08:05:00.000Z",
      }),
      expect.objectContaining({
        name: "Byron Lovelace",
        status: "PENDING",
        respondedAt: null,
        checkedInAt: null,
      }),
    ]);
  });

  it("treats a response the host reset to pending as no response", () => {
    const base = row();
    const reset = row({
      guests: base.guests.map((guest) =>
        guest.rsvp ? { ...guest, rsvp: { ...guest.rsvp, status: "PENDING" as const } } : guest,
      ),
    });
    const party = toHostParty(reset, { eventSlug: "test-event-abcd", showLink: true });
    expect(party.status).toBe("PENDING");
    expect(party.respondedAt).toBeNull();
  });

  it("reports email activity by address hash, whatever the case of the stored address", () => {
    const sentAt = new Date("2026-11-02T03:00:00.000Z");
    const activity = new Map([
      [hashEmailAddress("ada@example.com"), { inviteSentAt: sentAt, remindersSent: 2 }],
    ]);
    const party = toHostParty(row(), {
      eventSlug: "test-event-abcd",
      showLink: true,
      emailActivity: activity,
    });
    expect(party.email).toEqual({
      hasAddress: true,
      inviteSentAt: sentAt.toISOString(),
      remindersSent: 2,
    });

    const noAddress = toHostParty(
      row({ guests: row().guests.map((guest) => ({ ...guest, email: null })) }),
      { eventSlug: "test-event-abcd", showLink: true, emailActivity: activity },
    );
    expect(noAddress.email).toEqual({ hasAddress: false, inviteSentAt: null, remindersSent: 0 });
  });

  it("leaves the guest link out for a caller who may not write to the guest list", () => {
    const party = toHostParty(row(), { eventSlug: "test-event-abcd", showLink: false });
    expect(() => HostPartySchema.parse(party)).not.toThrow();
    expect(party.token).toBeNull();
    expect(party.invitePath).toBeNull();
    // Nothing else in the DTO carries the token either.
    expect(JSON.stringify(party)).not.toContain("k7m2p9qx");
    expect(party.displayName).toBe("Lovelace Family");
  });
});

describe("partyMatchesQuery", () => {
  it("matches the party name, a guest name or a guest email, ignoring case", () => {
    const party = toHostParty(row(), { eventSlug: "test-event-abcd", showLink: true });
    expect(partyMatchesQuery(party, "lovelace fam")).toBe(true);
    expect(partyMatchesQuery(party, "BYRON")).toBe(true);
    expect(partyMatchesQuery(party, "ada@example")).toBe(true);
    expect(partyMatchesQuery(party, "babbage")).toBe(false);
    expect(partyMatchesQuery(party, "   ")).toBe(true);
  });
});
