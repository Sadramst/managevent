/**
 * Copy for the shell of invitation.managevent.com.au (en-AU): the site header and footer, the
 * sign-in, sign-up, two-factor and password-reset pages, the Host Studio chrome (top bar, event
 * tabs, account menu), the shared UI primitives and the friendly messages for API error codes.
 *
 * Kept as its own module (like `site-pages.ts`) so each part of the invitations site can grow
 * its copy without touching the shared dictionary. Read it with `getInvitationShell(locale)`;
 * fill `{placeholders}` with `fillCopy()`.
 *
 * Honesty rules: nothing here promises a feature the deployment may not have. Magic links,
 * password reset emails, email invitations and card payments are offered by the pages only when
 * `GET /v1/me` reports the capability; the `capabilities` block is what the pages say otherwise.
 */
import type { EnabledLocale } from "@managevent/types";

export const invitationShellEn = {
  meta: {
    siteName: "Managevent Invitations",
    titleTemplate: "%s | Managevent Invitations",
    defaultTitle: "Managevent Invitations | Digital invitations and RSVP",
    description:
      "Create a digital invitation, share a private link with each guest and see replies and dietary needs as they come in.",
  },

  header: {
    templates: "Templates",
    pricing: "Pricing",
    howItWorks: "How it works",
    eventsSite: "Managevent Events",
    create: "Create your invitation",
    signIn: "Sign in",
    myEvents: "My events",
  },

  footer: {
    tagline:
      "Digital invitations with a private link for each guest, RSVP and dietary needs in one place. Made in Perth.",
    productTitle: "Invitations",
    home: "Home",
    helpTitle: "Help",
    contactUs: "Contact us",
    eventsTitle: "Managevent Events",
    eventsHome: "Event planning in Perth",
    eventsInvitations: "About our invitations",
    guestCredit: "Made with Managevent Invitations",
  },

  /** Shown when a deployment capability from `GET /v1/me` is off. Never fake the feature. */
  capabilities: {
    emailInvitationsOff: "Email sending is not set up yet: share by link, WhatsApp or QR.",
    magicLinkOff: "Sign-in links by email are not set up yet. Sign in with your password.",
    passwordResetOff:
      "Password reset by email is not set up yet. Contact us and we will help you get back in.",
    stripeCheckoutOff:
      "Card payments are not switched on yet. We can arrange your Premium Event Pass for you.",
    contactUs: "Contact us",
  },

  auth: {
    signIn: {
      metaTitle: "Sign in",
      eyebrow: "Host Studio",
      title: "Sign in",
      lead: "Open your invitations, guest lists and replies.",
      points: [
        "Every guest gets a private link. Nothing is listed publicly.",
        "Replies and dietary needs arrive in one place as guests respond.",
        "Dietary and allergy details are encrypted and kept in Australia.",
      ],
      submit: "Sign in",
      submitting: "Signing in",
      rememberMe: "Keep me signed in on this device",
      forgot: "Forgot your password?",
      switchPrompt: "New to Managevent Invitations?",
      switchAction: "Create an account",
      magicDivider: "Or",
      magicTitle: "Sign in with a link",
      magicBody: "We will email you a link that signs you in. No password needed.",
      magicSubmit: "Email me a sign-in link",
      magicSending: "Sending the link",
      magicSentTitle: "Check your email",
      magicSent:
        "If {email} has an account, a sign-in link is on its way. It works for 10 minutes.",
    },
    signUp: {
      metaTitle: "Create your account",
      eyebrow: "Host Studio",
      title: "Create your account",
      lead: "Free to start. Set up your invitation and add guests in a few minutes.",
      points: [
        "Free for up to {guests} guests, with RSVP and dietary needs included.",
        "Pick a template, add your details, then share a private link with each guest.",
        "No card needed to start.",
      ],
      submit: "Create account",
      submitting: "Creating your account",
      switchPrompt: "Already have an account?",
      switchAction: "Sign in",
      acknowledgement: "By creating an account you agree to our {terms} and {privacy}.",
      termsLink: "terms",
      privacyLink: "privacy policy",
    },
    fields: {
      name: "Your name",
      nameHint: "Shown to you in the studio. Guests see the host names you put on the invitation.",
      email: "Email address",
      password: "Password",
      newPassword: "New password",
      passwordHint:
        "Use 10 or more characters. A few unrelated words are strong and easy to remember.",
      showPassword: "Show password",
      hidePassword: "Hide password",
      code: "6-digit code",
      backupCode: "Backup code",
    },
    strength: {
      label: "Password strength",
      tooShort: "{remaining} more to go",
      fair: "Fair: longer is stronger",
      good: "Good",
      strong: "Strong",
    },
    validation: {
      nameRequired: "Enter your name.",
      emailRequired: "Enter your email address.",
      emailInvalid: "Enter an email address like name@example.com.",
      passwordRequired: "Enter your password.",
      passwordTooShort: "Use at least 10 characters.",
      passwordTooLong: "Use 128 characters or fewer.",
      codeRequired: "Enter the 6-digit code from your authenticator app.",
      backupCodeRequired: "Enter one of your backup codes.",
    },
    errors: {
      invalidCredentials: "That email and password do not match. Check both and try again.",
      accountExists: "An account with that email already exists. Sign in instead.",
      invalidEmail: "That email address does not look right. Check it and try again.",
      passwordTooShort: "That password is too short. Use at least 10 characters.",
      passwordTooLong: "That password is too long. Use 128 characters or fewer.",
      rateLimited: "Too many attempts. Wait a few minutes, then try again.",
      network: "We could not reach Managevent. Check your connection and try again.",
      invalidCode: "That code did not match. Check your authenticator app and try again.",
      twoFactorExpired: "That sign-in has timed out. Sign in again to get a new code prompt.",
      invalidToken: "That reset link has expired or was already used. Ask for a new one.",
      linkFailed:
        "That link did not work. It may have expired or already been used. Sign in below, or ask for a new link.",
      unknown: "Something went wrong on our side. Try again in a moment.",
    },
    twoFactor: {
      metaTitle: "Two-step sign-in",
      eyebrow: "Two-step sign-in",
      title: "Enter your code",
      lead: "Open your authenticator app and enter the 6-digit code for Managevent.",
      backupLead: "Enter one of the backup codes you saved when you turned on two-step sign-in.",
      submit: "Verify and sign in",
      submitting: "Verifying",
      useBackup: "Use a backup code instead",
      useApp: "Use the authenticator app instead",
      startAgain: "Start again",
    },
    reset: {
      metaTitle: "Reset your password",
      eyebrow: "Host Studio",
      requestTitle: "Reset your password",
      requestLead: "Enter the email address for your account and we will send you a reset link.",
      requestSubmit: "Email me a reset link",
      requestSubmitting: "Sending the link",
      requestSentTitle: "Check your email",
      requestSent: "If {email} has an account, a reset link is on its way.",
      newTitle: "Choose a new password",
      newLead: "You will be signed out everywhere else once it is changed.",
      newSubmit: "Save new password",
      newSubmitting: "Saving",
      doneTitle: "Password changed",
      done: "Your password has been changed. Sign in with the new one.",
      backToSignIn: "Back to sign in",
      unavailableTitle: "Password reset is not available yet",
      unavailableLead: "If you remember your password you can still sign in as usual.",
    },
    noscript:
      "Signing in needs JavaScript. Turn it on in your browser settings, then reload this page.",
    signOut: "Sign out",
    signingOut: "Signing out",
  },

  studio: {
    brandLabel: "Studio",
    brandHome: "Managevent Studio: all events",
    skip: "Skip to content",
    homeLabel: "All events",
    newEvent: "New invitation",
    switcherLabel: "Switch event",
    switcherEmpty: "No events yet",
    switcherCurrent: "Current event",
    accountLabel: "Account",
    signedInAs: "Signed in as",
    help: "Help and contact",
    eventsSite: "Managevent Events",
    tabsLabel: "Event sections",
    tabs: {
      overview: "Overview",
      design: "Design",
      content: "Details",
      guests: "Guests",
      share: "Share",
      responses: "Responses",
      settings: "Settings",
    },
    loadFailedTitle: "We could not load the studio",
    loadFailed: "Managevent is not responding right now. Try again in a moment.",
  },

  /** Friendly messages for API error codes (`ActionResult.code`). `UNKNOWN` is the fallback. */
  errors: {
    VALIDATION_ERROR: "Some details need another look. Check the highlighted fields and try again.",
    UNAUTHENTICATED: "You have been signed out. Sign in again to continue.",
    FORBIDDEN: "You do not have permission to do that for this event.",
    FEATURE_NOT_IN_PLAN: "That is part of the Premium Event Pass.",
    PLAN_LIMIT_EXCEEDED: "That would go over the limit for the free plan.",
    DEMO_READ_ONLY: "This is a sample invitation, so changes are not saved.",
    PREVIEW_READ_ONLY: "This is a preview. Publish the invitation to collect replies.",
    NOT_FOUND: "We could not find that. It may have been removed.",
    CONFLICT: "That could not be done because something changed. Reload the page and try again.",
    RSVP_CLOSED: "Replies for this event have closed.",
    NOT_PUBLISHED: "Publish the invitation first, then try again.",
    SLUG_TAKEN: "That link is already taken. Try different words.",
    STALE_WRITE:
      "This was changed somewhere else since you opened it. Reload the page to see the latest version.",
    ALREADY_PREMIUM: "This event already has the Premium Event Pass.",
    MEMORIAL_COMPLIMENTARY: "Memorial events include every feature at no cost.",
    PAYMENT_NOT_COMPLETED: "The payment was not completed, so nothing was charged or changed.",
    QUIET_HOURS: "Reminders can be sent between 8 am and 8 pm, event time. Try again then.",
    LINK_REVOKED: "This link has been turned off by the host.",
    PUBLISH_REQUIREMENTS_NOT_MET: "A few details are still needed before this can be published.",
    RATE_LIMITED: "That was a lot of requests in a short time. Wait a moment, then try again.",
    EMAIL_NOT_CONFIGURED: "Email sending is not set up yet: share by link, WhatsApp or QR.",
    PAYMENTS_NOT_CONFIGURED: "Card payments are not switched on yet. Contact us and we will help.",
    QUEUE_UNAVAILABLE: "We could not queue that just now. Try again in a moment.",
    NETWORK_ERROR: "We could not reach Managevent. Check your connection and try again.",
    INTERNAL_ERROR: "Something went wrong on our side. Try again in a moment.",
    UNKNOWN: "Something went wrong. Try again in a moment.",
  },

  ui: {
    close: "Close",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    saving: "Saving",
    saved: "Saved",
    delete: "Delete",
    deleting: "Deleting",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Could not copy. Select the text and copy it yourself.",
    copyManual: "Text to copy",
    optional: "optional",
    loading: "Loading",
    working: "Working",
    retry: "Try again",
    back: "Back",
    dismiss: "Dismiss",
    notifications: "Notifications",
  },

  errorPage: {
    title: "Something went wrong",
    body: "The page could not be shown. Try again, and if it keeps happening, contact us.",
    retry: "Try again",
    home: "Back to the home page",
  },
};

export type InvitationShellCopy = typeof invitationShellEn;

/** Codes with a friendly message in `invitationShellEn.errors`. */
export type InvitationErrorCode = keyof InvitationShellCopy["errors"];

/** Returns the invitations shell copy for a locale. English (en-AU) is the only enabled locale. */
export function getInvitationShell(locale: EnabledLocale): InvitationShellCopy {
  void locale;
  return invitationShellEn;
}
