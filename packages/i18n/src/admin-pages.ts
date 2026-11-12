/**
 * Copy for the staff console at www.managevent.com.au/admin (en-AU): sign-in, the enquiries
 * inbox and the enquiry detail page.
 *
 * Kept as its own module (like `site-pages.ts`) so console copy can grow without touching the
 * shared dictionary. Read it with `getAdminPages(locale)`; fill `{placeholders}` with
 * `fillCopy()`.
 *
 * The console shows only what the API really holds. No sample enquiries, client names, figures
 * or modules that do not exist live here.
 */
import type { EnabledLocale, LeadStage } from "@managevent/types";

const stageLabels: Readonly<Record<LeadStage, string>> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal sent",
  BOOKED: "Booked",
  LOST: "Lost",
};

/** The button that moves an enquiry to each stage. */
const stageActions: Readonly<Record<LeadStage, string>> = {
  NEW: "Reopen as new",
  QUALIFIED: "Mark as qualified",
  PROPOSAL_SENT: "Mark proposal sent",
  BOOKED: "Mark as booked",
  LOST: "Mark as lost",
};

export const adminPagesEn = {
  shell: {
    skip: "Skip to main content",
    productLabel: "Staff console",
    navLabel: "Staff console",
    enquiries: "Enquiries",
    account: "Your account",
    signedInAs: "Signed in as",
    signOut: "Sign out",
    titleSuffix: "Managevent staff",
  },

  roles: {
    SUPER_ADMIN: "Administrator",
    PLANNER_STAFF: "Planner",
  },

  signIn: {
    metaTitle: "Staff sign in",
    eyebrow: "Staff console",
    title: "Sign in",
    lead: "For Managevent planners and administrators. Use your work email, your password and the code from your authenticator app.",
    email: "Work email",
    password: "Password",
    submit: "Continue",
    submitting: "Checking",
    codeTitle: "Enter your code",
    codeLead: "Open your authenticator app and enter the six-digit code for Managevent.",
    code: "Authenticator code",
    codeHelp: "Six digits. The code changes every 30 seconds.",
    verify: "Verify and sign in",
    verifying: "Verifying",
    startAgain: "Use a different account",
    staffOnly: "This area is for Managevent staff",
    staffOnlyBody:
      "Sign in with a Managevent staff account to continue. If you are hosting an event, your invitation is on the invitations site.",
    signedOut: "You have signed out.",
    sessionEnded: "Your session has ended. Sign in again to continue.",
    errorCredentials: "That email and password do not match. Check both and try again.",
    errorCode: "That code was not accepted. Wait for a new code and try again.",
    errorCodeExpired: "This sign-in took too long. Enter your email and password again.",
    errorRateLimited: "Too many attempts. Wait a few minutes, then try again.",
    errorNoSession:
      "We could not start a staff session for this account. If it is a staff account, ask an administrator to check its authenticator set-up.",
    errorUnavailable: "We could not sign you in just now. Try again in a moment.",
    noScript: "Signing in needs JavaScript turned on in your browser.",
    help: "No account or lost your authenticator? Ask a Managevent administrator. Accounts are not created here.",
  },

  inbox: {
    metaTitle: "Enquiries",
    eyebrow: "Inbox",
    title: "Enquiries",
    lead: "Every enquiry sent through the website, newest first.",
    tabsLabel: "Filter enquiries by stage",
    all: "All",
    countLabel: "{count} in {stage}",
    searchLabel: "Search enquiries",
    searchHelp: "By name, email, phone or area.",
    searchSubmit: "Search",
    searchClear: "Clear search",
    searchActive: "Showing enquiries matching “{query}”.",
    tableCaption: "Enquiries",
    colReceived: "Received",
    colName: "Name",
    colCeremony: "Occasion",
    colEventDate: "Event date",
    colGuests: "Guests",
    colArea: "Area",
    colStage: "Stage",
    open: "Open enquiry from {name}",
    dateFlexible: "Flexible",
    memorial: "Memorial",
    notGiven: "Not given",
    loadMore: "Load more",
    loadingMore: "Loading",
    loadMoreFailed: "We could not load more enquiries. Try again.",
    olderPage: "Showing older enquiries.",
    backToNewest: "Back to the newest",
    shown: "{count} shown",
    emptyTitle: "No enquiries yet",
    emptyBody: "When someone sends the enquiry form on the website, it appears here.",
    emptyFilteredTitle: "Nothing matches",
    emptyFilteredBody: "No enquiries match this stage or search.",
    emptyFilteredAction: "Show all enquiries",
    timeZoneNote: "Dates are shown in Perth time (AWST).",
  },

  lead: {
    metaTitle: "Enquiry from {name}",
    back: "All enquiries",
    eyebrow: "Enquiry",
    received: "Received {date}",
    updated: "Last updated {date}",
    perthTime: "Perth time",
    contactTitle: "Contact",
    email: "Email",
    phone: "Phone",
    preferredChannel: "Prefers",
    preferredLanguage: "Language",
    eventTitle: "The event",
    ceremony: "Occasion",
    eventDate: "Event date",
    dateFlexible: "Flexible",
    dateFlexibleWith: "{date} (flexible)",
    guests: "Guests",
    area: "Area",
    memorialNote:
      "This is a memorial enquiry. Reply promptly and plainly, without celebratory language or offers.",
    messageTitle: "Message",
    noMessage: "No message was left.",
    sourceTitle: "Where it came from",
    source: "Source",
    utmSource: "UTM source",
    utmMedium: "UTM medium",
    utmCampaign: "UTM campaign",
    estimate: "Estimate reference",
    linkedEvent: "Linked event",
    consentTitle: "Consent",
    marketingConsent: "Marketing messages",
    consentGiven: "Agreed",
    consentNotGiven: "Not agreed",
    consentRecord: "Consent record",
    consentNote:
      "Reply to this enquiry as needed. Send marketing only when the person agreed to it.",
    notGiven: "Not given",
    stageTitle: "Stage",
    stageCurrent: "Current stage",
    stageHelp: "Move the enquiry as the conversation progresses.",
    stageSaved: "Stage updated.",
    notesTitle: "Internal notes",
    notesLabel: "Notes for the team",
    notesHelp: "Only staff can see these. Up to {max} characters.",
    notesSave: "Save notes",
    notesSaved: "Notes saved.",
    assignTitle: "Owner",
    assignedToYou: "Assigned to you",
    assignedToOther: "Assigned to another team member",
    unassigned: "Not assigned",
    assignToMe: "Assign to me",
    unassign: "Remove assignment",
    assignSaved: "Assignment updated.",
    saving: "Saving",
    notFoundTitle: "Enquiry not found",
    notFoundBody: "This enquiry does not exist or has been removed.",
  },

  stages: stageLabels,
  stageActions,

  sources: {
    BUILDER: "Estimator",
    CONTACT_FORM: "Contact form",
    BOOK_CONSULT: "Consultation request",
    WHATSAPP: "WhatsApp",
    PHONE: "Phone",
    INVITATION_BRIDGE: "Invitations site",
    REFERRAL: "Referral",
    OTHER: "Other",
  },

  channels: {
    EMAIL: "Email",
    SMS: "SMS",
    WHATSAPP: "WhatsApp",
    PUSH: "App notification",
    IN_APP: "In-app message",
  },

  languages: {
    en: "English",
  },

  /** Messages for a failed save, by API error code. `fallback` covers every other code. */
  errors: {
    FORBIDDEN: "Your account is not allowed to change enquiries.",
    NOT_FOUND: "This enquiry no longer exists. Go back to the inbox.",
    VALIDATION_ERROR: "That change was not accepted. Check what you entered and try again.",
    NOTES_TOO_LONG: "Notes can be up to {max} characters.",
    INVALID_STAGE: "That stage change is not available from the current stage.",
    RATE_LIMITED: "Too many changes in a short time. Wait a moment, then try again.",
    fallback: "We could not save that. Try again in a moment.",
  },

  problem: {
    title: "Something went wrong",
    body: "The console could not load this page. Nothing was changed.",
    retry: "Try again",
    notFoundTitle: "Page not found",
    notFoundBody: "There is nothing at this address in the staff console.",
    backToInbox: "Go to enquiries",
  },
} as const;

export type AdminPagesCopy = typeof adminPagesEn;

/** Returns the staff console copy for a locale. English (en-AU) is the only enabled locale. */
export function getAdminPages(locale: EnabledLocale): AdminPagesCopy {
  void locale;
  return adminPagesEn;
}
