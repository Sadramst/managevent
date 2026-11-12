/**
 * Copy for the guest micro-site of invitation.managevent.com.au (en-AU): the invitation a guest
 * opens from their private link (`/i/{eventSlug}/{guestToken}`), the reply form, the wishing well
 * or tribute book, the door passes, and the page shown when a link has been turned off.
 *
 * Read it with `getInvitationGuest(locale)`; fill `{placeholders}` with `fillCopy()`.
 *
 * Two voices live here. `celebration` is warm and plain; `memorial` is gentle and brief
 * (`docs/design/MEMORIAL_MODE.md`): no countdown wording, no exclamation, no upsell. Pick one with
 * `guestVoice(copy, experienceMode)`.
 *
 * Honesty rules: nothing here promises a feature that does not exist. `rsvp.healthConsent.text`
 * is the exact consent wording stored with a guest's dietary, allergy or accessibility details,
 * so change it only with the privacy policy.
 */
import type { EnabledLocale, ExperienceMode } from "@managevent/types";

export const invitationGuestEn = {
  meta: {
    /** Never include a guest name in any of these. */
    description: "Open your invitation for the details and to reply.",
    passTitle: "Your passes",
    fallbackTitle: "Your invitation",
  },

  banner: {
    demoTitle: "Sample invitation",
    demoBody: "The details are made up and replies are not saved.",
    demoAction: "See all templates",
    previewTitle: "Preview",
    previewBody: "Only you can see this until you publish it. Replies are not saved.",
  },

  gate: {
    /** Above the household name on the closed invitation. */
    forLabel: "An invitation for",
    open: "Open your invitation",
    openShort: "Open",
    hint: "Tap to open",
    opening: "Opening your invitation",
  },

  nav: {
    skipToReply: "Skip to your reply",
    reply: "Reply",
    changeReply: "View your reply",
    addToCalendar: "Add to calendar",
    openInMaps: "Open in Maps",
    viewPasses: "View your passes",
    backToInvitation: "Back to your invitation",
  },

  celebration: {
    greeting: "Dear {name}",
    invitedBy: "{hosts}",
    whenTitle: "When",
    whereTitle: "Where",
    countdownTitle: "Not long now",
    countdownLabel: "Time until the day",
    past: "Thank you for celebrating with us.",
    storyTitle: "Our story",
    scheduleTitle: "On the day",
    galleryTitle: "Gallery",
    faqTitle: "Good to know",
    dressCodeTitle: "Dress code",
    parkingTitle: "Parking and access",
    rsvpTitle: "Your reply",
    rsvpLead: "Let us know who can make it.",
    rsvpDeadline: "Please reply by {date}.",
    wellTitle: "Wishing well",
    wishesTitle: "Messages from guests",
    wishFormTitle: "Leave a message for the hosts",
    wishMessageLabel: "Your message",
    wishShare: "Show my message on this page for other guests, once the hosts approve it",
    wishSubmit: "Send message",
    wishSent: "Thank you. Your message has gone to the hosts.",
    wishSentShared:
      "Thank you. Your message has gone to the hosts and will appear here once they approve it.",
    attending: {
      YES: "Yes, I will be there",
      NO: "Sorry, I cannot make it",
      MAYBE: "Not sure yet",
    },
    statusLabel: {
      YES: "Coming",
      NO: "Not coming",
      MAYBE: "Not sure yet",
      PENDING: "No reply yet",
    },
    submit: "Send reply",
    submitUpdate: "Update reply",
    submitting: "Sending your reply",
    confirmTitleYes: "Thank you. We cannot wait to see you.",
    confirmTitleNo: "Thank you for letting us know. You will be missed.",
    confirmTitleMaybe: "Thank you. Let us know when you are sure.",
    confirmLead: "Your reply has been sent to the hosts.",
    songLabel: "Song requests",
    songHint: "What will get you on the dance floor? Up to three songs.",
    messageLabel: "A message for the hosts",
    closedTitle: "Replies have closed",
    closedNoReply:
      "The date for replies has passed. If your plans have changed, please contact the hosts directly.",
    closedWithReply:
      "The date for replies has passed. This is what the hosts have for you. If your plans have changed, please contact them directly.",
  },

  memorial: {
    greeting: "Dear {name}",
    invitedBy: "{hosts}",
    whenTitle: "When",
    whereTitle: "Where",
    countdownTitle: "",
    countdownLabel: "",
    past: "Thank you for being with us.",
    storyTitle: "A life remembered",
    scheduleTitle: "Order of the day",
    galleryTitle: "Photographs",
    faqTitle: "Good to know",
    dressCodeTitle: "What to wear",
    parkingTitle: "Parking and access",
    rsvpTitle: "Your reply",
    rsvpLead: "Please let the family know if you are able to come.",
    rsvpDeadline: "Please reply by {date}.",
    wellTitle: "Tribute book",
    wishesTitle: "Tributes",
    wishFormTitle: "Leave a tribute for the family",
    wishMessageLabel: "Your tribute",
    wishShare: "Show my tribute on this page for others to read, once the family approves it",
    wishSubmit: "Send tribute",
    wishSent: "Thank you. Your tribute has gone to the family.",
    wishSentShared:
      "Thank you. Your tribute has gone to the family and will appear here once they approve it.",
    attending: {
      YES: "I will attend",
      NO: "I am unable to attend",
      MAYBE: "I am not sure yet",
    },
    statusLabel: {
      YES: "Attending",
      NO: "Unable to attend",
      MAYBE: "Not sure yet",
      PENDING: "No reply yet",
    },
    submit: "Send reply",
    submitUpdate: "Update reply",
    submitting: "Sending your reply",
    confirmTitleYes: "Thank you. The family will be glad to have you there.",
    confirmTitleNo: "Thank you for letting the family know.",
    confirmTitleMaybe: "Thank you. Please let the family know when you are sure.",
    confirmLead: "Your reply has been sent to the family.",
    songLabel: "A song that reminds you of them",
    songHint: "If a piece of music comes to mind, you are welcome to share it. Up to three.",
    messageLabel: "A message for the family",
    closedTitle: "Replies have closed",
    closedNoReply:
      "The date for replies has passed. If you would like to attend, please contact the family directly.",
    closedWithReply:
      "The date for replies has passed. This is what the family has for you. If your plans have changed, please contact them directly.",
  },

  details: {
    /** "{city} time", from the event's time zone, e.g. "Perth time". */
    timeZone: "{city} time",
    until: "until {time}",
    tableLabel: "Your seating",
    personal: "This invitation is personal to you. Please do not pass the link on.",
    coverAlt: "Photograph chosen by the hosts",
    galleryAlt: "Photograph {index} of {total}",
  },

  countdown: {
    days: "days",
    day: "day",
    hours: "hours",
    hour: "hour",
    minutes: "minutes",
    minute: "minute",
    seconds: "seconds",
    second: "second",
  },

  music: {
    play: "Play music",
    pause: "Pause music",
    nowPlaying: "Music: {title}",
  },

  rsvp: {
    noscript:
      "Replying on this page needs JavaScript. Turn it on in your browser settings and reload, or reply to the hosts directly.",
    readOnlyDemo: "This is a sample, so you can try the form but nothing is sent or saved.",
    readOnlyPreview:
      "This is a preview, so you can try the form but nothing is sent or saved. Publish the invitation to collect replies.",
    memberLegend: "Will {name} be there?",
    child: "Child",
    addedGuest: "Guest you added",
    dietaryLegend: "Dietary needs for {name}",
    dietaryHint: "Tick any that apply. Leave blank if there are none.",
    dietary: {
      NONE: "No dietary needs",
      VEGETARIAN: "Vegetarian",
      VEGAN: "Vegan",
      HALAL: "Halal",
      KOSHER: "Kosher",
      GLUTEN_FREE: "Gluten-free",
      DAIRY_FREE: "Dairy-free",
      NUT_ALLERGY: "Nut allergy",
      SHELLFISH_ALLERGY: "Shellfish allergy",
      OTHER_ALLERGY: "Another allergy",
    },
    allergySeverityLabel: "How serious is the allergy?",
    allergySeverityPlaceholder: "Choose one",
    allergySeverity: {
      MILD: "Mild",
      MODERATE: "Moderate",
      SEVERE_ANAPHYLAXIS: "Severe (risk of anaphylaxis)",
    },
    allergyNotesLabel: "Allergy details",
    allergyNotesHint: "What should the kitchen avoid?",
    accessibilityLabel: "Access needs",
    accessibilityHint: "For example step-free access, a seat near the front or a hearing loop.",
    healthOnFile:
      "We already have food and access details for {name}. They stay as they are unless you change them.",
    healthUpdate: "Change these details",
    healthKeep: "Keep what is on file",
    healthReplaceNote: "What you enter here replaces the details on file for {name}.",
    healthConsent: {
      title: "Your consent",
      /** Stored word for word with the reply (`healthConsent.textShown`). 20 to 600 characters. */
      text: "I agree that the dietary, allergy and access details I have entered may be shared with the hosts, and with the caterer and venue for this event, so they can look after the people named. They are used only for this event.",
      note: "Dietary, allergy and access details are health information. They are stored encrypted in Australia.",
      privacyLink: "How we handle your information",
    },
    plusOnes: {
      title: "Bringing someone?",
      lead: "You can add up to {count} more people.",
      leadOne: "You can add one more person.",
      add: "Add a guest",
      remove: "Remove",
      removeNamed: "Remove {name}",
      legend: "Guest {index}",
      nameLabel: "Their name",
      childLabel: "This guest is a child",
      full: "You have added everyone your invitation allows.",
    },
    songs: {
      inputLabel: "Song {index}",
      placeholder: "Song and artist",
      add: "Add another song",
      remove: "Remove song {index}",
    },
    message: {
      hint: "Only the hosts will see this.",
      remaining: "{count} characters left",
    },
    contact: {
      title: "Updates about the day",
      lead: "If you would like the hosts to be able to reach you with changes on the day, leave an email address or mobile number.",
      emailLabel: "Email address",
      phoneLabel: "Mobile number",
      phoneHint: "An Australian number, for example 0412 345 678.",
      consent: "I agree the hosts may use these details to send me updates about this event.",
    },
    summary: {
      title: "Your reply",
      songs: "Songs",
      message: "Your message",
      healthOnFile: "Food and access details on file",
      change: "Change my reply",
      cancelChange: "Keep my reply as it is",
      passesTitle: "Your passes are ready",
      passesBody: "Show them at the door on the day.",
    },
    errors: {
      summaryTitle: "Please check your reply",
      statusRequired: "Choose an answer for {name}.",
      plusOneName: "Enter this guest's name, or remove them.",
      severityRequired: "Tell us how serious the allergy is.",
      emailInvalid: "Enter an email address like name@example.com.",
      phoneInvalid: "Enter an Australian mobile or landline number, for example 0412 345 678.",
      contactConsent: "Tick the box to agree, or clear your contact details.",
      healthConsent: "Tick the box to agree, or remove the food and access details.",
      wishName: "Enter your name.",
      wishMessage: "Write a few words first.",
      conflict:
        "Your reply could not be saved because it was sent twice in different forms. Check your answers and send it again.",
      changed:
        "This invitation has changed since you opened it, so your reply was not saved. Reload the page to see the latest version, then reply again.",
      plusOnesChanged:
        "The extra guests could not be added, so your reply was not saved. The hosts may have changed who this invitation is for. Reload the page to see the latest version, then reply again.",
      reload: "Reload the page",
      closed: "Replies for this event have closed, so your reply was not saved.",
      revoked: "This link has been turned off by the hosts, so your reply was not saved.",
      generic:
        "Your reply was not sent. Your answers are still here: check your connection and try again.",
    },
  },

  well: {
    readOnly: "This is a sample, so messages are not sent or saved.",
    nameLabel: "Your name",
    giftTitle: "If you would like to give",
    payId: "PayID",
    bsb: "BSB",
    accountNumber: "Account number",
    accountName: "Account name",
    copy: "Copy",
    copied: "Copied",
    registry: "View the gift registry",
    donation: "Make a donation",
    donationCelebration: "Give to a cause the hosts care about",
    noMoneyNote: "Gifts go straight to the hosts. Managevent does not handle any money.",
    wishFrom: "From {name}",
    another: "Write another",
    sending: "Sending",
    errors: {
      limit: "You have sent as many messages as this page allows.",
      off: "Messages are not open for this event.",
      generic: "Your message was not sent. It is still here: try again in a moment.",
    },
  },

  pass: {
    title: "Your passes",
    lead: "Show a pass at the door. Each one is for one person.",
    forParty: "For {name}",
    table: "Table",
    child: "Child",
    qrAlt: "QR code for the pass of {name}",
    codeLabel: "Pass code",
    codeHint: "The pass code under it can be entered at the door instead.",
    checkedIn: "Checked in",
    notEnabledTitle: "Passes are not used for this event",
    notEnabledBody: "You do not need a pass to attend. Your name will be on the list at the door.",
    emptyTitle: "No passes yet",
    emptyBody: "A pass appears here for each person once you reply that they are coming.",
    emptyAction: "Reply now",
    brightness: "Turn your screen brightness up if the code will not scan.",
  },

  /** The self-contained page returned with HTTP 410 when a host has turned a link off. */
  gone: {
    title: "This link is no longer active",
    body: "The hosts have turned this invitation link off or sent you a new one. Please check your messages for the latest link, or contact them directly.",
    credit: "Managevent Invitations",
  },

  busy: {
    title: "Please try again in a moment",
    body: "This invitation has been opened a lot in the last few minutes. Wait a minute, then reload the page.",
  },

  footer: {
    privacy: "Privacy",
    privacyNote: "Your reply goes only to the hosts.",
  },
};

export type InvitationGuestCopy = typeof invitationGuestEn;

/** The copy that changes with the tone of the event. */
export type InvitationGuestVoice = InvitationGuestCopy["celebration"];

/** Returns the guest micro-site copy for a locale. English (en-AU) is the only enabled locale. */
export function getInvitationGuest(locale: EnabledLocale): InvitationGuestCopy {
  void locale;
  return invitationGuestEn;
}

/** The celebration or memorial voice for an event's experience mode. */
export function guestVoice(
  copy: InvitationGuestCopy,
  experienceMode: ExperienceMode,
): InvitationGuestVoice {
  return experienceMode === "MEMORIAL" ? copy.memorial : copy.celebration;
}
