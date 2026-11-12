/**
 * Copy for the public pages of invitation.managevent.com.au (en-AU): the home page, the
 * template gallery, pricing, email preferences (unsubscribe) and the page-not-found screen.
 *
 * Kept as its own module (like `site-pages.ts` and `invitation-shell.ts`). Read it with
 * `getInvitationPublic(locale)`; fill `{placeholders}` with `fillCopy()`. `{price}` is the
 * Premium Event Pass price and `{guests}` the Free guest limit, both from
 * `INVITATION_PLANS` in `@managevent/payments/plans`. Nothing here states a price.
 *
 * Honesty rules: every feature named here exists in the product today. Email sending and card
 * payments depend on the deployment, so the pages add the matching `capabilities.*Off` line from
 * `invitation-shell.ts` when `GET /v1/me` says they are off.
 */
import type { EnabledLocale } from "@managevent/types";

export const invitationPublicEn = {
  shared: {
    /** The organisation behind the product, for structured data. */
    brandName: "Managevent",
    create: "Create your invitation",
    createAnother: "Create a new invitation",
    browseTemplates: "Browse templates",
    myEvents: "Go to my events",
    seePricing: "See plans and prices",
    viewSample: "View sample",
    /** Screen-reader suffix for links that repeat on every card: "View sample: Royal Classic". */
    viewSampleFor: "View sample: {name}",
    useTemplate: "Use this template",
    useTemplateFor: "Use this template: {name}",
    free: "Free",
    premium: "Premium",
    celebration: "Celebration",
    memorial: "Memorial",
    sampleLabel: "Sample invitation",
    inclGst: "incl. GST",
    included: "Included",
    notIncluded: "Not included",
    unlimited: "Unlimited",
    upTo: "Up to {guests}",
    contactUs: "Contact us",
  },

  /** Display names for the template catalogue (`INVITATION_TEMPLATES` in validators). */
  templateNames: {
    "royal-classic": {
      name: "Royal Classic",
      summary:
        "Ivory, burgundy and gold under an arch. A formal invitation for weddings and milestone dinners.",
    },
    "modern-minimal": {
      name: "Modern Minimal",
      summary:
        "Clean alabaster with plenty of space. Suits birthdays, dinners and anything understated.",
    },
    "celestial-evening": {
      name: "Celestial Evening",
      summary:
        "Deep midnight blue with rose gold. Made for engagements and parties that start after dark.",
    },
    "botanic-garden": {
      name: "Botanic Garden",
      summary:
        "Soft greens with a botanical touch. Lovely for garden weddings, anniversaries and long lunches.",
    },
    "memorial-calm": {
      name: "Calm Memorial",
      summary:
        "Quiet alabaster and bronze. Date, time and place come first, with gentle wording throughout.",
    },
    "memorial-linen": {
      name: "Linen Memorial",
      summary:
        "Warm slate and linen tones. A plain, steady design for a funeral or celebration of life.",
    },
  },

  home: {
    metaTitle: "Digital invitations with RSVP and dietary needs",
    metaDescription:
      "Create a digital invitation from a designed template, share a private link with each household and see replies and dietary needs as they arrive. Free for small events.",
    eyebrow: "Digital invitations and RSVP",
    title: "Invite beautifully. Know who is coming.",
    lead: "Pick a template, add your details and share a private link with each household. Replies and dietary needs arrive in one place. Free for up to {guests} guests.",
    signedInLead:
      "Welcome back. Open your events to see new replies, or start another invitation from a template.",
    previewCaption: "A live sample. Open it to see exactly what a guest sees.",
    previewOpen: "Open this sample",
    previewFallbackHosts: "Together with their families",
    previewFallbackHeadline: "You are invited",
    previewFallbackTitle: "Your names, your date, your place",

    stepsEyebrow: "How it works",
    stepsTitle: "Four steps from blank page to guest list",
    steps: [
      {
        title: "Choose a template",
        body: "Start from a finished design. Add your names, date, place and wording.",
      },
      {
        title: "Add your guests",
        body: "Type households in or import a CSV file. Each household gets its own private link.",
      },
      {
        title: "Share the links",
        body: "Send each link by WhatsApp, paste it into a message or show a QR code. Guests open it in their browser.",
      },
      {
        title: "Watch replies arrive",
        body: "See who is coming, who is not and what each person can eat. Export the list whenever you need it.",
      },
    ],

    featuresEyebrow: "What is included",
    featuresTitle: "Built for real guest lists",
    features: [
      {
        title: "Six designed templates",
        body: "Four for celebrations and two for memorials. You change the words, not the layout.",
      },
      {
        title: "A private link for each household",
        body: "Only invited guests see the details. You can switch a link off or issue a new one at any time.",
      },
      {
        title: "Share by WhatsApp, link or QR code",
        body: "Send invitations the way your family already talks to each other. There is no app to install.",
      },
      {
        title: "RSVP for each person",
        body: "Guests reply for everyone in their household, with dietary and allergy needs for each person.",
      },
      {
        title: "Guest list with CSV import",
        body: "Bring your list from a spreadsheet and group people by household.",
      },
      {
        title: "Replies in one place",
        body: "A running count of who is coming, plus a CSV export for your caterer or venue.",
      },
      {
        title: "Add to calendar",
        body: "Guests save the date, time and place to their own calendar in one tap.",
      },
      {
        title: "Wishing well or tribute book",
        body: "Share wishing well details for a celebration, or collect messages of remembrance that you review first.",
      },
      {
        title: "QR passes and door check-in",
        body: "Each guest gets a QR pass and you check people in at the door on your phone. Part of Premium.",
      },
      {
        title: "Careful with health details",
        body: "Dietary and allergy answers are given with consent, encrypted and stored in Australia.",
      },
    ],

    samplesEyebrow: "Samples",
    samplesTitle: "See it as a guest would",
    samplesLead:
      "Each sample is a complete invitation with made-up details. Open one, tap through it and try the reply form. Nothing you enter is saved.",
    samplesAll: "All templates",
    samplesUnavailable:
      "The samples cannot be loaded right now. You can still browse the templates and start your invitation.",

    bridgeEyebrow: "From RSVP to catering",
    bridgeTitle: "Your replies become your catering numbers",
    bridgeLead:
      "Most invitation tools stop at a list of names. When Managevent also plans your event, the replies do more work.",
    bridgeSteps: [
      {
        title: "Guests reply",
        body: "Each household confirms who is coming and what each person can and cannot eat.",
      },
      {
        title: "Numbers add up",
        body: "Adults, children and each dietary need are counted for you, with severe allergies clearly flagged.",
      },
      {
        title: "Your coordinator uses them",
        body: "The meal count, table plan and hire quantities are set from those replies, then confirmed with the caterer before the day.",
      },
    ],
    bridgeNote:
      "Using the invitation on its own? Export your replies as a CSV and hand them to your caterer or venue.",
    bridgeLink: "See what Managevent can plan for you",

    memorialEyebrow: "Memorial Mode",
    memorialTitle: "A quieter invitation for remembering someone",
    memorialBody:
      "For funerals, memorial services, wakes and celebrations of life, the invitation changes with the occasion. The colours are calm, the wording is gentle, and there are no countdowns or offers. Guests can leave a message in a tribute book, which the family reviews before anything is shown.",
    memorialPoints: [
      "Complimentary for memorial events",
      "Date, time and place first",
      "A tribute book the family reviews, in place of a wishing well",
    ],
    memorialSample: "View a memorial sample",
    memorialTemplates: "See the memorial templates",

    plansEyebrow: "Plans",
    plansTitle: "Simple pricing, once per event",
    plansLead:
      "No subscription. Prices are in Australian dollars and include GST. Start free and upgrade only if your event needs it.",

    faqEyebrow: "Questions",
    faqTitle: "Good to know before you start",
    faq: [
      {
        question: "Do my guests need an app or an account?",
        answer:
          "No. Each household opens its private link in a web browser, including the browser inside WhatsApp. There is nothing to install and no password to remember.",
      },
      {
        question: "Who can see my invitation?",
        answer:
          "Only people who have a link. Invitations are not listed anywhere and are hidden from search engines. If a link goes astray, you can switch it off or issue a new one from your guest list.",
      },
      {
        question: "How do guests reply?",
        answer:
          "The link shows the names in that household. Guests answer for each person, add dietary or allergy needs, and can change their reply until your RSVP date.",
      },
      {
        question: "How much does it cost?",
        answer:
          "It is free for up to {guests} guests. The Premium Event Pass is {price} including GST, paid once per event, with no subscription. Memorial events receive Premium features at no charge.",
      },
      {
        question: "What happens to dietary and allergy information?",
        answer:
          "It is health information, so we ask for each guest's consent, encrypt it and store it in Australia. You see it in your Host Studio. Other guests never see it.",
      },
      {
        question: "Can I change the details after I have shared the links?",
        answer:
          "Yes. The links stay the same and guests always see the latest details when they open them.",
      },
    ],

    ctaTitle: "Start with a template",
    ctaBody: "Choose a design, add your details and have a link ready to share today.",
    ctaTitleSignedIn: "Pick up where you left off",
    ctaBodySignedIn: "Your invitations, guest lists and replies are waiting in your events.",
  },

  templates: {
    metaTitle: "Invitation templates for celebrations and memorials",
    metaDescription:
      "Six designed invitation templates: four for weddings, birthdays, engagements and anniversaries, and two calm designs for memorials. View a live sample of each.",
    eyebrow: "Templates",
    title: "Choose a design to start from",
    lead: "Every template is a complete invitation: your wording, the schedule, the venue and a reply form. Open a sample to see it as a guest would, then make it yours.",
    celebrationEyebrow: "Celebrations",
    celebrationTitle: "For weddings, birthdays and everything worth a toast",
    celebrationLead:
      "Two templates are free. The other two are part of the Premium Event Pass, {price} once per event.",
    memorialEyebrow: "Memorials",
    memorialTitle: "For remembering someone",
    memorialLead:
      "Calm designs with gentle wording, no countdowns and no offers. Both are complimentary for memorial events.",
    themeLabel: "Colours",
    freeNote: "Included in the Free plan",
    premiumNote: "Part of the Premium Event Pass",
    memorialNote: "Complimentary for memorial events",
    samplesUnavailable:
      "The live samples cannot be loaded right now. You can still start from any template.",
    ctaTitle: "Found one you like?",
    ctaBody:
      "Start with any template. You can change the template and colours later without losing your wording or guests.",
  },

  pricing: {
    metaTitle: "Pricing",
    metaDescription:
      "Managevent Invitations is free for small events. The Premium Event Pass is a one-off price per event, including GST. Memorial events are complimentary.",
    eyebrow: "Pricing",
    title: "Free to start. One price if you need more.",
    lead: "No subscription and nothing to cancel. The Free plan covers up to {guests} guests. The Premium Event Pass is {price} including GST, paid once for one event.",
    heroCardTitle: "At a glance",
    heroCardLines: [
      "Free for up to {guests} guests",
      "Premium Event Pass: {price}, once per event",
      "Complimentary for memorial events",
    ],
    plansTitle: "Four ways to use it",
    plansLead: "Every plan includes private links, RSVP with dietary needs and your replies list.",
    plans: {
      free: {
        name: "Free",
        price: "$0",
        note: "For small gatherings of up to {guests} guests.",
        points: [
          "Two celebration templates",
          "Private link for each household",
          "RSVP with dietary and allergy needs",
          "Replies list and CSV export",
        ],
      },
      premium: {
        name: "Premium Event Pass",
        price: "{price}",
        note: "Paid once per event. No subscription.",
        points: [
          "Unlimited guests",
          "Every template and opening style",
          "QR passes and door check-in",
          "Your own words in the link, and no Managevent credit",
        ],
      },
      memorial: {
        name: "Memorials",
        price: "Complimentary",
        note: "Premium features at no charge for memorial events.",
        points: [
          "Unlimited guests",
          "Both memorial templates",
          "A tribute book the family reviews",
          "No offers or upgrade prompts",
        ],
      },
      agency: {
        name: "With an agency package",
        price: "Included",
        note: "Part of any event Managevent plans and runs for you.",
        points: [
          "Everything in Premium",
          "Your coordinator sizes catering, seating and hire from the replies",
        ],
      },
    },
    startFree: "Start free",
    startMemorial: "Start an invitation",
    talkToUs: "Talk to us",
    premiumHow:
      "Start free, then upgrade from your event's Settings page whenever you are ready. Your wording, guests and replies stay as they are.",
    compareTitle: "What each plan includes",
    compareCaption: "Invitation plans compared",
    compareScrollHint: "Swipe sideways to compare all four plans.",
    compareFeatureHeading: "Feature",
    rows: {
      price: "Price",
      guests: "Guests",
      templates: "Templates",
      links: "Private link for each household",
      sharing: "Share by WhatsApp, link or QR code",
      rsvp: "RSVP with dietary and allergy needs",
      responses: "Replies list and CSV export",
      calendar: "Add to calendar",
      well: "Wishing well or tribute book",
      openingStyles: "Every opening style",
      customLink: "Your own words in the invitation link",
      reminders: "RSVP reminder emails",
      checkin: "QR passes and door check-in",
      branding: "No Managevent credit on the invitation",
      bridge: "Catering, seating and hire sized by your coordinator",
    },
    values: {
      oneOff: "{price} incl. GST, one-off",
      complimentary: "Complimentary",
      includedInPackage: "Included",
      templatesFree: "Two celebration templates",
      templatesAll: "Every template",
      templatesMemorial: "Both memorial templates",
    },
    footnote:
      "Prices are in Australian dollars and include GST. Memorial events receive Premium features at no charge. Agency packages are quoted separately; the invitation is included in that quote.",
    remindersNote:
      "Reminder emails need email sending, which is not set up yet. You can still share links by WhatsApp, as a copied link or as a QR code.",
    faqTitle: "Questions about paying",
    faq: [
      {
        question: "Is it a subscription?",
        answer:
          "No. The Premium Event Pass is paid once and covers one event. There is nothing to cancel.",
      },
      {
        question: "Can I start free and upgrade later?",
        answer:
          "Yes. Everything you have set up stays in place: your wording, your guest list, the links you have shared and every reply.",
      },
      {
        question: "Does the price include GST?",
        answer: "Yes. Every price shown is in Australian dollars and includes GST.",
      },
      {
        question: "Why are memorial invitations complimentary?",
        answer:
          "Arranging a funeral or memorial is hard enough. Memorial events receive Premium features at no charge, and the invitation never shows offers.",
      },
    ],
    ctaTitle: "Start free today",
    ctaBody: "Choose a template and have a link ready to share in a few minutes.",
  },

  unsubscribe: {
    metaTitle: "Email preferences",
    eyebrow: "Email preferences",
    confirmTitle: "Stop invitation emails to this address?",
    confirmBody:
      "You will no longer receive invitation or reminder emails sent through Managevent Invitations. Your invitation link keeps working, and your host can still reach you another way.",
    confirmAction: "Stop these emails",
    confirmPending: "Updating your preferences",
    doneTitle: "You will not receive these emails again",
    doneBody:
      "We have taken this address off invitation and reminder emails. Any invitation link you already have still works, so you can open it and reply whenever you like.",
    invalidTitle: "This link is not valid",
    invalidBody:
      "The unsubscribe link is incomplete or has been changed. Open the link from the bottom of the email again, making sure you have the whole link. If it still does not work, contact us and we will take your address off the list.",
    errorTitle: "We could not update your preferences",
    errorBody: "Nothing was changed. Wait a moment and try again.",
    home: "Back to the home page",
  },

  notFound: {
    metaTitle: "Page not found",
    eyebrow: "Page not found",
    title: "We cannot find that page",
    body: "The address may be mistyped, or the page may have moved.",
    guestTitle: "Looking for your invitation?",
    guestBody:
      "Invitation links are private and must be complete to work. Open the link from your message again, or ask your host to send it to you once more.",
    hostTitle: "Hosting an event?",
    hostBody: "Sign in to open your invitations, guest lists and replies.",
    home: "Back to the home page",
    templates: "Browse templates",
    signIn: "Sign in",
  },

  /** Old links from the earlier invitation sites: the tab title while they are resolved. */
  legacy: {
    metaTitle: "Your invitation",
  },
};

export type InvitationPublicCopy = typeof invitationPublicEn;

/** Returns the public-page copy for a locale. English (en-AU) is the only enabled locale. */
export function getInvitationPublic(locale: EnabledLocale): InvitationPublicCopy {
  void locale;
  return invitationPublicEn;
}
