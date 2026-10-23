import { describe, expect, it } from "vitest";
import {
  calculateHeadcountBasis,
  generateLogisticsRecommendations,
  LOGISTICS_RULES_VERSION,
} from "./index.js";

describe("@managevent/logistics", () => {
  it("calculates headcount basis with default and custom maybe/buffer allowances (including zero-guest edge case)", () => {
    const zeroBasis = calculateHeadcountBasis({
      adultsYes: 0,
      childrenYes: 0,
      maybe: 0,
    });
    expect(zeroBasis).toEqual({
      confirmedAdults: 0,
      confirmedChildren: 0,
      maybeAllowance: 0,
      plannerBuffer: 0,
      totalHeadcountBasis: 0,
    });

    // Small group uses minPlannerBufferGuests (default 2)
    const smallBasis = calculateHeadcountBasis({
      adultsYes: 10,
      childrenYes: 0,
      maybe: 3, // ceil(3 * 0.5) = 2 -> subtotal 12 -> 5% is 1, min buffer is 2 -> total 14
    });
    expect(smallBasis.maybeAllowance).toBe(2);
    expect(smallBasis.plannerBuffer).toBe(2);
    expect(smallBasis.totalHeadcountBasis).toBe(14);

    // Custom rates
    const customBasis = calculateHeadcountBasis({
      adultsYes: 100,
      childrenYes: 20,
      maybe: 10,
      maybeAllowanceRate: 0.5,
      plannerBufferRate: 0.1,
      minPlannerBufferGuests: 2,
    });
    expect(customBasis.maybeAllowance).toBe(5);
    expect(customBasis.plannerBuffer).toBe(13); // ceil(125 * 0.1) = 13
    expect(customBasis.totalHeadcountBasis).toBe(138);
  });

  it("generates separate recommendations for every dietary category and allergen without ever merging allergens", () => {
    const now = new Date("2026-11-01T00:00:00.000Z");
    const futureCutOff = new Date("2026-12-01T00:00:00.000Z");
    const pastCutOff = "2026-10-15T00:00:00.000Z";

    const result = generateLogisticsRecommendations({
      adultsYes: 80,
      childrenYes: 12,
      maybe: 4, // +2 maybe -> subtotal 94 -> +5% buffer (5) -> total 99
      dietaryBreakdown: {
        HALAL: 40,
        VEGETARIAN: 12,
        VEGAN: 6,
        GLUTEN_FREE: 5,
        DAIRY_FREE: 4,
        KOSHER: 2,
        NUT_ALLERGY: 3,
        SHELLFISH_ALLERGY: 2,
        OTHER_ALLERGY: 1,
      },
      tableType: "ROUND_10",
      separateKidsTables: true,
      serviceStyle: "PLATED",
      alcoholServed: true,
      cakeProfile: "FULL_SERVE",
      orderLines: [
        {
          logisticsKey: "catering.main",
          currentQty: 80,
          unitPriceIncGstCents: 11_000,
          finalNumbersDueAt: futureCutOff,
        },
        {
          logisticsKey: "cake.serves",
          currentQty: 80,
          unitPriceIncGstCents: 1_500,
          finalNumbersDueAt: pastCutOff,
        },
        {
          logisticsKey: "seating.tables",
          currentQty: 8,
          unitPriceIncGstCents: 5_000,
          finalNumbersDueAt: null,
        },
      ],
      now,
    });

    expect(result.rulesVersion).toBe(LOGISTICS_RULES_VERSION);
    expect(result.headcountBasis.totalHeadcountBasis).toBe(99);

    const byKey = new Map(result.items.map((item) => [item.logisticsKey, item]));

    // Main catering before cut-off
    const mainCat = byKey.get("catering.main");
    expect(mainCat?.recommendedQty).toBe(99);
    expect(mainCat?.deltaIncGstCents).toBe((99 - 80) * 11_000);
    expect(mainCat?.advisoryOnlyAfterCutOff).toBe(false);

    // Cake serves after cut-off -> advisoryOnlyAfterCutOff = true
    const cake = byKey.get("cake.serves");
    expect(cake?.recommendedQty).toBe(99);
    expect(cake?.advisoryOnlyAfterCutOff).toBe(true);
    expect(cake?.reason).toContain("advisory only via planner");

    // Every allergen has its own distinct key and count
    expect(byKey.get("catering.allergen.nut_allergy")?.recommendedQty).toBe(3);
    expect(byKey.get("catering.allergen.shellfish_allergy")?.recommendedQty).toBe(2);
    expect(byKey.get("catering.allergen.other_allergy")?.recommendedQty).toBe(1);

    // Kids' tables (12 children -> ceil(12/8) = 2 tables) and adult tables (99 - 12 = 87 -> ceil(87/10) = 9 tables)
    expect(byKey.get("seating.kids_tables")?.recommendedQty).toBe(2);
    expect(byKey.get("seating.tables")?.recommendedQty).toBe(9);
    expect(byKey.get("seating.chairs")?.recommendedQty).toBe(99);

    // Linen (11 total tables + ceil(11 * 0.1) = 13) and tableware (ceil(99 * 1.05) = 104)
    expect(byKey.get("hire.linen")?.recommendedQty).toBe(13);
    expect(byKey.get("hire.tableware")?.recommendedQty).toBe(104);

    // Waiters (PLATED 1:15 -> ceil(99/15) = 7) and RSA bartenders (ceil(99/50) = 2)
    expect(byKey.get("staffing.waiters")?.recommendedQty).toBe(7);
    expect(byKey.get("staffing.rsa_bartenders")?.recommendedQty).toBe(2);
  });

  it("handles zero-guest and non-alcohol / light-cake / combined-seating configurations", () => {
    const emptyResult = generateLogisticsRecommendations({
      adultsYes: 0,
      childrenYes: 0,
      maybe: 0,
      dietaryBreakdown: {},
      tableType: "ROUND_8",
      separateKidsTables: false,
      serviceStyle: "COCKTAIL",
      alcoholServed: false,
      cakeProfile: "LIGHT_SERVE",
      orderLines: [],
      now: new Date("2026-11-01T00:00:00.000Z"),
      maybeAllowanceRate: 0.5,
      plannerBufferRate: 0.05,
      minPlannerBufferGuests: 2,
      breakageBufferRate: 0.1,
    });

    const byKey = new Map(emptyResult.items.map((item) => [item.logisticsKey, item]));
    expect(byKey.get("seating.tables")?.recommendedQty).toBe(0);
    expect(byKey.get("hire.linen")?.recommendedQty).toBe(0);
    expect(byKey.get("staffing.waiters")?.recommendedQty).toBe(0);
    expect(byKey.has("staffing.rsa_bartenders")).toBe(false);
    expect(byKey.has("seating.kids_tables")).toBe(false);
  });
});
