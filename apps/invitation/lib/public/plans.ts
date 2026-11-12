import {
  getInvitationPlan,
  INVITATION_PLANS,
  type InvitationPlanEntitlements,
} from "@managevent/payments/plans";

/**
 * Plan facts for the public pages. Everything comes from `INVITATION_PLANS`
 * (`@managevent/payments/plans`): no price or limit is written into a page or into copy.
 */

/** The four ways an event can be covered, in the order www shows them. */
export type PlanColumn = "free" | "premium" | "memorial" | "agency";
export const PLAN_COLUMNS: readonly PlanColumn[] = ["free", "premium", "memorial", "agency"];

/** Formats integer AUD cents as a consumer price: 6900 -> "$69", 6950 -> "$69.50". */
export function formatAudCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new RangeError("cents must be >= 0");
  const dollars = Math.trunc(cents / 100);
  const remainder = cents % 100;
  const whole = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return remainder === 0 ? `$${whole}` : `$${whole}.${String(remainder).padStart(2, "0")}`;
}

/** Entitlements for each column. A memorial event gets Premium at no charge. */
export function planEntitlements(): Record<PlanColumn, InvitationPlanEntitlements> {
  return {
    free: getInvitationPlan("FREE"),
    premium: getInvitationPlan("PREMIUM"),
    memorial: getInvitationPlan("FREE", "MEMORIAL"),
    agency: getInvitationPlan("AGENCY"),
  };
}

/** The `{price}` and `{guests}` values that plan copy is filled with. */
export function planCopyParams(): { price: string; guests: string } {
  return {
    price: formatAudCents(INVITATION_PLANS.PREMIUM.priceIncGstCents),
    guests: String(INVITATION_PLANS.FREE.maxGuests),
  };
}

/** Premium Event Pass price as a decimal string for structured data: 6900 -> "69.00". */
export function premiumPriceDecimal(): string {
  const cents = INVITATION_PLANS.PREMIUM.priceIncGstCents;
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
