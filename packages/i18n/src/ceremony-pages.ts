/**
 * Copy for the content-driven pages on www.managevent.com.au: the ceremonies hub, the ceremony
 * detail template, "Perth settings we work in" and the memorials landing page (en-AU).
 *
 * The ceremony-specific words (summary, checklist, timeline, Perth notes, FAQ) live in
 * `content/ceremonies/*.json`. This module holds only the page furniture around them.
 * Read it with `getCeremonyPages(locale)` and fill `{placeholders}` with `fillCopy()`.
 *
 * Honesty rules (Australian Consumer Law): no testimonials, client names, partner venues,
 * awards, statistics or agency prices. Invitation prices are interpolated by the page through
 * `{price}` and `{guests}`. The `memorials` block follows `docs/design/MEMORIAL_MODE.md`:
 * gentle and brief, with no urgency, offers or celebratory language.
 */
import type { EnabledLocale } from "@managevent/types";

export const ceremonyPagesEn = {
  shared: {
    home: "Home",
    breadcrumbLabel: "Breadcrumb",
    ceremonies: "Ceremonies",
    venues: "Venues",
    memorials: "Memorials",
    location: "Perth, Western Australia",
    talkToUs: "Talk to us",
    callUs: "Call {phone}",
    emailUs: "Email {email}",
    seeTemplates: "See invitation templates",
    seeMemorialTemplates: "See memorial invitations",
    estimator: "Try the indicative estimator",
    memorialTag: "Memorial",
  },

  hub: {
    metaTitle: "Ceremonies and events we plan",
    metaDescription:
      "Weddings, engagements, milestone birthdays, cultural celebrations, corporate events and memorial gatherings in Perth, each planned and run by one team. See what we handle for each.",
    eyebrow: "Perth, Western Australia",
    title: "Every occasion, planned and run in Perth",
    lead: "Choose the occasion closest to yours to see what we handle, how the day usually runs and what to think about when holding it in Perth.",
    primaryCta: "Tell us about your event",
    asideTitle: "One team, start to finish",
    asidePoints: [
      "Planning, styling, hire and catering coordination",
      "Digital invitations and RSVP built in",
      "A coordinator on site on the day",
    ],
    groups: {
      weddings: {
        title: "Weddings and engagements",
        lead: "From the engagement party to the last dance, with the same planner throughout if you would like one.",
      },
      milestones: {
        title: "Birthdays, anniversaries and showers",
        lead: "Family occasions that deserve to be done properly, at home or at a venue.",
      },
      cultural: {
        title: "Cultural and traditional celebrations",
        lead: "Ceremonies that follow your traditions, planned around what your family tells us.",
      },
      corporate: {
        title: "Corporate and community events",
        lead: "Galas, award nights, launches and end-of-year events, run to a brief and a run sheet.",
      },
      memorials: {
        title: "Memorials and remembrance",
        lead: "Celebrations of life, memorial services and wakes, arranged calmly and without fuss.",
        link: "How we support memorial gatherings",
      },
    },
    cardLink: "What we handle",
    sameTitle: "What stays the same, whatever the occasion",
    same: [
      {
        title: "One planner, one plan",
        body: "You deal with one person who knows your event, and you can see the timeline and the budget as they take shape.",
      },
      {
        title: "RSVPs that size the catering",
        body: "Guests reply online for each person and note dietary needs and allergies. Those numbers go straight into catering, cake and seating.",
      },
      {
        title: "Local and on site",
        body: "We are based in Perth and work across the metro area, the Swan Valley, Fremantle and the Perth Hills. A coordinator is there on the day.",
      },
    ],
    otherTitle: "Planning something that is not listed?",
    otherBody:
      "Graduations, proposals, christenings, fundraisers and community events all use the same skills. Tell us what you have in mind and we will say honestly whether we are the right people for it.",
    otherCta: "Tell us about your event",
    settingsLink: "Perth settings we work in",
  },

  detail: {
    metaTitleSuffix: "in Perth",
    familyEyebrow: {
      CELEBRATION: "Celebrations in Perth",
      CULTURAL: "Cultural ceremonies in Perth",
      CORPORATE: "Corporate events in Perth",
      SOLEMN: "Memorial gatherings in Perth",
    },
    enquireCta: "Enquire about this occasion",
    enquireCtaMemorial: "Talk to us",
    audienceTitle: "Who it is for",
    handlesEyebrow: "What we handle",
    handlesTitle: "Everything on this list is ours to look after",
    handlesTitleMemorial: "What we take care of",
    handlesNote:
      "You can hand us all of it, or only the parts you would like off your hands. Your written quote lists exactly what is included.",
    handlesNoteMemorial:
      "You can leave all of this with us, or only the parts that would help. We will put what is included in writing.",
    asideLabel: "At a glance",
    asideGuests: "Guest numbers",
    asideSettings: "Settings",
    asideInvitation: "Invitation",
    asideInvitationValue: "Free up to {guests} guests",
    asideInvitationMemorial: "Complimentary",
    asideQuote: "Pricing",
    asideQuoteValue: "Tailored quote",
    asideQuoteMemorial: "Clear written quote",
    culturalEyebrow: "Tradition",
    culturalTitle: "Your traditions, your way",
    timelineEyebrow: "On the day",
    timelineTitle: "How the day usually runs",
    timelineLead:
      "A typical running order, measured from when guests arrive. Yours is written around your venue, your guests and the season.",
    timelineLeadMemorial:
      "A common order for the gathering, measured from when guests arrive. Yours will follow your family's wishes.",
    timeBefore: "{duration} before",
    timeStart: "Arrival",
    timeAfter: "{duration} in",
    durationHours: "{hours} hr",
    durationMinutes: "{minutes} min",
    durationBoth: "{hours} hr {minutes} min",
    localEyebrow: "Local knowledge",
    localTitle: "Planning it in Perth",
    localTitleMemorial: "Practical things to know in Perth",
    guestTitle: "How many guests?",
    guestTitleMemorial: "How many people to expect",
    settingsTitle: "Perth settings that suit",
    settingsLead:
      "Kinds of setting we plan this occasion in. They are examples, not partner venues. Venue hire is arranged with the venue itself.",
    settingsLink: "More about settings, venue hire and permits",
    invitesEyebrow: "Invitations and RSVP",
    invitesTitle: "Replies that feed the planning",
    invitesTitleMemorial: "A calm invitation and a tribute book",
    invitesPlan:
      "Digital invitations are free for up to {guests} guests. The Premium Event Pass is {price} including GST, paid once per event, and is included when we plan your event.",
    invitesPlanMemorial:
      "Memorial invitations and the tribute book are complimentary, whether or not we arrange the gathering.",
    invitesFeatures: [
      "A private link for each household",
      "Replies for each person, with dietary needs and allergies",
      "Share by WhatsApp, email or QR code",
      "A responses dashboard you can export",
    ],
    invitesFeaturesMemorial: [
      "A calm memorial design, with date, time and place set out plainly",
      "A private link for each household",
      "A tribute book where every message waits for your approval",
      "Replies and dietary needs, if you would like a guide to numbers",
    ],
    faqEyebrow: "Questions",
    faqTitle: "Questions people ask",
    faqTitleMemorial: "Questions families ask",
    relatedTitle: "Related occasions",
    relatedTitleMemorial: "Other gatherings we arrange",
    allCeremonies: "All ceremonies",
    closeTitle: "Start with a conversation",
    closeBody:
      "Tell us the date you have in mind, roughly how many guests, and what matters most. We will reply with next steps and, after we have spoken, a tailored quote. The estimator gives an indicative range in the meantime.",
    closeTitleMemorial: "When you are ready, talk to us",
    closeBodyMemorial:
      "A phone call is usually the simplest way to begin. We will ask only what we need to, and take it from there.",
  },

  venues: {
    metaTitle: "Perth settings we work in",
    metaDescription:
      "Wineries, parks, the river foreshore, beaches, heritage halls, function rooms and marquees at home: the kinds of Perth setting we plan events in, with plain guidance on venue hire and permits.",
    eyebrow: "Across greater Perth",
    title: "Perth settings we work in",
    lead: "From Swan Valley vineyards to a marquee in your own garden. These are the kinds of place we plan events in, with what each is good for and what to check before you commit.",
    primaryCta: "Ask us about a setting",
    secondaryCta: "See ceremonies we plan",
    honestyTitle: "Kinds of setting, not a venue directory",
    honestyBody:
      "We describe types of setting here, not specific venues, and none of them is presented as a partner. When you enquire, we shortlist real venues that suit your date, numbers and budget, and you see each venue's own hire fee and conditions before you decide.",
    listEyebrow: "Settings",
    listTitle: "Where Perth events are held",
    type: {
      WINERY: "Winery or estate",
      PARK_RESERVE: "Park or reserve",
      HERITAGE: "Heritage building",
      COUNCIL_HALL: "Community hall",
      FUNCTION_CENTRE: "Function centre",
      RESTAURANT: "Restaurant",
      HOTEL: "Hotel",
      PRIVATE_HOME: "Private home",
      OTHER: "Garden or estate",
    },
    indoorOutdoor: {
      INDOOR: "Indoors",
      OUTDOOR: "Outdoors",
      BOTH: "Indoors and outdoors",
    },
    permitBadge: "Booking or permit usually needed",
    suitsLabel: "Often chosen for",
    ask: "Ask about this kind of setting",
    askLabel: "Ask about this kind of setting: {name}",
    otherTitle: "Somewhere else in mind?",
    otherBody:
      "A family property, a club room, a gallery or a place that matters to you. Tell us about it and we will check access, power and the conditions before you commit.",
    otherCta: "Ask about your venue",
    guideEyebrow: "Before you commit",
    guideTitle: "Venue hire, permits and what to check",
    guide: [
      {
        title: "Venue hire is separate",
        body: "The venue sets its own hire fee, minimum spend and conditions, and your agreement for the room is with the venue. We show those costs alongside ours in your quote so you can see the whole picture.",
      },
      {
        title: "Public parks, beaches and the river",
        body: "Public parks, beaches and river reserves usually need a booking or permit from the local council or the authority that manages the land. Conditions often cover guest numbers, furniture and structures, amplified sound, confetti and vehicles. We make the application and plan within the conditions.",
      },
      {
        title: "Alcohol",
        body: "Licensed venues supply and serve alcohol under their own licence. Anywhere else, alcohol can only be sold with the right licence in place, and the people serving it need current Responsible Service of Alcohol training. We confirm the position for your venue before drinks are ordered.",
      },
      {
        title: "Weather and season",
        body: "Perth summers are hot and dry, winters are mild and wet, and the afternoon sea breeze reaches a long way inland. Every outdoor plan we write has shade for summer and a covered alternative for rain or wind.",
      },
      {
        title: "Finishing times and noise",
        body: "Most venues, councils and residential streets have a time by which music must come down or the event must end. We check it early, because it shapes the whole running order.",
      },
      {
        title: "Access",
        body: "We look at step-free access, accessible toilets, parking and the distance guests have to walk, and we tell you plainly when a setting will be difficult for some of your guests.",
      },
    ],
    closeTitle: "Have a place in mind, or no idea yet?",
    closeBody:
      "Either is a fine place to start. Tell us the occasion, the date range and your numbers, and we will suggest settings that fit.",
  },

  memorials: {
    metaTitle: "Memorial gatherings, celebrations of life and wakes",
    metaDescription:
      "Calm, respectful coordination of memorial services, celebrations of life and wakes in Perth: venue, refreshments, flowers and tribute displays, with a complimentary invitation and tribute book.",
    eyebrow: "Memorials",
    title: "Gatherings of remembrance, arranged with care",
    lead: "When someone has died, there is a great deal to do and very little time. We arrange the gathering, quietly and completely, so that you can be with your family.",
    asideTitle: "How to reach us",
    asideBody: "A phone call is usually simplest. We will keep it brief.",
    arrangeEyebrow: "How we help",
    arrangeTitle: "What we arrange",
    arrange: [
      {
        title: "A place to gather",
        body: "A hall, function room, garden or club near the service, or everything needed to gather at home.",
      },
      {
        title: "Refreshments",
        body: "Tea and coffee, finger food or a meal, served and cleared by our staff.",
      },
      {
        title: "Flowers and a tribute display",
        body: "Flowers, photographs and the belongings that bring them to mind, set out with care.",
      },
      {
        title: "Music, slideshow and sound",
        body: "Their music, a slideshow of photographs, and a microphone so that everyone can hear.",
      },
      {
        title: "Invitation and tribute book",
        body: "A calm digital invitation with the details, and a place for guests to leave a message for the family.",
      },
      {
        title: "The day itself",
        body: "We prepare the room, welcome guests, guide speakers and pack down afterwards.",
      },
    ],
    scopeEyebrow: "Our role",
    scopeTitle: "What we do, and what we do not",
    scopeDoTitle: "We arrange the gathering",
    scopeDo: [
      "Memorial services held separately from a funeral",
      "Celebrations of life",
      "Wakes and gatherings after a funeral service",
      "Anniversary and remembrance gatherings",
    ],
    scopeDontTitle: "We are not funeral directors",
    scopeDont: [
      "Care or transport of the person who has died",
      "Burial or cremation arrangements",
      "Registration of the death and related paperwork",
      "Coffins, hearses and the funeral service itself",
    ],
    scopeNote:
      "These services are provided by a funeral director. We work alongside the funeral director you choose and fit our timing around theirs.",
    kindsEyebrow: "Gatherings",
    kindsTitle: "Three kinds of gathering",
    kindsLead: "Each page sets out what we take care of and how the time usually unfolds.",
    kindsLink: "Read more",
    inviteEyebrow: "Invitation and tribute book",
    inviteTitle: "A quieter invitation, provided without charge",
    inviteBody:
      "Memorial invitations are complimentary, whether or not we arrange the gathering. The design is calm, the date, time and place are set out plainly, and each household receives a private link. Guests can reply, and can leave a message in the tribute book. You read every message first, and only those you approve are shown.",
    invitePoints: [
      "Complimentary for memorial gatherings",
      "Private links, shared by WhatsApp or email",
      "Tribute messages shown only with your approval",
      "Guest details stored in Australia",
    ],
    customEyebrow: "Faith and custom",
    customTitle: "Observances we plan around",
    customBody:
      "Families remember in many ways. Tell us about any religious or cultural observances, such as the timing of the gathering, the food that is appropriate, or how the room should be arranged, and we will follow them. We work with the minister, celebrant or elder you choose.",
    stepsEyebrow: "What happens",
    stepsTitle: "Three simple steps",
    steps: [
      {
        title: "Call or write to us",
        body: "Tell us the date and place of the service, if there is one, and roughly how many people may come.",
      },
      {
        title: "A simple plan, in writing",
        body: "We suggest a place and refreshments, and give you a clear written quote. Nothing is added later.",
      },
      {
        title: "We take care of the day",
        body: "The room is ready when guests arrive, and everything is cleared away when they leave.",
      },
    ],
    faqTitle: "Questions families ask",
    faq: [
      {
        question: "Do you provide funeral services?",
        answer:
          "No. We are not funeral directors and do not provide care of the person who has died, transport, burial or cremation. We arrange the gathering, and work alongside your funeral director.",
      },
      {
        question: "How quickly can a gathering be arranged?",
        answer:
          "Often within a few days, depending on the venue. If you are planning for a later date, there is no need to hurry.",
      },
      {
        question: "Is there a charge for the invitation and tribute book?",
        answer: "No. They are complimentary for memorial gatherings.",
      },
      {
        question: "Who sees the messages in the tribute book?",
        answer:
          "You see every message first. Only the messages you approve are shown to other guests.",
      },
      {
        question: "Can we hold the gathering at home?",
        answer:
          "Yes. We bring the refreshments, seating and staff, and take everything away afterwards.",
      },
    ],
    closeTitle: "When you are ready, talk to us",
    closeBody:
      "Call or write whenever suits you. We will ask only what we need to, and take it from there.",
  },
} as const;

export type CeremonyPagesCopy = typeof ceremonyPagesEn;

/** Returns the ceremony, venue and memorial page copy for a locale (en-AU is the only one). */
export function getCeremonyPages(locale: EnabledLocale): CeremonyPagesCopy {
  void locale;
  return ceremonyPagesEn;
}
