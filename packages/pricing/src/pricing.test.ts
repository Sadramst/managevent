import { describe, expect, it } from "vitest";
import { BuilderEstimateResponseSchema } from "@managevent/validators";
import {
  calculateBuilderEstimate,
  CEREMONY_FAMILY_BUILDER_FIXTURES,
  CURRENT_PRICE_LIST_VERSION,
} from "./index.js";

describe("@managevent/pricing", () => {
  describe("Fixtures for every CeremonyFamily (CELEBRATION, CULTURAL, CORPORATE, SOLEMN)", () => {
    it("produces schema-valid, reproducible estimates for all 4 ceremony families", () => {
      for (const [family, fixture] of Object.entries(CEREMONY_FAMILY_BUILDER_FIXTURES)) {
        const estimate = calculateBuilderEstimate(fixture);
        const parsed = BuilderEstimateResponseSchema.safeParse(estimate);
        expect(parsed.success).toBe(true);
        expect(estimate.priceListVersion).toBe(CURRENT_PRICE_LIST_VERSION);
        expect(estimate.currency).toBe("AUD");
        expect(estimate.lowIncGstCents).toBeGreaterThan(0);
        expect(estimate.highIncGstCents).toBeGreaterThanOrEqual(estimate.lowIncGstCents);
        expect(estimate.depositPreviewIncGstCents).toBeGreaterThanOrEqual(50_000);

        if (family === "SOLEMN") {
          expect(estimate.experienceMode).toBe("MEMORIAL");
        } else {
          expect(estimate.experienceMode).toBe("CELEBRATION");
        }
      }
    });
  });

  describe("Quantity drivers, travel zones, and Memorial Mode filtering", () => {
    it("handles GUEST, TABLE, HOUR, FIXED drivers, explicit venue, and REGIONAL travel zone", () => {
      const regionalEstimate = calculateBuilderEstimate({
        ceremonySlug: "wedding",
        adults: 50,
        children: 0,
        venueType: "HAVE_ONE",
        travelZone: "REGIONAL",
        durationHours: 4,
        services: [
          { category: "venue", tier: "ESSENTIAL" },
          { category: "hire", tier: "ESSENTIAL" },
          { category: "florals", tier: "ESSENTIAL" },
          { category: "entertainment", tier: "ESSENTIAL", hours: 4 },
        ],
        extras: ["transport"],
      });

      expect(regionalEstimate.quoteOnlyRegional).toBe(true);
      expect(regionalEstimate.assumptions.some((a) => a.includes("Regional WA travel"))).toBe(true);
      expect(regionalEstimate.breakdown.some((b) => b.category === "venue-estimate")).toBe(false);
    });

    it("strips celebratory extras (kids-entertainment, wishing-well) in Memorial Mode", () => {
      const memorial = calculateBuilderEstimate({
        ceremonySlug: "wake",
        adults: 40,
        children: 0,
        venueType: "HAVE_ONE",
        travelZone: "METRO",
        durationHours: 3,
        services: [{ category: "tribute-display", tier: "ESSENTIAL" }],
        extras: ["kids-entertainment", "wishing-well", "photo-wall"],
      });

      expect(memorial.experienceMode).toBe("MEMORIAL");
      expect(memorial.breakdown.some((b) => b.category === "extra:kids-entertainment")).toBe(false);
      expect(memorial.breakdown.some((b) => b.category === "extra:photo-wall")).toBe(true);
    });
  });
});
