/**
 * Typed dictionaries (`en`, en-AU copy) across all 11 namespaces specified in `docs/design/I18N_RTL.md`.
 */

import { launchEn } from "./launch.js";

export const I18N_NAMESPACES = [
  "common",
  "marketing",
  "invitation",
  "portal",
  "vendors",
  "admin",
  "mobile",
  "desktop",
  "ceremonies",
  "legal",
  "emails",
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export const enDictionary = {
  common: {
    brandName: "Managevent",
    byAppilico: "A product by Appilico",
    planMyCeremony: "Plan my ceremony",
    talkToUs: "Talk to us",
    signIn: "Sign in",
    signOut: "Sign out",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading…",
    errorGeneric: "Something went wrong. Please try again.",
    inclGst: "incl. GST",
    perthWa: "Perth, Western Australia",
    languageSwitchEn: "English",
  },
  marketing: {
    ...launchEn,
    heroTitle: "From 0 to 100.",
    heroSubtitle: "Every ceremony in Perth, planned and delivered end to end with calm precision.",
    seePackages: "See packages",
    bookConsultation: "Book a consultation",
    saveMyEstimate: "Save my estimate",
    shareWithPartner: "Share with partner",
    builderDisclaimer: "Indicative only. A final quote follows a consultation.",
    memorialSupportPromise: "We will take care of the details so your family can be together.",
    comingSoonWaitlist: "Coming soon to your city. Join the waitlist.",
  },
  invitation: {
    tapToOpen: "Tap to open",
    openMemorial: "Open",
    dearGuest: "Dear {guestName}",
    daysToGo: "{days} days to go",
    thankYouCelebration: "Thank you for celebrating with us.",
    thankYouMemorial: "Thank you for being with us.",
    rsvpHeading: "RSVP",
    rsvpAttendingYes: "Joyfully attending",
    rsvpAttendingNo: "Unable to attend",
    rsvpAttendingMaybe: "Maybe",
    rsvpMemorialRemembering: "You are warmly invited to join us in remembering {honoureeName}.",
    rsvpMemorialSongPrompt: "A song that reminds you of them",
    wishingWellHeading: "Wishing well",
    tributeBookHeading: "Tribute book",
    addToCalendar: "Add to calendar",
    viewMyPass: "View entry pass",
  },
  portal: {
    dashboardTitle: "Your ceremony dashboard",
    liveRsvpHeading: "Live RSVPs and headcount",
    applyRecommendation: "Apply catering & seating update",
    paymentScheduleHeading: "Payment schedule",
    seatingChartHeading: "Seating chart",
    plannerChatHeading: "Planner chat",
  },
  vendors: {
    onboardingTitle: "Become a Managevent partner vendor",
    verifyAbnPrompt: "Verify your Australian Business Number (ABN)",
    complianceDocumentsHeading: "Compliance & insurance certificates",
    bookingsInboxHeading: "Quotes and bookings",
    payoutsHeading: "Stripe Connect payouts",
  },
  admin: {
    leadInboxTitle: "Lead inbox",
    eventCommandCentreTitle: "Event command centre",
    vendorVerificationQueueTitle: "Vendor verification queue",
    inventoryTitle: "Warehouse & hire stock",
    financeGstTitle: "Margin, GST & BAS exports",
    auditLogTitle: "Audit log",
  },
  mobile: {
    customerHomeTitle: "My event",
    crewModeTitle: "On-the-day crew mode",
    scanQrPass: "Scan guest QR pass",
    duplicateScanWarning: "Already checked in",
    offlinePackReady: "Offline event pack downloaded",
  },
  desktop: {
    kioskTitle: "Managevent check-in kiosk",
    floorplanEditorTitle: "2D floorplan and seating editor",
    batchPrintingTitle: "Batch print place cards & welcome boards",
    liveDisplayControllerTitle: "Live display controller",
  },
  ceremonies: {
    wedding: "Weddings",
    birthdayMilestone: "Milestone birthdays",
    birthdayKids: "Kids' birthdays",
    galaDinner: "Corporate gala dinners",
    celebrationOfLife: "Celebration of life",
    memorialService: "Memorial service",
    wake: "Wake & gathering",
    funeralCoordination: "Funeral gathering coordination",
  },
  legal: {
    privacyNoticeShort:
      "Your details are stored in Sydney, Australia and used only to coordinate your ceremony.",
    healthDataConsentText:
      "I consent to Managevent storing my dietary and allergy requirements in Australia solely to brief the event caterers.",
    marketingConsentText:
      "Send me occasional ceremony inspiration and offers from Managevent. Unsubscribe anytime.",
    taxInvoiceHeading: "Tax invoice",
    acknowledgementOfCountry:
      "Managevent acknowledges the Whadjuk Nyoongar people as the Traditional Custodians of the lands on which we gather across Perth.",
  },
  emails: {
    leadAutoReplySubject: "We have received your enquiry — Managevent Perth",
    leadAutoReplyBody:
      "Dear {name}, thank you for getting in touch with Managevent. A Perth coordinator will respond within 1 business hour.",
    leadPlannerAlertSubject: "New Managevent lead: {name} ({source})",
    invitationSubject: "You are invited to {eventTitle}",
    unsubscribeFooter: "Managevent (Appilico) · Perth WA · Unsubscribe: {unsubscribeUrl}",
  },
} as const;

export type DictionaryShape = {
  [NS in I18nNamespace]: {
    [K in keyof (typeof enDictionary)[NS]]: string;
  };
};

export const dictionaries = {
  en: enDictionary,
} as const;

export type TranslationKey = {
  [NS in I18nNamespace]: `${NS}.${Extract<keyof (typeof enDictionary)[NS], string>}`;
}[I18nNamespace];
