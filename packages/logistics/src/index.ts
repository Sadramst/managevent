/**
 * @managevent/logistics
 *
 * Pure, deterministic, versioned RSVP -> logistics recommendation engine (`ARCHITECTURE.md` §6).
 */

export {
  type CakeServeProfile,
  calculateHeadcountBasis,
  type DietaryBreakdownMap,
  generateLogisticsRecommendations,
  type HeadcountBasisSummary,
  LOGISTICS_RULES_VERSION,
  type LogisticsEngineInput,
  type LogisticsOrderLineSnapshot,
  type LogisticsRecommendationResult,
  type ServiceStyle,
  type TableType,
} from "./engine.js";
