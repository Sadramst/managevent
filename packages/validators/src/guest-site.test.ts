/**
 * Guest-site contract: one valid and one invalid fixture for every schema that
 * `guest-contract.test.ts` does not already exercise.
 */
import { describe, expect, it } from "vitest";
import {
  CheckInGuestSchema,
  CheckInRosterSchema,
  CheckInScanResultSchema,
  DemoInvitationSchema,
  DemoListSchema,
  GuestCalendarSchema,
  GuestMemberViewSchema,
  GuestPassesViewSchema,
  GuestPassSchema,
  GuestRsvpMemberSchema,
  GuestRsvpPlusOneSchema,
  GuestRsvpResultSchema,
  GuestRsvpSubmitSchema,
  GuestWellViewSchema,
  GuestWishResultSchema,
  GuestWishSchema,
  GuestWishSubmitSchema,
  HostWellEntryListQuerySchema,
  HostWellEntryListSchema,
  HostWellEntrySchema,
  LegacyResolveResultSchema,
  LegacyResolveSchema,
} from "./index.js";

const UUID = "0192b400-0000-7000-8000-000000000001";
const NOW = "2026-11-12T02:30:00.000Z";

const member = {
  guestId: `gst_${UUID}`,
  name: "Jo Smith",
  isChild: false,
  isPlusOne: false,
  status: "YES",
  respondedAt: NOW,
  healthOnFile: true,
};

const party = {
  displayName: "The Smith family",
  maxSeats: 2,
  allowPlusOnes: true,
  childrenAllowed: true,
  tableLabel: "Table 3",
  members: [member],
};

const rsvp = {
  state: "OPEN",
  hasResponded: true,
  lastRespondedAt: NOW,
  seatsRemaining: 1,
  songRequests: ["September"],
  messageToHost: null,
};

const pass = {
  passId: `pass_${UUID}`,
  guestId: `gst_${UUID}`,
  guestName: "Jo Smith",
  isChild: false,
  qr: `MV1.pass_${UUID}.q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6`,
  checkedInAt: null,
};

const checkInGuest = {
  guestId: `gst_${UUID}`,
  name: "Jo Smith",
  isChild: false,
  partyDisplayName: "The Smith family",
  partySize: 2,
  tableLabel: null,
  status: "YES",
  checkedInAt: null,
  severeAllergy: true,
  dietaryFlags: ["NUT_ALLERGY"],
};

describe("@managevent/validators guest-site (views)", () => {
  it("GuestMemberViewSchema carries a flag for health data, never the data", () => {
    expect(GuestMemberViewSchema.safeParse(member).success).toBe(true);
    expect(GuestMemberViewSchema.safeParse({ ...member, guestId: `pty_${UUID}` }).success).toBe(
      false,
    );
    expect(GuestMemberViewSchema.safeParse({ ...member, status: "ATTENDING" }).success).toBe(false);
    const parsed = GuestMemberViewSchema.parse({ ...member, dietary: ["HALAL"], email: "a@b.co" });
    expect(parsed).not.toHaveProperty("dietary");
    expect(parsed).not.toHaveProperty("email");
  });

  it("GuestWellViewSchema is null or a mode with optional display details", () => {
    expect(GuestWellViewSchema.safeParse(null).success).toBe(true);
    expect(
      GuestWellViewSchema.safeParse({
        mode: "WISHING_WELL",
        message: "Your presence is the gift.",
        registryUrl: "https://registry.example/list",
      }).success,
    ).toBe(true);
    expect(GuestWellViewSchema.safeParse({ mode: "TRIBUTE_BOOK" }).success).toBe(true);
    expect(GuestWellViewSchema.safeParse({ mode: "CASH" }).success).toBe(false);
    expect(
      GuestWellViewSchema.safeParse({
        mode: "WISHING_WELL",
        registryUrl: "http://insecure.example",
      }).success,
    ).toBe(false);
  });

  it("GuestWishSchema and GuestWishResultSchema use wel_ ids", () => {
    const wish = {
      id: `wel_${UUID}`,
      authorName: "Sam",
      message: "Congratulations",
      createdAt: NOW,
    };
    expect(GuestWishSchema.safeParse(wish).success).toBe(true);
    expect(GuestWishSchema.safeParse({ ...wish, id: `med_${UUID}` }).success).toBe(false);
    expect(GuestWishSchema.safeParse({ ...wish, createdAt: "yesterday" }).success).toBe(false);

    const result = { id: `wel_${UUID}`, moderation: "PENDING", visibility: "HOSTS_ONLY" };
    expect(GuestWishResultSchema.safeParse(result).success).toBe(true);
    expect(GuestWishResultSchema.safeParse({ ...result, visibility: "PUBLIC" }).success).toBe(
      false,
    );
    expect(GuestWishResultSchema.safeParse({ ...result, moderation: "HIDDEN" }).success).toBe(
      false,
    );
  });

  it("GuestWishSubmitSchema trims and bounds the author and the message", () => {
    expect(
      GuestWishSubmitSchema.parse({ authorName: "  Sam  ", message: " Hi ", shareOnWall: true }),
    ).toEqual({ authorName: "Sam", message: "Hi", shareOnWall: true });
    expect(GuestWishSubmitSchema.safeParse({ authorName: "", message: "Hi" }).success).toBe(false);
    expect(
      GuestWishSubmitSchema.safeParse({ authorName: "x".repeat(81), message: "Hi" }).success,
    ).toBe(false);
    expect(
      GuestWishSubmitSchema.safeParse({ authorName: "Sam", message: "x".repeat(1001) }).success,
    ).toBe(false);
  });

  it("GuestPassSchema and GuestPassesViewSchema describe signed passes", () => {
    expect(GuestPassSchema.safeParse(pass).success).toBe(true);
    expect(GuestPassSchema.safeParse({ ...pass, checkedInAt: NOW }).success).toBe(true);
    expect(GuestPassSchema.safeParse({ ...pass, passId: `gst_${UUID}` }).success).toBe(false);
    expect(GuestPassSchema.safeParse({ ...pass, qr: undefined }).success).toBe(false);

    const view = {
      enabled: true,
      event: {
        title: "Sara & Ali",
        startsAt: "2027-03-20T08:00:00.000Z",
        startsAtLocal: "2027-03-20T16:00",
        timeZone: "Australia/Perth",
        venueName: null,
      },
      themeId: "royal-ivory",
      experienceMode: "CELEBRATION",
      party: { displayName: "The Smith family", tableLabel: null },
      passes: [pass],
    };
    expect(GuestPassesViewSchema.safeParse(view).success).toBe(true);
    expect(GuestPassesViewSchema.safeParse({ ...view, enabled: false, passes: [] }).success).toBe(
      true,
    );
    expect(GuestPassesViewSchema.safeParse({ ...view, themeId: "neon" }).success).toBe(false);
    expect(
      GuestPassesViewSchema.safeParse({
        ...view,
        event: { ...view.event, startsAtLocal: "20/03/2027 4pm" },
      }).success,
    ).toBe(false);
    expect(
      GuestPassesViewSchema.safeParse({
        ...view,
        event: { ...view.event, timeZone: "Mars/Olympus" },
      }).success,
    ).toBe(false);
  });

  it("GuestRsvpResultSchema returns the party, the RSVP block, a snapshot id and passes", () => {
    const result = {
      replayed: false,
      party,
      rsvp,
      headcountSnapshotId: `hc_${UUID}`,
      passes: [pass],
    };
    expect(GuestRsvpResultSchema.safeParse(result).success).toBe(true);
    expect(
      GuestRsvpResultSchema.safeParse({ ...result, headcountSnapshotId: `evt_${UUID}` }).success,
    ).toBe(false);
    expect(GuestRsvpResultSchema.safeParse({ ...result, replayed: "no" }).success).toBe(false);
    expect(
      GuestRsvpResultSchema.safeParse({ ...result, party: { ...party, maxSeats: 0 } }).success,
    ).toBe(false);
    expect(
      GuestRsvpResultSchema.safeParse({ ...result, rsvp: { ...rsvp, seatsRemaining: -1 } }).success,
    ).toBe(false);
  });

  it("GuestCalendarSchema is a filename and the file body", () => {
    expect(
      GuestCalendarSchema.safeParse({ filename: "sara-ali-7kq2.ics", ics: "BEGIN:VCALENDAR\r\n" })
        .success,
    ).toBe(true);
    expect(GuestCalendarSchema.safeParse({ filename: "sara-ali-7kq2.ics" }).success).toBe(false);
  });
});

describe("@managevent/validators guest-site (RSVP input)", () => {
  it("GuestRsvpMemberSchema needs a guest id and a real answer", () => {
    expect(GuestRsvpMemberSchema.safeParse({ guestId: `gst_${UUID}`, status: "NO" }).success).toBe(
      true,
    );
    expect(
      GuestRsvpMemberSchema.safeParse({ guestId: `gst_${UUID}`, status: "PENDING" }).success,
    ).toBe(false);
    expect(GuestRsvpMemberSchema.safeParse({ guestId: "gst_1", status: "YES" }).success).toBe(
      false,
    );
  });

  it("GuestRsvpPlusOneSchema trims the name and defaults to an adult", () => {
    expect(GuestRsvpPlusOneSchema.parse({ name: "  Alex  " })).toEqual({
      name: "Alex",
      isChild: false,
    });
    expect(GuestRsvpPlusOneSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(GuestRsvpPlusOneSchema.safeParse({ name: "x".repeat(121) }).success).toBe(false);
  });

  it("GuestRsvpSubmitSchema bounds members, plus-ones, the message and the consent wording", () => {
    const one = { guestId: `gst_${UUID}`, status: "YES" };
    const many = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        guestId: `gst_0192b400-0000-7000-8000-${String(index).padStart(12, "0")}`,
        status: "YES",
      }));
    expect(GuestRsvpSubmitSchema.safeParse({ members: many(20) }).success).toBe(true);
    expect(GuestRsvpSubmitSchema.safeParse({ members: many(21) }).success).toBe(false);
    expect(
      GuestRsvpSubmitSchema.safeParse({
        members: [one],
        plusOnes: Array.from({ length: 11 }, (_, index) => ({ name: `Guest ${index}` })),
      }).success,
    ).toBe(false);
    expect(
      GuestRsvpSubmitSchema.safeParse({ members: [one], messageToHost: "x".repeat(1001) }).success,
    ).toBe(false);
    expect(GuestRsvpSubmitSchema.safeParse({ members: [one], locale: "fr" }).success).toBe(false);
    // The consent wording shown to the guest is stored, so a token "ok" is not enough.
    expect(
      GuestRsvpSubmitSchema.safeParse({
        members: [{ ...one, health: { dietary: ["VEGAN"] } }],
        healthConsent: { granted: true, textShown: "ok" },
      }).success,
    ).toBe(false);
    expect(
      GuestRsvpSubmitSchema.safeParse({
        members: [{ ...one, health: { dietary: ["VEGAN"] } }],
        healthConsent: { granted: false, textShown: "I agree to share my dietary details." },
      }).success,
    ).toBe(false);
    expect(
      GuestRsvpSubmitSchema.safeParse({
        members: [one],
        contact: { email: "not-an-email", consentGranted: true },
      }).success,
    ).toBe(false);
    expect(
      GuestRsvpSubmitSchema.safeParse({
        members: [one],
        contact: { phone: "12345", consentGranted: true },
      }).success,
    ).toBe(false);
  });
});

describe("@managevent/validators guest-site (public, door and moderation)", () => {
  it("DemoInvitationSchema and DemoListSchema advertise a template with a working link", () => {
    const demo = {
      templateSlug: "royal-classic",
      themeId: "royal-ivory",
      experienceMode: "CELEBRATION",
      title: "Sample wedding",
      hosts: "The Sample family",
      headline: "Sara & Ali",
      eventSlug: "sample-royal-classic-smp2",
      guestToken: "sample-guest-family-7kq2m9xp",
    };
    expect(DemoInvitationSchema.safeParse(demo).success).toBe(true);
    expect(DemoListSchema.safeParse({ items: [demo] }).success).toBe(true);
    expect(DemoListSchema.safeParse({ items: [] }).success).toBe(true);
    expect(DemoInvitationSchema.safeParse({ ...demo, templateSlug: "unknown" }).success).toBe(
      false,
    );
    // The suffix alphabet has no 0, 1, i, l or o.
    expect(
      DemoInvitationSchema.safeParse({ ...demo, guestToken: "sample-guest-family-0o1il000" })
        .success,
    ).toBe(false);
    expect(
      DemoListSchema.safeParse({ items: [{ ...demo, eventSlug: "Sample Slug" }] }).success,
    ).toBe(false);
  });

  it("LegacyResolveSchema bounds the path and the result is a slug and a token", () => {
    expect(
      LegacyResolveSchema.safeParse({ path: "/anniversary/armita-party-g9qtmt" }).success,
    ).toBe(true);
    expect(LegacyResolveSchema.safeParse({ path: "" }).success).toBe(false);
    expect(LegacyResolveSchema.safeParse({ path: `/${"a".repeat(300)}` }).success).toBe(false);
    expect(
      LegacyResolveResultSchema.safeParse({
        eventSlug: "sara-ali-wedding-7kq2",
        guestToken: "armita-party-g9qtmt",
      }).success,
    ).toBe(true);
    expect(
      LegacyResolveResultSchema.safeParse({ eventSlug: "sara-ali-wedding-7kq2", guestToken: "x" })
        .success,
    ).toBe(false);
  });

  it("CheckInGuestSchema and CheckInRosterSchema carry door-safe flags only", () => {
    expect(CheckInGuestSchema.safeParse(checkInGuest).success).toBe(true);
    expect(
      CheckInGuestSchema.safeParse({ ...checkInGuest, dietaryFlags: ["CARNIVORE"] }).success,
    ).toBe(false);
    expect(CheckInGuestSchema.safeParse({ ...checkInGuest, partySize: -1 }).success).toBe(false);
    const parsed = CheckInGuestSchema.parse({ ...checkInGuest, allergyNotes: "Peanuts" });
    expect(parsed).not.toHaveProperty("allergyNotes");

    const roster = {
      event: {
        title: "Sara & Ali",
        startsAt: "2027-03-20T08:00:00.000Z",
        startsAtLocal: "2027-03-20T16:00",
        timeZone: "Australia/Perth",
      },
      totals: { expected: 1, checkedIn: 0 },
      guests: [checkInGuest],
    };
    expect(CheckInRosterSchema.safeParse(roster).success).toBe(true);
    expect(
      CheckInRosterSchema.safeParse({ ...roster, totals: { expected: 1.5, checkedIn: 0 } }).success,
    ).toBe(false);
    expect(CheckInRosterSchema.safeParse({ ...roster, guests: undefined }).success).toBe(false);
  });

  it("CheckInScanResultSchema names one of four outcomes", () => {
    const ok = {
      result: "OK",
      scanEventId: `scn_${UUID}`,
      guest: { ...checkInGuest, checkedInAt: NOW },
      firstCheckedInAt: NOW,
    };
    expect(CheckInScanResultSchema.safeParse(ok).success).toBe(true);
    expect(
      CheckInScanResultSchema.safeParse({ ...ok, result: "WRONG_EVENT", guest: null }).success,
    ).toBe(true);
    expect(CheckInScanResultSchema.safeParse({ ...ok, result: "REVOKED" }).success).toBe(false);
    expect(CheckInScanResultSchema.safeParse({ ...ok, scanEventId: `pass_${UUID}` }).success).toBe(
      false,
    );
  });

  it("HostWellEntrySchema, its list and its query validate moderation values", () => {
    const entry = {
      id: `wel_${UUID}`,
      partyDisplayName: null,
      authorName: "Sam",
      message: "Congratulations",
      visibility: "WALL",
      moderation: "APPROVED",
      createdAt: NOW,
    };
    expect(HostWellEntrySchema.safeParse(entry).success).toBe(true);
    expect(HostWellEntryListSchema.safeParse({ items: [entry] }).success).toBe(true);
    expect(HostWellEntrySchema.safeParse({ ...entry, moderation: "SPAM" }).success).toBe(false);
    expect(HostWellEntryListSchema.safeParse({ items: [{ ...entry, id: "1" }] }).success).toBe(
      false,
    );
    expect(HostWellEntryListQuerySchema.parse({})).toEqual({});
    expect(HostWellEntryListQuerySchema.safeParse({ moderation: "PENDING" }).success).toBe(true);
    expect(HostWellEntryListQuerySchema.safeParse({ moderation: "MAYBE" }).success).toBe(false);
  });
});
