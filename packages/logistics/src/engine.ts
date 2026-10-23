/**
 * Pure RSVP headcount -> logistics recommendation engine (`ARCHITECTURE.md` §6).
 *
 * Rules:
 * - Headcount basis = confirmedAdults + confirmedChildren + maybeAllowance (50% default) + plannerBuffer (5% default, min 2).
 * - Catering portions per dietary category, with a separate count for each allergen (`NUT_ALLERGY`, `SHELLFISH_ALLERGY`, `OTHER_ALLERGY`) that is NEVER merged into "other".
 * - Cake serves by ceremony style (full 1.0 serve for weddings/milestones, 0.75 for cocktail/solemn).
 * - Seating tables by table type (`ROUND_10`, `ROUND_8`, `BANQUET_12`) with optional separate kids' tables.
 * - Hire chairs, linen, and tableware with breakage buffer (5% default).
 * - Staffing waiters by service style (`PLATED`, `BANQUET`, `BUFFET`, `COCKTAIL`) plus WA RSA-certified staff when alcohol is served.
 * - Cut-off enforcement (`finalNumbersDueAt`): recommendations after cut-off are marked `advisoryOnlyAfterCutOff: true`.
 */
import type { DietaryTag, OrderLineUnit, RecommendationItem } from "@managevent/types";

export const LOGISTICS_RULES_VERSION = "1.0.0" as const;

export type TableType = "ROUND_10" | "ROUND_8" | "BANQUET_12";
export type ServiceStyle = "PLATED" | "BANQUET" | "BUFFET" | "COCKTAIL";
export type CakeServeProfile = "FULL_SERVE" | "LIGHT_SERVE";

export type DietaryBreakdownMap = Partial<Record<Exclude<DietaryTag, "NONE">, number>>;

export interface LogisticsOrderLineSnapshot {
  logisticsKey: string;
  currentQty: number;
  unitPriceIncGstCents: number;
  finalNumbersDueAt?: Date | string | null;
}

export interface LogisticsEngineInput {
  adultsYes: number;
  childrenYes: number;
  maybe: number;
  dietaryBreakdown: DietaryBreakdownMap;
  tableType: TableType;
  separateKidsTables: boolean;
  serviceStyle: ServiceStyle;
  alcoholServed: boolean;
  cakeProfile: CakeServeProfile;
  orderLines: readonly LogisticsOrderLineSnapshot[];
  now: Date;
  maybeAllowanceRate?: number;
  plannerBufferRate?: number;
  minPlannerBufferGuests?: number;
  breakageBufferRate?: number;
}

export interface HeadcountBasisSummary {
  confirmedAdults: number;
  confirmedChildren: number;
  maybeAllowance: number;
  plannerBuffer: number;
  totalHeadcountBasis: number;
}

export interface LogisticsRecommendationResult {
  rulesVersion: typeof LOGISTICS_RULES_VERSION;
  headcountBasis: HeadcountBasisSummary;
  items: RecommendationItem[];
}

const TABLE_CAPACITY: Readonly<Record<TableType, number>> = {
  ROUND_10: 10,
  ROUND_8: 8,
  BANQUET_12: 12,
};

const WAITER_GUEST_RATIO: Readonly<Record<ServiceStyle, number>> = {
  PLATED: 15,
  BANQUET: 20,
  BUFFET: 25,
  COCKTAIL: 30,
};

const DIETARY_KEYS: ReadonlyArray<{
  tag: Exclude<DietaryTag, "NONE" | "NUT_ALLERGY" | "SHELLFISH_ALLERGY" | "OTHER_ALLERGY">;
  logisticsKey: string;
  label: string;
}> = [
  { tag: "HALAL", logisticsKey: "catering.dietary.halal", label: "Halal portions" },
  {
    tag: "VEGETARIAN",
    logisticsKey: "catering.dietary.vegetarian",
    label: "Vegetarian portions",
  },
  { tag: "VEGAN", logisticsKey: "catering.dietary.vegan", label: "Vegan portions" },
  {
    tag: "GLUTEN_FREE",
    logisticsKey: "catering.dietary.gluten_free",
    label: "Gluten-free portions",
  },
  {
    tag: "DAIRY_FREE",
    logisticsKey: "catering.dietary.dairy_free",
    label: "Dairy-free portions",
  },
  { tag: "KOSHER", logisticsKey: "catering.dietary.kosher", label: "Kosher portions" },
];

/**
 * Allergens are tracked individually and NEVER merged into a generic "other" bucket (`ARCHITECTURE.md` §6).
 */
const ALLERGEN_KEYS: ReadonlyArray<{
  tag: Extract<DietaryTag, "NUT_ALLERGY" | "SHELLFISH_ALLERGY" | "OTHER_ALLERGY">;
  logisticsKey: string;
  label: string;
}> = [
  {
    tag: "NUT_ALLERGY",
    logisticsKey: "catering.allergen.nut_allergy",
    label: "Strict nut-allergy portions (isolated prep)",
  },
  {
    tag: "SHELLFISH_ALLERGY",
    logisticsKey: "catering.allergen.shellfish_allergy",
    label: "Strict shellfish-allergy portions (isolated prep)",
  },
  {
    tag: "OTHER_ALLERGY",
    logisticsKey: "catering.allergen.other_allergy",
    label: "Specific declared-allergy portions (isolated prep)",
  },
];

/**
 * Computes the headcount basis from confirmed adults, confirmed children, maybe responses, and planner buffer.
 */
export function calculateHeadcountBasis(params: {
  adultsYes: number;
  childrenYes: number;
  maybe: number;
  maybeAllowanceRate?: number;
  plannerBufferRate?: number;
  minPlannerBufferGuests?: number;
}): HeadcountBasisSummary {
  const maybeRate = params.maybeAllowanceRate ?? 0.5;
  const bufferRate = params.plannerBufferRate ?? 0.05;
  const minBuffer = params.minPlannerBufferGuests ?? 2;

  const maybeAllowance = Math.ceil(params.maybe * maybeRate);
  const subtotal = params.adultsYes + params.childrenYes + maybeAllowance;
  const plannerBuffer = subtotal === 0 ? 0 : Math.max(minBuffer, Math.ceil(subtotal * bufferRate));

  return {
    confirmedAdults: params.adultsYes,
    confirmedChildren: params.childrenYes,
    maybeAllowance,
    plannerBuffer,
    totalHeadcountBasis: subtotal + plannerBuffer,
  };
}

function buildRecommendationItem(params: {
  logisticsKey: string;
  category: RecommendationItem["category"];
  recommendedQty: number;
  unit: OrderLineUnit;
  baseReason: string;
  lineMap: ReadonlyMap<string, LogisticsOrderLineSnapshot>;
  nowMs: number;
}): RecommendationItem {
  const existing = params.lineMap.get(params.logisticsKey);
  const currentQty = existing ? existing.currentQty : 0;
  const unitPrice = existing ? existing.unitPriceIncGstCents : 0;
  const deltaIncGstCents = (params.recommendedQty - currentQty) * unitPrice;

  let advisoryOnlyAfterCutOff = false;
  if (existing && existing.finalNumbersDueAt) {
    const dueMs =
      typeof existing.finalNumbersDueAt === "string"
        ? Date.parse(existing.finalNumbersDueAt)
        : existing.finalNumbersDueAt.getTime();
    advisoryOnlyAfterCutOff = params.nowMs > dueMs;
  }

  const reason = advisoryOnlyAfterCutOff
    ? `${params.baseReason} (Vendor final-numbers cut-off passed; advisory only via planner)`
    : params.baseReason;

  return {
    logisticsKey: params.logisticsKey,
    category: params.category,
    currentQty,
    recommendedQty: params.recommendedQty,
    unit: params.unit,
    reason,
    deltaIncGstCents,
    advisoryOnlyAfterCutOff,
  };
}

/**
 * Pure recommendation generator transforming RSVP headcount and dietary counts into actionable order recommendations.
 */
export function generateLogisticsRecommendations(
  input: LogisticsEngineInput,
): LogisticsRecommendationResult {
  const basis = calculateHeadcountBasis({
    adultsYes: input.adultsYes,
    childrenYes: input.childrenYes,
    maybe: input.maybe,
    ...(input.maybeAllowanceRate !== undefined
      ? { maybeAllowanceRate: input.maybeAllowanceRate }
      : {}),
    ...(input.plannerBufferRate !== undefined
      ? { plannerBufferRate: input.plannerBufferRate }
      : {}),
    ...(input.minPlannerBufferGuests !== undefined
      ? { minPlannerBufferGuests: input.minPlannerBufferGuests }
      : {}),
  });

  const totalGuests = basis.totalHeadcountBasis;
  const breakageRate = input.breakageBufferRate ?? 0.05;
  const nowMs = input.now.getTime();

  const lineMap = new Map<string, LogisticsOrderLineSnapshot>();
  for (const line of input.orderLines) {
    lineMap.set(line.logisticsKey, line);
  }

  const items: RecommendationItem[] = [];

  // 1. Catering main headcount
  items.push(
    buildRecommendationItem({
      logisticsKey: "catering.main",
      category: "catering",
      recommendedQty: totalGuests,
      unit: "GUEST",
      baseReason: `${basis.confirmedAdults} adults + ${basis.confirmedChildren} children + ${basis.maybeAllowance} maybe allowance + ${basis.plannerBuffer} buffer`,
      lineMap,
      nowMs,
    }),
  );

  // 2. Catering dietary categories
  for (const d of DIETARY_KEYS) {
    const count = input.dietaryBreakdown[d.tag] ?? 0;
    if (count > 0) {
      items.push(
        buildRecommendationItem({
          logisticsKey: d.logisticsKey,
          category: "catering",
          recommendedQty: count,
          unit: "GUEST",
          baseReason: `${count} confirmed guests require ${d.label}`,
          lineMap,
          nowMs,
        }),
      );
    }
  }

  // 3. Separate count for each allergen (never merged into "other")
  for (const a of ALLERGEN_KEYS) {
    const count = input.dietaryBreakdown[a.tag] ?? 0;
    if (count > 0) {
      items.push(
        buildRecommendationItem({
          logisticsKey: a.logisticsKey,
          category: "catering",
          recommendedQty: count,
          unit: "GUEST",
          baseReason: `${count} guests flagged ${a.tag}: ${a.label}`,
          lineMap,
          nowMs,
        }),
      );
    }
  }

  // 4. Cake serves
  const cakeMultiplier = input.cakeProfile === "FULL_SERVE" ? 1 : 0.75;
  const cakeServes = Math.ceil(totalGuests * cakeMultiplier);
  items.push(
    buildRecommendationItem({
      logisticsKey: "cake.serves",
      category: "cake",
      recommendedQty: cakeServes,
      unit: "GUEST",
      baseReason: `Cake serves sized at ${cakeMultiplier * 100}% of ${totalGuests} headcount basis`,
      lineMap,
      nowMs,
    }),
  );

  // 5. Seating: tables, optional kids' tables, and chairs
  const seatsPerAdultTable = TABLE_CAPACITY[input.tableType];
  const kidsPool = input.separateKidsTables ? basis.confirmedChildren : 0;
  const adultTablePool = Math.max(0, totalGuests - kidsPool);
  const adultTables = totalGuests === 0 ? 0 : Math.ceil(adultTablePool / seatsPerAdultTable);
  const kidsTables = kidsPool > 0 ? Math.ceil(kidsPool / 8) : 0;
  const totalTables = adultTables + kidsTables;

  items.push(
    buildRecommendationItem({
      logisticsKey: "seating.tables",
      category: "seating",
      recommendedQty: adultTables,
      unit: "TABLE",
      baseReason: `${adultTables} × ${input.tableType} tables (${seatsPerAdultTable} seats/table) for ${adultTablePool} seats`,
      lineMap,
      nowMs,
    }),
  );

  if (kidsTables > 0) {
    items.push(
      buildRecommendationItem({
        logisticsKey: "seating.kids_tables",
        category: "seating",
        recommendedQty: kidsTables,
        unit: "TABLE",
        baseReason: `${kidsTables} × kids' tables (8 seats/table) for ${kidsPool} children`,
        lineMap,
        nowMs,
      }),
    );
  }

  items.push(
    buildRecommendationItem({
      logisticsKey: "seating.chairs",
      category: "seating",
      recommendedQty: totalGuests,
      unit: "GUEST",
      baseReason: `1 chair per guest across ${totalGuests} headcount basis`,
      lineMap,
      nowMs,
    }),
  );

  // 6. Hire: linen and tableware (with breakage buffer)
  const linenQty = totalTables === 0 ? 0 : totalTables + Math.max(1, Math.ceil(totalTables * 0.1));
  const tablewareQty = Math.ceil(totalGuests * (1 + breakageRate));

  items.push(
    buildRecommendationItem({
      logisticsKey: "hire.linen",
      category: "hire",
      recommendedQty: linenQty,
      unit: "TABLE",
      baseReason: `${totalTables} tablecloths + 10% spare linen buffer`,
      lineMap,
      nowMs,
    }),
  );

  items.push(
    buildRecommendationItem({
      logisticsKey: "hire.tableware",
      category: "hire",
      recommendedQty: tablewareQty,
      unit: "ITEM",
      baseReason: `${totalGuests} place settings + ${Math.round(breakageRate * 100)}% breakage buffer`,
      lineMap,
      nowMs,
    }),
  );

  // 7. Staffing: waiters by service style + WA RSA-certified bartenders when alcohol is served
  const waiterRatio = WAITER_GUEST_RATIO[input.serviceStyle];
  const waitersQty = totalGuests === 0 ? 0 : Math.max(1, Math.ceil(totalGuests / waiterRatio));

  items.push(
    buildRecommendationItem({
      logisticsKey: "staffing.waiters",
      category: "staffing",
      recommendedQty: waitersQty,
      unit: "ITEM",
      baseReason: `1 waiter per ${waiterRatio} guests (${input.serviceStyle} service)`,
      lineMap,
      nowMs,
    }),
  );

  if (input.alcoholServed && totalGuests > 0) {
    const rsaBartenders = Math.max(1, Math.ceil(totalGuests / 50));
    items.push(
      buildRecommendationItem({
        logisticsKey: "staffing.rsa_bartenders",
        category: "staffing",
        recommendedQty: rsaBartenders,
        unit: "ITEM",
        baseReason: `${rsaBartenders} WA RSA-certified bar staff required for alcohol service (1 per 50 guests)`,
        lineMap,
        nowMs,
      }),
    );
  }

  return {
    rulesVersion: LOGISTICS_RULES_VERSION,
    headcountBasis: basis,
    items,
  };
}
