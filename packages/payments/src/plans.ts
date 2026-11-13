/**
 * Invitation plans and entitlements (`WEBSITE.md` §B14 and `docs/business/PRICING_MODEL.md`).
 *
 */
import type { ExperienceMode, InvitationPlan } from "@managevent/types";

export interface InvitationPlanEntitlements {
  plan: InvitationPlan;
  label: string;
  /** Price in AUD cents incl. GST. */
  priceIncGstCents: number;
  maxGuests: number | "unlimited";
  maxEmailInvitations: number | "unlimited";
  allThemesAndAnimations: boolean;
  /** Retired concept (English only for now). Kept for type stability; never surfaced in a DTO. */
  bilingualEnFa: boolean;
  rsvpAndDietary: boolean;
  /** RSVP reminder emails to parties that have not responded. */
  rsvpReminders: boolean;
  customEventSlug: boolean;
  fullMusicLibraryAndUpload: boolean;
  allGateStyles: boolean;
  qrPassesAndCheckin: boolean;
  livePhotoWallAndDisplay: boolean;
  wellAndTributeExport: boolean;
  bulkSmsAndWhatsapp: boolean;
  pinProtection: boolean;
  removeBranding: boolean;
  automaticLogisticsBridge: boolean;
}

export const INVITATION_PLANS: Readonly<Record<InvitationPlan, InvitationPlanEntitlements>> = {
  FREE: {
    plan: "FREE",
    label: "Free Invitation",
    priceIncGstCents: 0,
    maxGuests: 30,
    maxEmailInvitations: 50,
    allThemesAndAnimations: false,
    bilingualEnFa: true,
    rsvpAndDietary: true,
    rsvpReminders: false,
    customEventSlug: false,
    fullMusicLibraryAndUpload: false,
    allGateStyles: false,
    qrPassesAndCheckin: false,
    livePhotoWallAndDisplay: false,
    wellAndTributeExport: false,
    bulkSmsAndWhatsapp: false,
    pinProtection: false,
    removeBranding: false,
    automaticLogisticsBridge: false,
  },
  PREMIUM: {
    plan: "PREMIUM",
    label: "Premium Event Pass",
    priceIncGstCents: 6900,
    maxGuests: "unlimited",
    maxEmailInvitations: "unlimited",
    allThemesAndAnimations: true,
    bilingualEnFa: true,
    rsvpAndDietary: true,
    rsvpReminders: true,
    customEventSlug: true,
    fullMusicLibraryAndUpload: true,
    allGateStyles: true,
    qrPassesAndCheckin: true,
    livePhotoWallAndDisplay: true,
    wellAndTributeExport: true,
    bulkSmsAndWhatsapp: true,
    pinProtection: true,
    removeBranding: true,
    automaticLogisticsBridge: false,
  },
  AGENCY: {
    plan: "AGENCY",
    label: "Included in Managevent Agency Package",
    priceIncGstCents: 0,
    maxGuests: "unlimited",
    maxEmailInvitations: "unlimited",
    allThemesAndAnimations: true,
    bilingualEnFa: true,
    rsvpAndDietary: true,
    rsvpReminders: true,
    customEventSlug: true,
    fullMusicLibraryAndUpload: true,
    allGateStyles: true,
    qrPassesAndCheckin: true,
    livePhotoWallAndDisplay: true,
    wellAndTributeExport: true,
    bulkSmsAndWhatsapp: true,
    pinProtection: true,
    removeBranding: true,
    automaticLogisticsBridge: true,
  },
};

export type BooleanEntitlementKey = {
  [K in keyof InvitationPlanEntitlements]: InvitationPlanEntitlements[K] extends boolean
    ? K
    : never;
}[keyof InvitationPlanEntitlements];

/**
 * Checks whether an invitation has a specific boolean entitlement (`WEBSITE.md` §B14).
 */
export function hasInvitationEntitlement(
  plan: InvitationPlan,
  entitlement: BooleanEntitlementKey,
  experienceMode?: ExperienceMode,
): boolean {
  return getInvitationPlan(plan, experienceMode)[entitlement];
}

export function getInvitationPlan(
  plan: InvitationPlan,
  experienceMode?: ExperienceMode,
): InvitationPlanEntitlements {
  if (experienceMode === "MEMORIAL") {
    return { ...INVITATION_PLANS[plan === "AGENCY" ? "AGENCY" : "PREMIUM"], priceIncGstCents: 0 };
  }
  return { ...INVITATION_PLANS[plan] };
}

/**
 * Checks whether an invitation can add `guestCount` guests under its current `InvitationPlan`.
 */
export function canAddGuestsUnderPlan(
  plan: InvitationPlan,
  guestCount: number,
  experienceMode?: ExperienceMode,
): boolean {
  if (!Number.isSafeInteger(guestCount) || guestCount < 0) return false;
  const max = getInvitationPlan(plan, experienceMode).maxGuests;
  if (max === "unlimited") return true;
  return guestCount <= max;
}

/** Number of private guest links (households) unlocked on the Free tier before payment is required. */
export const FREE_PARTY_LINK_LIMIT = 5;

/**
 * Checks whether the guest link for a party at 0-based `partyIndex` (in creation order) is
 * unlocked under the invitation's plan. Celebration events on `FREE` unlock the first
 * `FREE_PARTY_LINK_LIMIT` (5) party links; additional links unlock once upgraded to `PREMIUM`.
 */
export function isPartyLinkUnlocked(
  plan: InvitationPlan,
  partyIndex: number,
  experienceMode?: ExperienceMode,
): boolean {
  if (!Number.isSafeInteger(partyIndex) || partyIndex < 0) return false;
  const effective = getInvitationPlan(plan, experienceMode);
  if (effective.plan !== "FREE") return true;
  return partyIndex < FREE_PARTY_LINK_LIMIT;
}

