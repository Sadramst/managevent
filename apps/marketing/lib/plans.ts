import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Invitation plan facts shown on /invitations, /pricing, /faq and the home page.
 *
 * The source of truth is `INVITATION_PLANS` in `packages/payments/src/plans.ts`. This app does
 * not list `@managevent/payments` as a dependency (and that package pulls in Stripe), so the two
 * public numbers are read from that source file at build time, the same way `lib/content.ts`
 * reads `/content`. If the file is missing or its shape changes, the values fall back to the
 * figures resolved in `docs/business/PRICING_MODEL.md` (2026-10-23) and `source` says so.
 */
export interface InvitationPlanFacts {
  /** Premium Event Pass, AUD cents including GST. */
  premiumPriceCents: number;
  /** Guest limit on the Free plan. */
  freeMaxGuests: number;
  source: "payments" | "fallback";
}

export const FALLBACK_PLAN_FACTS: InvitationPlanFacts = {
  premiumPriceCents: 6900,
  freeMaxGuests: 30,
  source: "fallback",
};

/** Extracts the two public numbers from the text of `plans.ts`. Returns undefined if unsure. */
export function parsePlanFacts(source: string): InvitationPlanFacts | undefined {
  const block = (plan: string) =>
    new RegExp(`\\b${plan}:\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? "";
  const price = /priceIncGstCents:\s*(\d+)\s*,/.exec(block("PREMIUM"))?.[1];
  const guests = /maxGuests:\s*(\d+)\s*,/.exec(block("FREE"))?.[1];
  if (!price || !guests) return undefined;
  const premiumPriceCents = Number(price);
  const freeMaxGuests = Number(guests);
  if (!Number.isSafeInteger(premiumPriceCents) || premiumPriceCents <= 0) return undefined;
  if (!Number.isSafeInteger(freeMaxGuests) || freeMaxGuests <= 0) return undefined;
  return { premiumPriceCents, freeMaxGuests, source: "payments" };
}

let cached: InvitationPlanFacts | undefined;

export function loadInvitationPlanFacts(): InvitationPlanFacts {
  if (cached) return cached;
  try {
    const file = resolve(process.cwd(), "../../packages/payments/src/plans.ts");
    cached = parsePlanFacts(readFileSync(file, "utf8")) ?? FALLBACK_PLAN_FACTS;
  } catch {
    cached = FALLBACK_PLAN_FACTS;
  }
  return cached;
}

/** Formats integer AUD cents as a consumer price, e.g. 6900 -> "$69", 6950 -> "$69.50". */
export function formatAudCents(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  const whole = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return remainder === 0 ? `$${whole}` : `$${whole}.${String(remainder).padStart(2, "0")}`;
}

/** The `{price}` and `{guests}` values that plan copy is filled with. */
export function planCopyParams(): { price: string; guests: number } {
  const facts = loadInvitationPlanFacts();
  return { price: formatAudCents(facts.premiumPriceCents), guests: facts.freeMaxGuests };
}
