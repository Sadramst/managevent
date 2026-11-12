/**
 * Foundation tests for the guest-site and guest-list contracts: the cross-field rules that the
 * API relies on. Module owners extend these as they refine the schemas.
 */
import { describe, expect, it } from "vitest";
import {
  CheckInScanResultSchema,
  CheckInScanSchema,
  EmailCampaignCreateSchema,
  GuestImportSchema,
  GuestInvitationViewSchema,
  GuestLinkStatusSchema,
  GuestRsvpHealthSchema,
  GuestRsvpSubmitSchema,
  GuestWishSubmitSchema,
  hasHealthInformation,
  HostGuestInputSchema,
  HostGuestUpdateSchema,
  HostPartyCreateSchema,
  HostPartyListQuerySchema,
  HostPartySchema,
  HostRsvpEntrySchema,
  LeadDetailSchema,
  LeadListQuerySchema,
  LeadUpdateSchema,
  UnsubscribeSchema,
  WellEntryIdSchema,
  WellEntryModerateSchema,
} from "./index.js";

const UUID = "0192b400-0000-7000-8000-000000000001";
const UUID_2 = "0192b400-0000-7000-8000-000000000002";
const NOW = "2026-11-12T02:30:00.000Z";
const CONSENT = {
  granted: true,
  textShown: "I agree to share dietary and allergy details with the hosts and their caterer.",
};

describe("@managevent/validators guest-site", () => {
  it("WellEntryIdSchema requires the wel_ prefix", () => {
    expect(WellEntryIdSchema.safeParse(`wel_${UUID}`).success).toBe(true);
    expect(WellEntryIdSchema.safeParse(`well_${UUID}`).success).toBe(false);
  });

  it("GuestRsvpHealthSchema enforces unique tags, NONE alone, and severity only with an allergy", () => {
    expect(GuestRsvpHealthSchema.safeParse({ dietary: ["HALAL", "NUT_ALLERGY"] }).success).toBe(
      true,
    );
    expect(GuestRsvpHealthSchema.safeParse({ dietary: ["NONE"] }).success).toBe(true);
    expect(GuestRsvpHealthSchema.safeParse({ dietary: ["NONE", "VEGAN"] }).success).toBe(false);
    expect(GuestRsvpHealthSchema.safeParse({ dietary: ["VEGAN", "VEGAN"] }).success).toBe(false);
    expect(
      GuestRsvpHealthSchema.safeParse({ dietary: ["VEGAN"], allergySeverity: "MILD" }).success,
    ).toBe(false);
    expect(
      GuestRsvpHealthSchema.safeParse({
        dietary: ["SHELLFISH_ALLERGY"],
        allergySeverity: "SEVERE_ANAPHYLAXIS",
        allergyNotes: "Carries an adrenaline auto-injector",
      }).success,
    ).toBe(true);
    expect(hasHealthInformation(undefined)).toBe(false);
    expect(hasHealthInformation({ dietary: ["NONE"] })).toBe(false);
    expect(hasHealthInformation({ dietary: [] })).toBe(false);
    expect(hasHealthInformation({ dietary: [], accessibilityNotes: "Step-free access" })).toBe(
      true,
    );
  });

  it("GuestRsvpSubmitSchema requires consent whenever health information is present", () => {
    const base = { members: [{ guestId: `gst_${UUID}`, status: "YES" }] };
    const parsed = GuestRsvpSubmitSchema.parse(base);
    expect(parsed.plusOnes).toEqual([]);
    expect(parsed.songRequests).toEqual([]);
    expect(parsed.locale).toBe("en");

    // NONE is not health information.
    expect(
      GuestRsvpSubmitSchema.safeParse({
        members: [{ guestId: `gst_${UUID}`, status: "YES", health: { dietary: ["NONE"] } }],
      }).success,
    ).toBe(true);

    const withHealth = {
      members: [{ guestId: `gst_${UUID}`, status: "YES", health: { dietary: ["HALAL"] } }],
    };
    const missingConsent = GuestRsvpSubmitSchema.safeParse(withHealth);
    expect(missingConsent.success).toBe(false);
    if (!missingConsent.success) {
      expect(missingConsent.error.issues[0]?.path).toEqual(["healthConsent"]);
    }
    expect(GuestRsvpSubmitSchema.safeParse({ ...withHealth, healthConsent: CONSENT }).success).toBe(
      true,
    );

    // Plus-one health needs consent too.
    expect(
      GuestRsvpSubmitSchema.safeParse({
        ...base,
        plusOnes: [{ name: "Guest of Sara", health: { dietary: [], allergyNotes: "Peanuts" } }],
      }).success,
    ).toBe(false);
  });

  it("GuestRsvpSubmitSchema rejects duplicates, PENDING, too many songs and contact without a channel", () => {
    const member = { guestId: `gst_${UUID}`, status: "YES" };
    expect(GuestRsvpSubmitSchema.safeParse({ members: [] }).success).toBe(false);
    expect(GuestRsvpSubmitSchema.safeParse({ members: [member, member] }).success).toBe(false);
    expect(
      GuestRsvpSubmitSchema.safeParse({ members: [{ ...member, status: "PENDING" }] }).success,
    ).toBe(false);
    expect(
      GuestRsvpSubmitSchema.safeParse({ members: [member], songRequests: ["a", "b", "c", "d"] })
        .success,
    ).toBe(false);
    expect(
      GuestRsvpSubmitSchema.safeParse({ members: [member], contact: { consentGranted: true } })
        .success,
    ).toBe(false);
    expect(
      GuestRsvpSubmitSchema.safeParse({
        members: [member],
        contact: { email: "guest@example.com", consentGranted: false },
      }).success,
    ).toBe(false);
    expect(
      GuestRsvpSubmitSchema.safeParse({
        members: [member, { guestId: `gst_${UUID_2}`, status: "MAYBE" }],
        contact: { phone: "0412 345 678", consentGranted: true },
        messageToHost: "See you there",
      }).success,
    ).toBe(true);
  });

  it("GuestWishSubmitSchema defaults to private and rejects blank messages", () => {
    expect(GuestWishSubmitSchema.parse({ authorName: "Sam", message: "Congratulations" })).toEqual({
      authorName: "Sam",
      message: "Congratulations",
      shareOnWall: false,
    });
    expect(GuestWishSubmitSchema.safeParse({ authorName: "Sam", message: "  " }).success).toBe(
      false,
    );
  });

  it("CheckInScanSchema discriminates on method", () => {
    const common = { deviceId: "door-1", scannedAt: NOW, clientUuid: UUID };
    expect(
      CheckInScanSchema.safeParse({ method: "QR", qr: `MV1.pass_${UUID}.abc`, ...common }).success,
    ).toBe(true);
    expect(
      CheckInScanSchema.safeParse({ method: "MANUAL", guestId: `gst_${UUID}`, ...common }).success,
    ).toBe(true);
    expect(CheckInScanSchema.safeParse({ method: "MANUAL", qr: "x", ...common }).success).toBe(
      false,
    );
    expect(CheckInScanSchema.safeParse({ method: "NFC", ...common }).success).toBe(false);
    expect(
      CheckInScanSchema.safeParse({ method: "QR", qr: "x", ...common, clientUuid: "nope" }).success,
    ).toBe(false);
    expect(
      CheckInScanResultSchema.safeParse({
        result: "INVALID",
        scanEventId: null,
        guest: null,
        firstCheckedInAt: null,
      }).success,
    ).toBe(true);
  });

  it("GuestLinkStatusSchema and WellEntryModerateSchema accept only their literals", () => {
    expect(GuestLinkStatusSchema.safeParse({ state: "ACTIVE" }).success).toBe(true);
    expect(GuestLinkStatusSchema.safeParse({ state: "REVOKED" }).success).toBe(false);
    expect(WellEntryModerateSchema.safeParse({ moderation: "APPROVED" }).success).toBe(true);
    expect(WellEntryModerateSchema.safeParse({ moderation: "PENDING" }).success).toBe(false);
  });

  it("GuestInvitationViewSchema strips anything that is not guest-safe", () => {
    const view = {
      preview: false,
      demo: false,
      event: {
        title: "Sara & Ali",
        ceremonySlug: "wedding",
        experienceMode: "CELEBRATION",
        startsAt: "2027-03-20T08:00:00.000Z",
        endsAt: null,
        startsAtLocal: "2027-03-20T16:00",
        endsAtLocal: null,
        timeZone: "Australia/Perth",
        phase: "UPCOMING",
      },
      invitation: {
        eventSlug: "sara-ali-wedding-7kq2",
        templateSlug: "royal-classic",
        themeId: "royal-ivory",
        gateStyle: "wax-seal",
        allowForwarding: true,
        showBranding: true,
        content: {
          version: 1,
          headline: "Sara & Ali",
          hosts: "The Ahmadi family",
          venue: null,
          coverImageUrl: null,
          music: { url: null, title: null, rightsAttested: false },
        },
        rsvpDeadline: null,
        rsvpDeadlineLocal: null,
        rsvpConfig: {},
        well: null,
      },
      party: {
        displayName: "The Smith family",
        maxSeats: 2,
        allowPlusOnes: false,
        childrenAllowed: true,
        tableLabel: null,
        members: [
          {
            guestId: `gst_${UUID}`,
            name: "Jo Smith",
            isChild: false,
            isPlusOne: false,
            status: "PENDING",
            respondedAt: null,
            healthOnFile: false,
          },
        ],
      },
      rsvp: {
        state: "OPEN",
        hasResponded: false,
        lastRespondedAt: null,
        seatsRemaining: 1,
        songRequests: [],
        messageToHost: null,
      },
      features: { passEnabled: false, wishesEnabled: false },
      wishes: [],
    };
    const parsed = GuestInvitationViewSchema.parse({
      ...view,
      party: { ...view.party, id: `pty_${UUID}`, token: "the-smith-family-7kq2m9xp" },
      invitation: { ...view.invitation, salt: "deadbeef", plan: "FREE" },
    });
    expect(parsed.party).not.toHaveProperty("id");
    expect(parsed.party).not.toHaveProperty("token");
    expect(parsed.invitation).not.toHaveProperty("salt");
    expect(parsed.invitation).not.toHaveProperty("plan");
    expect(
      GuestInvitationViewSchema.safeParse({ ...view, rsvp: { ...view.rsvp, state: "LOCKED" } })
        .success,
    ).toBe(false);
  });
});

describe("@managevent/validators guest-list", () => {
  it("HostPartyCreateSchema applies defaults and bounds seats, tags and guests", () => {
    expect(HostPartyCreateSchema.parse({ displayName: " The Smith family " })).toEqual({
      displayName: "The Smith family",
      allowPlusOnes: false,
      childrenAllowed: true,
      tags: [],
      guests: [],
    });
    expect(HostPartyCreateSchema.safeParse({ displayName: "" }).success).toBe(false);
    expect(HostPartyCreateSchema.safeParse({ displayName: "A", maxSeats: 21 }).success).toBe(false);
    expect(HostPartyCreateSchema.safeParse({ displayName: "A", maxSeats: 0 }).success).toBe(false);
    expect(
      HostPartyCreateSchema.safeParse({
        displayName: "A",
        guests: Array.from({ length: 21 }, () => ({ name: "G" })),
      }).success,
    ).toBe(false);
    expect(
      HostPartyCreateSchema.safeParse({
        displayName: "A",
        tags: Array.from({ length: 11 }, (_, index) => `tag-${index}`),
      }).success,
    ).toBe(false);
  });

  it("HostGuestInputSchema and HostGuestUpdateSchema validate contact details", () => {
    expect(HostGuestInputSchema.parse({ name: "Jo" })).toEqual({ name: "Jo", isChild: false });
    expect(HostGuestInputSchema.safeParse({ name: "Jo", email: "nope" }).success).toBe(false);
    expect(HostGuestInputSchema.safeParse({ name: "Jo", phone: "12345" }).success).toBe(false);
    expect(HostGuestUpdateSchema.parse({ email: null, phone: null })).toEqual({
      email: null,
      phone: null,
    });
    expect(HostGuestUpdateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("HostPartyListQuerySchema coerces the limit from a query string", () => {
    expect(HostPartyListQuerySchema.parse({})).toEqual({ limit: 200 });
    expect(HostPartyListQuerySchema.parse({ limit: "25", status: "PENDING" })).toEqual({
      limit: 25,
      status: "PENDING",
    });
    expect(HostPartyListQuerySchema.safeParse({ limit: "501" }).success).toBe(false);
    expect(HostPartyListQuerySchema.safeParse({ cursor: "pty_1" }).success).toBe(false);
  });

  it("HostPartySchema requires a well-formed token and HostRsvpEntrySchema at least one member", () => {
    const party = {
      id: `pty_${UUID}`,
      displayName: "The Smith family",
      token: "the-smith-family-7kq2m9xp",
      invitePath: "/i/sara-ali-wedding-7kq2/the-smith-family-7kq2m9xp",
      tokenRevokedAt: null,
      maxSeats: 2,
      allowPlusOnes: false,
      childrenAllowed: true,
      tags: [],
      tableLabel: null,
      status: "PENDING",
      respondedAt: null,
      email: { hasAddress: false, inviteSentAt: null, remindersSent: 0 },
      guests: [],
      createdAt: NOW,
    };
    expect(HostPartySchema.safeParse(party).success).toBe(true);
    expect(HostPartySchema.safeParse({ ...party, token: "guest" }).success).toBe(false);
    expect(HostRsvpEntrySchema.safeParse({ members: [] }).success).toBe(false);
    expect(
      HostRsvpEntrySchema.safeParse({ members: [{ guestId: `gst_${UUID}`, status: "PENDING" }] })
        .success,
    ).toBe(true);
  });

  it("GuestImportSchema defaults to a dry run and bounds the file size", () => {
    expect(GuestImportSchema.parse({ csv: "name\nJo" })).toEqual({ csv: "name\nJo", dryRun: true });
    expect(GuestImportSchema.safeParse({ csv: "" }).success).toBe(false);
    expect(GuestImportSchema.safeParse({ csv: "x".repeat(500_001) }).success).toBe(false);
  });

  it("EmailCampaignCreateSchema needs an attestation and a real audience", () => {
    expect(
      EmailCampaignCreateSchema.safeParse({ partyIds: "ALL", consentAttested: true }).success,
    ).toBe(true);
    expect(
      EmailCampaignCreateSchema.safeParse({ partyIds: [`pty_${UUID}`], consentAttested: true })
        .success,
    ).toBe(true);
    expect(
      EmailCampaignCreateSchema.safeParse({ partyIds: [], consentAttested: true }).success,
    ).toBe(false);
    expect(
      EmailCampaignCreateSchema.safeParse({ partyIds: "ALL", consentAttested: false }).success,
    ).toBe(false);
    expect(UnsubscribeSchema.safeParse({ token: "short" }).success).toBe(false);
    expect(UnsubscribeSchema.safeParse({ token: "a".repeat(40) }).success).toBe(true);
  });

  it("lead schemas validate list queries, detail and updates", () => {
    expect(LeadListQuerySchema.parse({})).toEqual({ limit: 50 });
    expect(LeadListQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(LeadUpdateSchema.safeParse({}).success).toBe(false);
    expect(LeadUpdateSchema.safeParse({ notes: null }).success).toBe(true);
    expect(LeadUpdateSchema.safeParse({ stage: "QUALIFIED" }).success).toBe(true);
    expect(LeadUpdateSchema.safeParse({ stage: "WON" }).success).toBe(false);
    expect(LeadUpdateSchema.safeParse({ assignedToUserId: "someone" }).success).toBe(false);

    const lead = {
      id: `lead_${UUID}`,
      stage: "NEW",
      source: "CONTACT_FORM",
      name: "Sara",
      email: "sara@example.com",
      phone: null,
      preferredLanguage: "en",
      preferredChannel: "EMAIL",
      ceremonySlug: null,
      eventDate: null,
      dateFlexible: false,
      guestEstimate: null,
      area: null,
      estimateId: null,
      marketingConsentId: null,
      createdAt: NOW,
      message: null,
      utm: null,
      notes: null,
      assignedToUserId: null,
      eventId: null,
      marketingConsent: false,
      updatedAt: NOW,
    };
    expect(LeadDetailSchema.safeParse(lead).success).toBe(true);
    const { notes: _notes, ...withoutNotes } = lead;
    expect(LeadDetailSchema.safeParse(withoutNotes).success).toBe(false);
  });
});
