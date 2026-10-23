/**
 * @managevent/pricing
 *
 * Pure Ceremony Builder cost estimator (`WEBSITE.md` §A6.4), price list rules,
 * and fixtures for all 4 ceremony families.
 */

export { calculateBuilderEstimate } from "./estimator.js";

export { CEREMONY_FAMILY_BUILDER_FIXTURES } from "./fixtures.js";

export {
  type CategoryPriceRule,
  CURRENT_PRICE_LIST_VERSION,
  EXTRAS_PRICE_INC_GST_CENTS,
  SERVICE_PRICE_RULES,
  TRAVEL_ZONE_FEES_INC_GST_CENTS,
  VENUE_TYPE_ESTIMATE_INC_GST_CENTS,
} from "./price-list.js";
