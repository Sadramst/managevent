/**
 * Pure Ceremony Builder cost estimator (`WEBSITE.md` §A6.4).
 *
 * Formula: `Σ(service tier price × quantity driver) + venue estimate + staffing + travel zone fee`,
 * shown as a low-to-high range with ±% bands per category.
 * Delegates all GST calculations to `@managevent/payments`.
 */
import { getExperienceMode } from "@managevent/i18n";
import {
  buildDefaultPaymentSchedule,
  divRoundHalfUp,
  splitIncGstCents,
  sumPricedLines,
} from "@managevent/payments";
import type {
  BuilderEstimateCategoryBreakdown,
  BuilderEstimateRequest,
  BuilderEstimateRequestInput,
  BuilderEstimateResponse,
} from "@managevent/types";
import { BuilderEstimateRequestSchema } from "@managevent/validators";
import {
  CURRENT_PRICE_LIST_VERSION,
  EXTRAS_PRICE_INC_GST_CENTS,
  SERVICE_PRICE_RULES,
  TRAVEL_ZONE_FEES_INC_GST_CENTS,
  VENUE_TYPE_ESTIMATE_INC_GST_CENTS,
} from "./price-list.js";

function computeBandRange(
  baseIncGstCents: number,
  bandPercent: number,
): { lowIncGstCents: number; highIncGstCents: number } {
  const delta = divRoundHalfUp(baseIncGstCents * bandPercent, 100);
  return {
    lowIncGstCents: Math.max(0, baseIncGstCents - delta),
    highIncGstCents: baseIncGstCents + delta,
  };
}

function buildBreakdownRow(params: {
  category: string;
  tier?: "ESSENTIAL" | "SIGNATURE" | "LUXE";
  driver: "GUEST" | "TABLE" | "HOUR" | "FIXED";
  quantity: number;
  baseIncGstCents: number;
  bandPercent: number;
}): BuilderEstimateCategoryBreakdown {
  const { lowIncGstCents, highIncGstCents } = computeBandRange(
    params.baseIncGstCents,
    params.bandPercent,
  );
  const lowSplit = splitIncGstCents(lowIncGstCents, "GST");
  const highSplit = splitIncGstCents(highIncGstCents, "GST");

  return {
    category: params.category,
    ...(params.tier ? { tier: params.tier } : {}),
    driver: params.driver,
    quantity: params.quantity,
    baseIncGstCents: params.baseIncGstCents,
    lowIncGstCents,
    highIncGstCents,
    lowExGstCents: lowSplit.amountExGstCents,
    lowGstCents: lowSplit.gstCents,
    highExGstCents: highSplit.amountExGstCents,
    highGstCents: highSplit.gstCents,
  };
}

/**
 * Pure function that computes a reproducible Ceremony Builder estimate (`BuilderEstimateResponse`).
 */
export function calculateBuilderEstimate(
  rawInput: BuilderEstimateRequestInput | BuilderEstimateRequest,
): BuilderEstimateResponse {
  const input = BuilderEstimateRequestSchema.parse(rawInput);
  const experienceMode = getExperienceMode(input.ceremonySlug);
  const totalGuests = input.adults + input.children;
  // Children count as 0.5 equivalent portion for catering/cake, minimum 1
  const cateringEquivalentGuests = Math.max(1, input.adults + Math.ceil(input.children / 2));
  const tableCount = Math.max(1, Math.ceil(totalGuests / 10));

  const breakdown: BuilderEstimateCategoryBreakdown[] = [];
  let hasExplicitVenueService = false;
  let hasExplicitStaffingService = false;

  for (const selection of input.services) {
    const rule = SERVICE_PRICE_RULES[selection.category];
    const unitRate = rule.tiersIncGstCents[selection.tier];

    if (selection.category === "venue") {
      hasExplicitVenueService = true;
    }
    if (selection.category === "staffing") {
      hasExplicitStaffingService = true;
    }

    let quantity = 1;
    if (rule.driver === "GUEST") {
      quantity =
        selection.category === "catering" || selection.category === "cake-sweets"
          ? cateringEquivalentGuests
          : totalGuests;
    } else if (rule.driver === "TABLE") {
      quantity = tableCount;
    } else if (rule.driver === "HOUR") {
      const hours = selection.hours ?? input.durationHours;
      if (selection.category === "staffing") {
        // Waiter count scales with guests (1 staff per 25 guests, min 2) × hours
        const staffCount = Math.max(2, Math.ceil(totalGuests / 25));
        quantity = staffCount * hours;
      } else {
        quantity = hours;
      }
    }

    const baseIncGstCents = unitRate * quantity;
    breakdown.push(
      buildBreakdownRow({
        category: selection.category,
        tier: selection.tier,
        driver: rule.driver,
        quantity,
        baseIncGstCents,
        bandPercent: rule.bandPercent,
      }),
    );
  }

  // Venue estimate if not already included as a service line and visitor doesn't already have one
  const venueEstimateCents = VENUE_TYPE_ESTIMATE_INC_GST_CENTS[input.venueType];
  if (!hasExplicitVenueService && venueEstimateCents > 0) {
    breakdown.push(
      buildBreakdownRow({
        category: "venue-estimate",
        driver: "FIXED",
        quantity: 1,
        baseIncGstCents: venueEstimateCents,
        bandPercent: 15,
      }),
    );
  }

  // Automatic baseline staffing when catering is selected without an explicit staffing line
  const hasCatering = input.services.some((s) => s.category === "catering");
  if (hasCatering && !hasExplicitStaffingService) {
    const staffCount = Math.max(2, Math.ceil(totalGuests / 25));
    const hours = input.durationHours;
    const quantity = staffCount * hours;
    const unitRate = SERVICE_PRICE_RULES.staffing.tiersIncGstCents.ESSENTIAL;
    breakdown.push(
      buildBreakdownRow({
        category: "staffing",
        tier: "ESSENTIAL",
        driver: "HOUR",
        quantity,
        baseIncGstCents: unitRate * quantity,
        bandPercent: SERVICE_PRICE_RULES.staffing.bandPercent,
      }),
    );
  }

  // Extras (in Memorial Mode, celebratory extras like kids-entertainment and wishing-well are excluded per WEBSITE.md §A6.4)
  for (const extra of input.extras) {
    if (
      experienceMode === "MEMORIAL" &&
      (extra === "kids-entertainment" || extra === "wishing-well")
    ) {
      continue;
    }
    const extraCents = EXTRAS_PRICE_INC_GST_CENTS[extra];
    if (extraCents > 0) {
      breakdown.push(
        buildBreakdownRow({
          category: `extra:${extra}`,
          driver: "FIXED",
          quantity: 1,
          baseIncGstCents: extraCents,
          bandPercent: 10,
        }),
      );
    }
  }

  // Travel zone fee
  const travelFeeCents = TRAVEL_ZONE_FEES_INC_GST_CENTS[input.travelZone];
  if (travelFeeCents > 0) {
    breakdown.push(
      buildBreakdownRow({
        category: "travel-zone",
        driver: "FIXED",
        quantity: 1,
        baseIncGstCents: travelFeeCents,
        bandPercent: 0,
      }),
    );
  }

  const lowTotals = sumPricedLines(
    breakdown.map((row) => ({
      taxCode: "GST" as const,
      amountExGstCents: row.lowExGstCents,
      gstCents: row.lowGstCents,
      amountIncGstCents: row.lowIncGstCents,
    })),
  );

  const highTotals = sumPricedLines(
    breakdown.map((row) => ({
      taxCode: "GST" as const,
      amountExGstCents: row.highExGstCents,
      gstCents: row.highGstCents,
      amountIncGstCents: row.highIncGstCents,
    })),
  );

  const midpointIncGstCents = divRoundHalfUp(
    lowTotals.totalIncGstCents + highTotals.totalIncGstCents,
    2,
  );
  const schedule = buildDefaultPaymentSchedule({
    totalIncGstCents: midpointIncGstCents,
    eventStartsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });
  const depositPreviewIncGstCents = schedule[0]?.amountIncGstCents ?? 0;

  const assumptions: string[] = [
    `Based on ${input.adults} adults and ${input.children} children (${tableCount} tables of 10).`,
    "All prices are in AUD and include 10% GST.",
  ];
  if (input.travelZone === "REGIONAL") {
    assumptions.push(
      "Regional WA travel and accommodation are quoted individually after consultation.",
    );
  }

  return {
    priceListVersion: CURRENT_PRICE_LIST_VERSION,
    currency: "AUD",
    experienceMode,
    quoteOnlyRegional: input.travelZone === "REGIONAL",
    lowIncGstCents: lowTotals.totalIncGstCents,
    highIncGstCents: highTotals.totalIncGstCents,
    lowGstCents: lowTotals.gstCents,
    highGstCents: highTotals.gstCents,
    depositPreviewIncGstCents,
    breakdown,
    assumptions,
    disclaimerKey: "builder.estimate.disclaimer",
  };
}
