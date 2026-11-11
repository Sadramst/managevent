import { describe, expect, it } from "vitest";
import {
  computeAdminPipelineFinancials,
  createAdminLeadRecord,
  maskDietaryHealthSummary,
  revealDietaryHealthSummary,
  transitionLeadStage,
} from "./index.js";

describe("@managevent/admin domain & CRM workflow engine", () => {
  const fixedNow = new Date("2026-05-03T08:00:00.000Z");

  it("creates a celebration lead and derives CELEBRATION experience mode", () => {
    const { lead, audit } = createAdminLeadRecord({
      id: "lead_0196ed58-0001-7000-8000-000000000101",
      fullName: "Olivia & Liam Sterling",
      email: "olivia.sterling@example.com.au",
      ceremonySlug: "weddings",
      ceremonyFamily: "CELEBRATION",
      guestEstimate: 140,
      estimatedQuoteIncGstCents: 4_850_000,
      actorRole: "PLANNER_STAFF",
      now: fixedNow,
    });

    expect(lead.stage).toBe("NEW");
    expect(lead.experienceMode).toBe("CELEBRATION");
    expect(audit.action).toBe("LEAD_CREATED");
    expect(audit.timestampIso).toBe("2026-05-03T08:00:00.000Z");
  });

  it("derives MEMORIAL experience mode for celebration-of-life leads", () => {
    const { lead } = createAdminLeadRecord({
      id: "lead_0196ed58-0005-7000-8000-000000000105",
      fullName: "Margaret Vance Family",
      ceremonySlug: "celebration-of-life",
      ceremonyFamily: "SOLEMN",
      guestEstimate: 95,
      estimatedQuoteIncGstCents: 1_240_000,
      actorRole: "SUPER_ADMIN",
      now: fixedNow,
    });

    expect(lead.experienceMode).toBe("MEMORIAL");
  });

  it("transitions lead stage and logs an immutable audit record", () => {
    const { lead } = createAdminLeadRecord({
      id: "lead_0196ed58-0001-7000-8000-000000000101",
      fullName: "Olivia & Liam Sterling",
      ceremonySlug: "weddings",
      ceremonyFamily: "CELEBRATION",
      guestEstimate: 140,
      estimatedQuoteIncGstCents: 4_850_000,
      actorRole: "PLANNER_STAFF",
      now: fixedNow,
    });

    const { lead: bookedLead, audit } = transitionLeadStage({
      lead,
      nextStage: "BOOKED",
      actorRole: "SUPER_ADMIN",
      now: fixedNow,
    });

    expect(bookedLead.stage).toBe("BOOKED");
    expect(audit.action).toBe("LEAD_STAGE_UPDATED");
    expect(audit.summary).toContain("NEW -> BOOKED");
  });

  it("computes ATO GST split and 12% marketplace commission in integer AUD cents", () => {
    const lead1 = createAdminLeadRecord({
      id: "lead_1",
      fullName: "Host A",
      ceremonySlug: "weddings",
      ceremonyFamily: "CELEBRATION",
      guestEstimate: 100,
      estimatedQuoteIncGstCents: 1_100_000, // $11,000.00 inc GST -> $10,000 ex GST + $1,000 GST
      actorRole: "PLANNER_STAFF",
    }).lead;

    const lead2 = transitionLeadStage({
      lead: createAdminLeadRecord({
        id: "lead_2",
        fullName: "Host B",
        ceremonySlug: "corporate-galas",
        ceremonyFamily: "CORPORATE",
        guestEstimate: 200,
        estimatedQuoteIncGstCents: 2_200_000, // $22,000.00 inc GST
        actorRole: "PLANNER_STAFF",
      }).lead,
      nextStage: "BOOKED",
      actorRole: "PLANNER_STAFF",
    }).lead;

    const lostLead = transitionLeadStage({
      lead: createAdminLeadRecord({
        id: "lead_3",
        fullName: "Host C",
        ceremonySlug: "birthdays",
        ceremonyFamily: "CELEBRATION",
        guestEstimate: 50,
        estimatedQuoteIncGstCents: 990_000,
        actorRole: "PLANNER_STAFF",
      }).lead,
      nextStage: "LOST",
      actorRole: "PLANNER_STAFF",
    }).lead;

    const summary = computeAdminPipelineFinancials([lead1, lead2, lostLead]);
    expect(summary.activeLeadCount).toBe(2);
    expect(summary.bookedLeadCount).toBe(1);
    expect(summary.grossPipelineIncGstCents).toBe(3_300_000);
    expect(summary.gstComponentCents).toBe(300_000);
    expect(summary.netPipelineExGstCents).toBe(3_000_000);
    expect(summary.projectedCommissionIncGstCents).toBe(396_000);
  });

  it("masks sensitive dietary health data by default and audits click-to-reveal", () => {
    expect(maskDietaryHealthSummary()).toContain("APP 3 Sensitive Health Info");

    const { revealedSummary, audit } = revealDietaryHealthSummary({
      eventId: "evt_perth_001",
      rawDietarySummary: "18 Halal · 9 Vegetarian · 4 Gluten-Free · 2 Severe Tree-Nut Anaphylaxis",
      actorRole: "PLANNER_STAFF",
      now: fixedNow,
    });

    expect(revealedSummary).toContain("Severe Tree-Nut Anaphylaxis");
    expect(audit.action).toBe("DIETARY_HEALTH_REVEALED");
    expect(audit.targetId).toBe("evt_perth_001");
  });

  it("rejects non-staff roles from Admin Command Centre operations", () => {
    expect(() =>
      revealDietaryHealthSummary({
        eventId: "evt_perth_001",
        rawDietarySummary: "2 Nut Allergy",
        actorRole: "GUEST",
      }),
    ).toThrow(/not authorised/i);
  });
});
