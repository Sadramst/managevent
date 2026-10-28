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
  bilingualEnFa: boolean;
  rsvpAndDietary: boolean;
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
