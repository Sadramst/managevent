/**
 * Valid and invalid fixtures for the guest-list response schemas (the request schemas are covered
 * in `guest-contract.test.ts`). The API's own tests parse every real response with these schemas.
 */
import { describe, expect, it } from "vitest";
import {
  DietaryMatrixSchema,
  EmailCampaignResultSchema,
  GuestImportResultSchema,
  HostGuestSchema,
  HostPartyListSchema,
  HostPartyUpdateSchema,
  LeadListSchema,
  MessagingStatusSchema,
  ResponsesSummarySchema,
  UnsubscribeResultSchema,
} from "./index.js";

const UUID = "0192b400-0000-7000-8000-000000000001";
const NOW = "2026-11-12T02:30:00.000Z";

const counts = {
  HALAL: 1,
  VEGETARIAN: 0,
  VEGAN: 2,
  GLUTEN_FREE: 0,
  DAIRY_FREE: 0,
  KOSHER: 0,
  NUT_ALLERGY: 1,
  SHELLFISH_ALLERGY: 0,
  OTHER_ALLERGY: 0,
};

const guest = {
  id: `gst_${UUID}`,
  name: "Jo Smith",
  email: null,
  phone: null,
  isChild: false,
  isPlusOne: false,
  status: "YES",
  respondedAt: NOW,
  checkedInAt: null,
};

const party = {
  id: `pty_${UUID}`,
  displayName: "The Smith family",
  token: "the-smith-family-7kq2m9xp",
  invitePath: "/i/sara-ali-wedding-7kq2/the-smith-family-7kq2m9xp",
  tokenRevokedAt: null,
  maxSeats: 2,
  allowPlusOnes: false,
  childrenAllowed: true,
  tags: ["family"],
  tableLabel: "Table 3",
  status: "YES",
  respondedAt: NOW,
  email: { hasAddress: true, inviteSentAt: NOW, remindersSent: 1 },
  guests: [guest],
  createdAt: NOW,
};

describe("@managevent/validators guest-list responses", () => {
  it("HostGuestSchema needs a guest id and a known status", () => {
    expect(HostGuestSchema.safeParse(guest).success).toBe(true);
    expect(HostGuestSchema.safeParse({ ...guest, id: "gst_1" }).success).toBe(false);
    expect(HostGuestSchema.safeParse({ ...guest, status: "ATTENDING" }).success).toBe(false);
    expect(HostGuestSchema.safeParse({ ...guest, respondedAt: "yesterday" }).success).toBe(false);
  });

  it("HostPartyUpdateSchema is a partial update with the same bounds as a create", () => {
    expect(HostPartyUpdateSchema.parse({})).toEqual({});
    expect(HostPartyUpdateSchema.parse({ displayName: " Renamed ", tableLabel: null })).toEqual({
      displayName: "Renamed",
      tableLabel: null,
    });
    expect(HostPartyUpdateSchema.safeParse({ displayName: "" }).success).toBe(false);
    expect(HostPartyUpdateSchema.safeParse({ maxSeats: 21 }).success).toBe(false);
    expect(HostPartyUpdateSchema.safeParse({ tableLabel: "x".repeat(61) }).success).toBe(false);
  });

  it("HostPartyListSchema carries a page, a cursor and event totals", () => {
    const list = { items: [party], nextCursor: null, totals: { parties: 1, guests: 1 } };
    expect(HostPartyListSchema.safeParse(list).success).toBe(true);
    expect(HostPartyListSchema.safeParse({ ...list, nextCursor: party.id }).success).toBe(true);
    expect(HostPartyListSchema.safeParse({ ...list, nextCursor: "next" }).success).toBe(false);
    expect(
      HostPartyListSchema.safeParse({ ...list, totals: { parties: -1, guests: 0 } }).success,
    ).toBe(false);
    expect(HostPartyListSchema.safeParse({ items: [party], nextCursor: null }).success).toBe(false);
  });

  it("GuestImportResultSchema reports rows by number with a known error code", () => {
    const result = {
      dryRun: true,
      parties: [
        {
          displayName: "The Smith family",
          maxSeats: 2,
          tableLabel: null,
          tags: [],
          guests: [{ name: "Jo Smith", isChild: false, email: null, phone: null }],
        },
      ],
      createdPartyIds: [],
      summary: { partyCount: 1, guestCount: 1, skippedRows: 1 },
      errors: [{ row: 3, code: "MISSING_NAME", message: "This row has no guest name." }],
      plan: { limit: 30, current: 0, afterImport: 1, exceeds: false },
    };
    expect(GuestImportResultSchema.safeParse(result).success).toBe(true);
    expect(
      GuestImportResultSchema.safeParse({ ...result, plan: { ...result.plan, limit: null } })
        .success,
    ).toBe(true);
    expect(
      GuestImportResultSchema.safeParse({
        ...result,
        errors: [{ row: 0, code: "MISSING_NAME", message: "x" }],
      }).success,
    ).toBe(false);
    expect(
      GuestImportResultSchema.safeParse({
        ...result,
        errors: [{ row: 3, code: "BAD_ROW", message: "x" }],
      }).success,
    ).toBe(false);
    expect(
      GuestImportResultSchema.safeParse({ ...result, createdPartyIds: ["party-1"] }).success,
    ).toBe(false);
  });

  it("ResponsesSummarySchema holds strict dietary counts and at most ten recent responses", () => {
    const summary = {
      totals: {
        parties: 2,
        partiesResponded: 1,
        guests: 3,
        adultsYes: 1,
        childrenYes: 1,
        maybe: 0,
        no: 0,
        pending: 1,
        checkedIn: 0,
      },
      dietaryCounts: counts,
      severeAllergyCount: 1,
      songRequests: [{ partyDisplayName: "The Smith family", song: "Dancing Queen" }],
      messages: [
        { partyDisplayName: "The Smith family", message: "See you there", respondedAt: NOW },
      ],
      recent: [{ partyDisplayName: "The Smith family", status: "YES", respondedAt: NOW }],
      deadline: {
        rsvpDeadline: NOW,
        rsvpDeadlineLocal: "2026-11-12T10:30",
        state: "OPEN",
        days: 3,
      },
      latestHeadcount: { id: `hc_${UUID}`, takenAt: NOW, trigger: "HOST_EDIT" },
      linkedOrder: false,
    };
    expect(ResponsesSummarySchema.safeParse(summary).success).toBe(true);
    expect(
      ResponsesSummarySchema.safeParse({
        ...summary,
        latestHeadcount: null,
        deadline: { rsvpDeadline: null, rsvpDeadlineLocal: null, state: "NONE", days: null },
      }).success,
    ).toBe(true);
    // Counts only: a name or an unknown tag is rejected.
    expect(
      ResponsesSummarySchema.safeParse({ ...summary, dietaryCounts: { ...counts, NONE: 4 } })
        .success,
    ).toBe(false);
    expect(
      ResponsesSummarySchema.safeParse({
        ...summary,
        recent: Array.from({ length: 11 }, () => summary.recent[0]),
      }).success,
    ).toBe(false);
    expect(
      ResponsesSummarySchema.safeParse({
        ...summary,
        deadline: { ...summary.deadline, state: "LATE" },
      }).success,
    ).toBe(false);
    expect(
      ResponsesSummarySchema.safeParse({
        ...summary,
        latestHeadcount: { ...summary.latestHeadcount, trigger: "MANUAL" },
      }).success,
    ).toBe(false);
  });

  it("DietaryMatrixSchema lists known tags and severities per guest and per table", () => {
    const matrix = {
      rows: [
        {
          guestId: `gst_${UUID}`,
          guestName: "Jo Smith",
          partyDisplayName: "The Smith family",
          tableLabel: null,
          isChild: false,
          dietary: ["VEGAN", "NUT_ALLERGY"],
          allergySeverity: "SEVERE_ANAPHYLAXIS",
          allergyNotes: "Carries an adrenaline pen",
          accessibilityNotes: null,
        },
      ],
      counts,
      byTable: [{ tableLabel: null, counts, severe: 1 }],
    };
    expect(DietaryMatrixSchema.safeParse(matrix).success).toBe(true);
    expect(
      DietaryMatrixSchema.safeParse({
        ...matrix,
        rows: [{ ...matrix.rows[0], dietary: ["PALEO"] }],
      }).success,
    ).toBe(false);
    expect(
      DietaryMatrixSchema.safeParse({
        ...matrix,
        rows: [{ ...matrix.rows[0], allergySeverity: "DEADLY" }],
      }).success,
    ).toBe(false);
    expect(
      DietaryMatrixSchema.safeParse({
        ...matrix,
        byTable: [{ tableLabel: null, counts, severe: -1 }],
      }).success,
    ).toBe(false);
  });

  it("EmailCampaignResultSchema explains every skipped party with a known reason", () => {
    const result = {
      campaignId: `cmp_${UUID}`,
      queued: 3,
      skipped: [{ partyId: `pty_${UUID}`, reason: "NO_EMAIL" }],
    };
    expect(EmailCampaignResultSchema.safeParse(result).success).toBe(true);
    expect(EmailCampaignResultSchema.safeParse({ ...result, campaignId: "cmp_1" }).success).toBe(
      false,
    );
    expect(
      EmailCampaignResultSchema.safeParse({
        ...result,
        skipped: [{ partyId: `pty_${UUID}`, reason: "BOUNCED" }],
      }).success,
    ).toBe(false);
    expect(EmailCampaignResultSchema.safeParse({ ...result, queued: -1 }).success).toBe(false);
  });

  it("MessagingStatusSchema reports configuration, quota and campaign results", () => {
    const status = {
      emailConfigured: false,
      remindersEntitled: false,
      quota: { limit: 50, used: 12 },
      campaigns: [
        {
          id: `cmp_${UUID}`,
          kind: "INVITE",
          status: "PARTIAL",
          createdAt: NOW,
          counts: { total: 3, sent: 1, failed: 1, skipped: 1 },
        },
      ],
    };
    expect(MessagingStatusSchema.safeParse(status).success).toBe(true);
    expect(
      MessagingStatusSchema.safeParse({ ...status, quota: { limit: null, used: 0 }, campaigns: [] })
        .success,
    ).toBe(true);
    expect(
      MessagingStatusSchema.safeParse({
        ...status,
        campaigns: [{ ...status.campaigns[0], kind: "SMS" }],
      }).success,
    ).toBe(false);
    expect(
      MessagingStatusSchema.safeParse({
        ...status,
        campaigns: [{ ...status.campaigns[0], status: "DONE" }],
      }).success,
    ).toBe(false);
    expect(MessagingStatusSchema.safeParse({ ...status, emailConfigured: "no" }).success).toBe(
      false,
    );
  });

  it("UnsubscribeResultSchema and LeadListSchema accept only their shapes", () => {
    expect(UnsubscribeResultSchema.safeParse({ ok: true }).success).toBe(true);
    expect(UnsubscribeResultSchema.safeParse({ ok: false }).success).toBe(false);

    expect(LeadListSchema.safeParse({ items: [], nextCursor: null }).success).toBe(true);
    expect(LeadListSchema.safeParse({ items: [], nextCursor: `lead_${UUID}` }).success).toBe(true);
    expect(LeadListSchema.safeParse({ items: [] }).success).toBe(false);
    expect(LeadListSchema.safeParse({ items: [{ id: "lead_1" }], nextCursor: null }).success).toBe(
      false,
    );
  });
});
