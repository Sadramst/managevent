/**
 * Copy for the www.managevent.com.au site structure: navigation, footer, home page and the
 * invitations, pricing, how-it-works, services, about, contact and FAQ pages, plus the page
 * furniture for the legal documents and the "page not found" page (en-AU).
 *
 * Kept as its own module (like `launch.ts`) so page copy can grow without touching the shared
 * dictionary. Read it with `getSitePages(locale)`; fill `{placeholders}` with `fillCopy()`.
 *
 * Honesty rules (Australian Consumer Law): no testimonials, client names, partner venues, awards,
 * statistics or agency prices live here. Invitation prices are never written into this copy:
 * pages interpolate them from `@managevent/payments` plan config through `{price}` and `{guests}`.
 */
import type { EnabledLocale } from "@managevent/types";

export const sitePagesEn = {
  nav: {
    ceremonies: "Ceremonies",
    services: "Services",
    invitations: "Invitations",
    pricing: "Pricing",
    about: "About",
    venues: "Venues",
    memorials: "Memorials",
    howItWorks: "How it works",
    faq: "FAQ",
    contact: "Contact",
    home: "Home",
    breadcrumbLabel: "Breadcrumb",
    footerPlan: "Plan an event",
    footerCompany: "Managevent",
    footerTagline:
      "Event planning, styling, hire and catering coordination in Perth, with digital invitations and RSVP built in.",
    invitationSite: "Create an invitation",
    invitationTemplates: "Invitation templates",
  },

  shared: {
    talkToUs: "Talk to us",
    sendEnquiry: "Send an enquiry",
    createInvitation: "Create your invitation",
    browseTemplates: "Browse templates",
    seePricing: "See pricing",
    seeHowItWorks: "See how it works",
    seeServices: "See our services",
    seeInvitations: "About our invitations",
    openEstimator: "Try the indicative estimator",
    readFaq: "Read the FAQ",
    included: "Included",
    notIncluded: "Not included",
    inclGst: "incl. GST",
    ctaTitle: "Tell us what you are planning",
    ctaBody:
      "Share the occasion, a rough date and how many people you expect. It is fine if the details are still taking shape.",
    relatedTitle: "Keep exploring",
  },

  home: {
    metaTitle: "Managevent | Event planning and digital invitations in Perth",
    metaDescription:
      "Managevent plans, styles and runs weddings, milestone celebrations, corporate events and memorial gatherings in Perth, with digital invitations and RSVP that keep catering numbers accurate.",
    heroBadge: "Perth, Swan Valley, Fremantle and the Perth Hills",
    heroLead:
      "We plan, style and run events in Perth from the first conversation to pack-down. Your invitations and RSVPs sit in the same place, so the numbers your caterer works from are the numbers your guests gave.",
    heroPrimary: "Start planning your event",
    heroSecondary: "See how it works",
    heroCardTitle: "What we take care of",
    heroCardItems: [
      "Planning and on-the-day coordination",
      "Styling, florals and hire",
      "Catering coordination and dietary needs",
      "Digital invitations, RSVP and check-in",
    ],
    quickSelectTitle: "What ceremony or celebration are you planning?",
    quickSelectItems: [
      { label: "Weddings & Engagements", href: "/ceremonies/wedding" },
      { label: "Milestone Birthdays", href: "/ceremonies/birthday-milestone" },
      { label: "Corporate Galas & Dinners", href: "/ceremonies/gala-dinner" },
      { label: "Cultural Ceremonies", href: "/ceremonies/cultural-celebration" },
      { label: "Memorials & Wakes", href: "/memorials" },
    ],
    perthPillarsTitle: "Every celebration in Perth, from 0 to 100",
    perthPillars: [
      {
        title: "Perth-Wide Settings",
        body: "Swan Valley wineries, Kings Park, Fremantle heritage halls, riverside foreshores and private homes.",
      },
      {
        title: "Full 0-to-100 Service",
        body: "Concept, styling, florals, marquee hire, catering coordination and on-the-day staffing.",
      },
      {
        title: "Connected Invitations & RSVP",
        body: "Guest headcount, dietary requirements and allergy splits feed directly into your catering plan.",
      },
      {
        title: "Transparent AUD Pricing",
        body: "Clear quotes in Australian dollars including 10% GST with no hidden supplier markups.",
      },
    ],
    occasionsEyebrow: "Occasions",
    occasionsTitle: "Whatever you are gathering for",
    occasionsLead:
      "A dinner for thirty at home, a wedding in the Swan Valley, a company evening in the city or a gathering to remember someone. The scale changes; the care does not.",
    occasionsLink: "See all ceremonies",
    families: [
      {
        key: "celebration",
        title: "Weddings and milestones",
        body: "Weddings, engagements, milestone birthdays, anniversaries, showers and graduations.",
        link: "Celebrations",
        href: "/ceremonies#weddings",
      },
      {
        key: "cultural",
        title: "Cultural and family ceremonies",
        body: "Traditions honoured properly, with menus, timings and styling shaped around your family's customs.",
        link: "Cultural ceremonies",
        href: "/ceremonies#cultural",
      },
      {
        key: "corporate",
        title: "Corporate and community",
        body: "End-of-year dinners, launches, award nights, fundraisers and community hall events.",
        link: "Corporate events",
        href: "/ceremonies#corporate",
      },
      {
        key: "memorial",
        title: "Memorials and wakes",
        body: "Calm, respectful coordination for memorial gatherings, wakes and celebrations of life, alongside your funeral director.",
        link: "Memorial support",
        href: "/memorials",
      },
    ],
    servicesEyebrow: "What we do",
    servicesTitle: "One team for the whole event",
    servicesLead:
      "Instead of briefing ten suppliers yourself, you brief us once. We coordinate the rest and keep you updated in plain language.",
    servicesLink: "See each service in detail",
    invitationsEyebrow: "Digital invitations and RSVP",
    invitationsTitle: "Invitations that feed your planning",
    invitationsLead:
      "Build an invitation from a template, share a private link with each household and collect RSVPs with dietary and allergy needs for every person. Free for up to {guests} guests.",
    invitationsPoints: [
      {
        title: "Send",
        body: "Share private links by WhatsApp, email or QR code.",
      },
      {
        title: "Collect",
        body: "Each guest replies for their household and tells you what they can eat.",
      },
      {
        title: "Use",
        body: "When we run your event, those numbers go straight into catering, seating and hire.",
      },
    ],
    invitationsNote:
      "Premium Event Pass is {price} incl. GST, once per event. Complimentary for memorials and included when we run your event.",
    estimatorEyebrow: "Indicative only",
    estimatorTitle: "Get a rough sense of budget",
    estimatorLead:
      "This estimator gives a broad guide in Australian dollars including GST. It is not a quote. Every event is priced after a conversation, and your written proposal is the only figure that counts.",
    estimatorLink: "How our pricing works",
    estimatorBadge: "Indicative guide, not a quote",
    estimatorMemorialBadge: "Indicative guide for a memorial gathering",
    estimatorGuestsUnit: "{count} guests",
    estimatorLogisticsTitle: "What that guest count usually means",
    estimatorDisclaimer:
      "Indicative guide only, in AUD including GST. These figures are working assumptions, not published rates. Your price is confirmed in a written proposal after a free consultation and a look at the venue.",
    settingsEyebrow: "Across greater Perth",
    settingsTitle: "Perth settings we work in",
    settingsLead:
      "Already have a venue, or hosting at home? We come to you. Still looking? We help you shortlist places that suit your numbers and budget. Venue hire is booked with the venue itself, and parks and foreshores need approval from the authority that manages them.",
    settingsAsk: "Ask about this kind of setting",
    settingsLink: "More about venues and permits",
    settings: {
      "swan-valley-winery": {
        name: "Swan Valley wineries",
        area: "Swan Valley",
        kind: "Winery or estate",
        body: "Vineyard ceremonies and long-table receptions. Most estates have their own catering and curfew rules, which we plan around.",
      },
      "kings-park-setting": {
        name: "Kings Park lawns and gardens",
        area: "Kings Park",
        kind: "Park or reserve",
        body: "Outdoor ceremonies with city and river views. Bookings and approvals are made with the park's managing authority.",
      },
      "matilda-bay-foreshore": {
        name: "Matilda Bay foreshore",
        area: "Crawley",
        kind: "Park or reserve",
        body: "Riverside ceremonies at sunset. A permit is needed, and a wet-weather plan is part of every outdoor brief.",
      },
      "fremantle-heritage-hall": {
        name: "Fremantle heritage halls and warehouses",
        area: "Fremantle",
        kind: "Heritage space",
        body: "Character rooms that suit banquets and cocktail evenings. Heritage rules shape what can be hung, lit and moved.",
      },
      "joondalup-community-hall": {
        name: "Council and community halls",
        area: "Joondalup, Canning, Melville and beyond",
        kind: "Community hall",
        body: "Good value for larger family gatherings. Councils set their own bond, insurance and finishing-time conditions.",
      },
      "luxury-backyard-marquee": {
        name: "Marquees at home",
        area: "Perth metro",
        kind: "Private home",
        body: "Your own garden, with a marquee, flooring, lighting and hire brought in. We check access, power and neighbour notice first.",
      },
      "riverside-function-centre": {
        name: "City and riverside function rooms",
        area: "Perth CBD",
        kind: "Function centre",
        body: "Larger rooms for dinners, award nights and conferences, usually with in-house catering and audio-visual.",
      },
    },
    processEyebrow: "How it works",
    processTitle: "From the first conversation to the last detail",
    processSteps: [
      {
        title: "We listen",
        body: "Tell us the occasion, the rough date, the number of guests and what matters most to you.",
      },
      {
        title: "We plan",
        body: "You receive a written proposal with a total price including GST, then we book and brief every supplier.",
      },
      {
        title: "We run the day",
        body: "A coordinator is on site from set-up to pack-down, so you can be with your guests.",
      },
    ],
    processLink: "See the full process",
    faqLink: "Common questions",
    enquiryEyebrow: "Perth, Western Australia",
  },

  services: {
    metaTitle: "Event planning, styling, catering and hire in Perth",
    metaDescription:
      "The six things Managevent does for events in Perth: planning and coordination, styling and florals, catering coordination, hire, entertainment and suppliers, and digital invitations with check-in.",
    eyebrow: "Services",
    title: "Everything an event needs, coordinated by one team",
    lead: "Take the whole service or only the parts you need. Each one is scoped with you and priced in a written proposal, including GST.",
    heroCardTitle: "Six services",
    jumpLabel: "Jump to a service",
    deliveredBy: "Who does the work",
    includesLabel: "What this covers",
    quoteNote:
      "We do not publish package prices because no two events cost the same. Tell us about yours and we will send a tailored quote.",
    items: [
      {
        id: "planning",
        title: "Planning and on-the-day coordination",
        summary:
          "One coordinator who knows the whole plan, from the first budget conversation to the last chair being stacked.",
        includes: [
          "A consultation to understand the occasion, guests and budget",
          "A written proposal and a running budget",
          "A timeline and run sheet shared with every supplier",
          "Supplier bookings, briefings and confirmations",
          "On-site coordination from set-up to pack-down",
          "A wet-weather plan for outdoor events",
        ],
        deliveredBy: "Managevent coordinators.",
      },
      {
        id: "styling",
        title: "Styling, florals and ceremony sets",
        summary:
          "A look that suits the occasion and the room: arches and backdrops, table styling, florals and signage.",
        includes: [
          "A styling direction agreed with you before anything is ordered",
          "Ceremony arches, backdrops and plinths",
          "Table styling, linen and place settings",
          "Bouquets, centrepieces and floral installations",
          "Welcome signs, seating charts and place cards",
          "Set-up before guests arrive and removal afterwards",
        ],
        deliveredBy: "Managevent stylists, working with Perth florists and suppliers.",
      },
      {
        id: "catering",
        title: "Catering coordination and dietary care",
        summary:
          "We brief the caterer with real numbers and real dietary needs, so nobody is left without a meal they can eat.",
        includes: [
          "Help choosing a service style: plated, shared banquet, buffet or cocktail",
          "Menus that respect halal, vegetarian, vegan and gluten-free needs",
          "Children's meals and supplier meals counted separately",
          "Severe allergies flagged to the caterer by table, not only as a total",
          "Final numbers confirmed with the caterer before the event",
          "Cakes and dessert tables arranged with local makers",
        ],
        deliveredBy:
          "Licensed Perth caterers and venue kitchens, briefed and coordinated by Managevent. Food is prepared by the caterer, not by us.",
      },
      {
        id: "hire",
        title: "Furniture, marquee and equipment hire",
        summary:
          "The practical things that turn a space into a venue, delivered, set up and collected.",
        includes: [
          "Tables, chairs, linen and tableware",
          "Marquees, flooring and dance floors",
          "Staging, lecterns and easels",
          "Lighting, sound systems and microphones",
          "Delivery, set-up and collection planned around venue access times",
          "Quantities sized from your guest numbers",
        ],
        deliveredBy: "Managevent and Perth hire companies.",
      },
      {
        id: "entertainment",
        title: "Photography, music and other suppliers",
        summary:
          "We find, brief and manage the people who make the day memorable, and make sure they know the timeline.",
        includes: [
          "Photographers and videographers",
          "DJs, live musicians and MCs",
          "Children's entertainers",
          "Wait staff and bar staff with the right certificates for alcohol service",
          "Transport and guest shuttles",
          "One run sheet so every supplier works to the same times",
        ],
        deliveredBy: "Independent Perth suppliers, booked and coordinated by Managevent.",
      },
      {
        id: "invitations",
        title: "Digital invitations, RSVP and check-in",
        summary:
          "Our own invitation tool, included with every event we run. Guests reply online and you see every response in one place.",
        includes: [
          "An invitation built from a template in your colours and wording",
          "A private link for each household",
          "RSVP with dietary and allergy needs for each person, collected with consent and encrypted",
          "A responses dashboard and CSV export",
          "QR passes and check-in at the door",
          "Wishing well details, or a moderated tribute book for memorials",
        ],
        deliveredBy: "The Managevent platform, hosted in Australia.",
      },
    ],
    bridgeTitle: "Why the invitation matters to the catering",
    bridgeBody:
      "When guests RSVP through a Managevent invitation, their numbers and dietary needs are already where your coordinator works. That is how the meal count, the table plan and the hire order stay in step with who is actually coming.",
  },

  howItWorks: {
    metaTitle: "How it works: planning an event in Perth",
    metaDescription:
      "The steps from first enquiry to pack-down: consultation, written proposal, booking, planning, invitations, final numbers, the event day and afterwards.",
    eyebrow: "How it works",
    title: "From 0 to 100, one clear step at a time",
    lead: "You always know what happens next, what it costs and who is doing it. Here is the path most events follow.",
    heroCardTitle: "The short version",
    heroCardItems: ["Talk", "Proposal", "Plan", "Invite", "Host", "Pack down"],
    stepsTitle: "The process",
    steps: [
      {
        title: "Enquiry",
        body: "Send us the occasion, a rough date, guest numbers and anything you already know. A Perth coordinator replies by email or phone.",
      },
      {
        title: "Consultation",
        body: "A free conversation by phone, video or in person. We talk through what you want, what it might cost and what is realistic for your date.",
      },
      {
        title: "Written proposal",
        body: "You receive a proposal that sets out what is included, the total price including GST, the payment dates and the cancellation terms. Nothing is booked until you agree.",
      },
      {
        title: "Booking",
        body: "A deposit holds your date. The amount and when the rest is due are in your proposal, so there are no surprises later.",
      },
      {
        title: "Planning",
        body: "We book and brief suppliers, agree the styling, build the timeline and keep the budget up to date. You approve the decisions that matter.",
      },
      {
        title: "Invitations and RSVPs",
        body: "Your digital invitation goes out. Guests reply online with who is coming and what they can eat, and you can watch responses arrive.",
      },
      {
        title: "Final numbers",
        body: "Before the event we confirm final guest numbers and dietary needs with the caterer, and adjust seating and hire to match.",
      },
      {
        title: "Event day",
        body: "Your coordinator manages set-up, suppliers, timing and guest check-in, then stays until everything is packed away.",
      },
      {
        title: "Afterwards",
        body: "Hire is returned, final accounts are settled and your guest information is deleted on our retention schedule.",
      },
    ],
    timelineTitle: "A typical timeline",
    timelineLead:
      "Every event is different, and memorial gatherings are often arranged in days rather than months. For a planned celebration, this is a common shape. Your proposal sets the actual dates.",
    timeline: [
      {
        when: "As early as you can",
        what: "Enquiry, consultation and written proposal. Popular dates and venues go first.",
      },
      {
        when: "Once you agree",
        what: "Deposit paid, date held, coordinator assigned and suppliers booked.",
      },
      {
        when: "About 8 weeks before",
        what: "Wedding invitations sent. For parties and smaller gatherings, about 3 weeks is usual.",
      },
      {
        when: "About 2 weeks before",
        what: "Final guest numbers and dietary needs confirmed with the caterer.",
      },
      {
        when: "The week before",
        what: "Order locked, run sheet confirmed with every supplier and check-in list prepared.",
      },
      {
        when: "The day",
        what: "Set-up, check-in, the event itself and pack-down.",
      },
    ],
    memorialTitle: "When there is very little time",
    memorialBody:
      "Memorial gatherings and wakes are usually arranged within days. We keep the steps short, ask only what we need and work alongside your funeral director.",
    memorialLink: "Memorial support",
  },

  invitations: {
    metaTitle: "Digital invitations and RSVP for Australian events",
    metaDescription:
      "Create a digital invitation from a template, share private links by WhatsApp, email or QR code and collect RSVPs with dietary needs. Free for small events; Premium Event Pass is a one-off price per event.",
    eyebrow: "Digital invitations and RSVP",
    title: "Invitations your guests can answer in a minute",
    lead: "Pick a template, add your details and share a private link with each household. Replies, dietary needs and allergies arrive in one tidy dashboard. Free for up to {guests} guests.",
    heroCardTitle: "You are invited",
    heroCardLines: ["A private link for every household", "RSVP in a minute", "No app to install"],
    stepsEyebrow: "How it works",
    stepsTitle: "Four steps from blank page to guest list",
    steps: [
      {
        title: "Choose a template",
        body: "Start from a designed template and theme rather than a blank page. Add your names, date, place and wording.",
      },
      {
        title: "Add your guests",
        body: "Type households in or import a CSV file. Each household gets its own private link.",
      },
      {
        title: "Share the links",
        body: "Send by WhatsApp or email, or print a QR code. Guests open the invitation in their browser.",
      },
      {
        title: "Watch replies arrive",
        body: "See who is coming, who is not and what each person can eat. Export the list as a CSV whenever you need it.",
      },
    ],
    featuresEyebrow: "What is included",
    featuresTitle: "Built for real guest lists",
    features: [
      {
        title: "Template-first studio",
        body: "Begin with a finished design and change the words, not the layout.",
      },
      {
        title: "Themes, including Memorial Mode",
        body: "Warm themes for celebrations and a calm, respectful mode for memorials.",
      },
      {
        title: "Guest list with CSV import",
        body: "Bring your list from a spreadsheet and group people by household.",
      },
      {
        title: "Private per-household links",
        body: "Every household has its own link, so only invited guests see the details.",
      },
      {
        title: "WhatsApp, email and QR sharing",
        body: "Share the way your family already talks to each other.",
      },
      {
        title: "RSVP with dietary and allergy needs",
        body: "Collected for each person, with their consent, and encrypted because it is health information.",
      },
      {
        title: "Responses dashboard and export",
        body: "A live count of replies and a CSV export for your caterer or venue.",
      },
      {
        title: "Add to calendar",
        body: "Guests save the date and place to their own calendar in one tap.",
      },
      {
        title: "QR passes and door check-in",
        body: "Each guest gets a QR pass and you check people in at the door from your phone. Part of Premium.",
      },
      {
        title: "Wishing well or tribute book",
        body: "Share wishing well details for a celebration, or collect moderated messages of remembrance.",
      },
    ],
    bridgeEyebrow: "The RSVP-to-catering bridge",
    bridgeTitle: "Your RSVPs become your catering numbers",
    bridgeLead:
      "Most invitation tools stop at a list of names. When Managevent also runs your event, the replies do more work.",
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
      "Using the invitation on its own? Export your responses as a CSV and hand them to your caterer or venue.",
    memorialEyebrow: "Memorial Mode",
    memorialTitle: "A quieter invitation for remembering someone",
    memorialBody:
      "For funerals, memorial services, wakes and celebrations of life, the invitation changes with the occasion. The colours are calm, the wording is gentle, and there are no countdowns or offers. Guests can leave a message in a tribute book, which the family reviews before anything is shown.",
    memorialPoints: [
      "Complimentary for memorial events",
      "Date, time and place first, with directions",
      "A moderated tribute book in place of a wishing well",
    ],
    memorialLink: "How we support memorial gatherings",
    plansEyebrow: "Plans",
    plansTitle: "Simple pricing, once per event",
    plansLead:
      "No subscription. Prices are in Australian dollars and include GST. Start free and upgrade only if your event needs it.",
    plansCaption: "Invitation plans compared",
    plansScrollHint: "Swipe sideways to compare all four plans.",
    plansFeatureHeading: "Feature",
    plans: {
      free: {
        name: "Free",
        price: "$0",
        note: "For small gatherings of up to {guests} guests.",
      },
      premium: {
        name: "Premium Event Pass",
        price: "{price}",
        note: "Paid once per event. No subscription.",
      },
      memorial: {
        name: "Memorials",
        price: "Complimentary",
        note: "Premium features at no charge for memorial events.",
      },
      agency: {
        name: "With an agency package",
        price: "Included",
        note: "Part of any event Managevent plans and runs for you.",
      },
    },
    planRows: {
      price: "Price",
      guests: "Guests",
      studio: "Template studio and themes",
      links: "Private per-household links",
      sharing: "WhatsApp, email and QR sharing",
      rsvp: "RSVP with dietary and allergy needs",
      dashboard: "Responses dashboard and CSV export",
      calendar: "Add to calendar",
      checkin: "QR passes and door check-in",
      bridge: "Catering, seating and hire sized by your coordinator",
    },
    planValues: {
      guestsUpTo: "Up to {guests}",
      unlimited: "Unlimited",
      oneOff: "{price} incl. GST, one-off",
      free: "$0",
      complimentary: "Complimentary",
      includedInPackage: "Included",
    },
    plansFootnote:
      "Memorial events receive Premium features at no charge. Agency packages are quoted separately; the invitation is included in that quote.",
    ctaTitle: "Start with a template",
    ctaBody: "Choose a design, add your details and have a link ready to share today.",
  },

  pricing: {
    metaTitle: "Pricing: invitation plans and tailored event quotes",
    metaDescription:
      "How Managevent pricing works. Digital invitations are free for small events, with a one-off Premium Event Pass per event. Event planning in Perth is priced by tailored quote, including GST.",
    eyebrow: "Pricing",
    title: "Clear prices, and honest quotes",
    lead: "Our invitation tool has fixed prices you can see here. Planning and running an event is different every time, so that is always a tailored quote. Every price we give you includes GST.",
    heroCardTitle: "Two ways to work with us",
    heroCardItems: [
      "Invitations: fixed price per event",
      "Full events: tailored written quote",
      "Always in AUD, always including GST",
    ],
    invitationsEyebrow: "Digital invitations",
    invitationsTitle: "Invitation plans",
    invitationsLead:
      "One price per event, not a subscription. Start free and upgrade only if you need to.",
    invitationsLink: "Compare every feature",
    agencyEyebrow: "Planning and running your event",
    agencyTitle: "A tailored quote, not a price list",
    agencyLead:
      "We do not publish package prices, because a number that suits one event misleads the next. After a free consultation you receive a written proposal with one total, including GST.",
    driversTitle: "What drives the cost",
    drivers: [
      {
        title: "Guest numbers",
        body: "Catering, seating, tableware and staff all scale with the number of people.",
      },
      {
        title: "The services you choose",
        body: "Coordination only costs less than full planning, styling, catering and hire.",
      },
      {
        title: "Catering style",
        body: "A plated dinner needs more staff and equipment than a buffet or cocktail service.",
      },
      {
        title: "Venue and location",
        body: "Venue hire, access, power and travel beyond the Perth metropolitan area all affect the total.",
      },
      {
        title: "Styling and florals",
        body: "Seasonal flowers and existing hire stock cost less than custom-built pieces.",
      },
      {
        title: "Date and lead time",
        body: "Peak-season dates and short notice limit supplier choice, which can raise costs.",
      },
    ],
    estimatorTitle: "Want a rough idea first?",
    estimatorBody:
      "The estimator on our home page gives an indicative range for your occasion and guest count. It is a guide to start the conversation, not a quote and not an offer.",
    paymentsEyebrow: "Paying for an event",
    paymentsTitle: "Deposits, payments and your rights",
    payments: [
      {
        title: "Everything in writing first",
        body: "Your proposal sets out what is included, the total price including GST, when each payment is due and the cancellation terms. You see all of it before you pay anything.",
      },
      {
        title: "A deposit holds your date",
        body: "The deposit amount and the payment dates are in your proposal. The balance is adjusted to your final guest numbers, which we confirm with you before the event.",
      },
      {
        title: "Fair cancellation terms",
        body: "Any cancellation fee is tied to costs we have actually incurred or committed for your event, and the schedule is shown to you before you pay.",
      },
      {
        title: "No surprise fees",
        body: "Mandatory costs such as travel outside the metropolitan area are in the quote, not added at the end.",
      },
      {
        title: "Tax invoices",
        body: "Every payment is recorded on a tax invoice that shows the GST amount.",
      },
      {
        title: "Australian Consumer Law",
        body: "Nothing in our terms removes your rights or the consumer guarantees under the Australian Consumer Law.",
      },
    ],
    termsLink: "Read the website terms",
    websiteNote:
      "No payment for event services is taken through this website. An enquiry is not a booking.",
  },

  about: {
    metaTitle: "About Managevent: a Perth event team and platform",
    metaDescription:
      "Managevent is a Perth event planning service and an Australian-hosted invitation platform, built by Appilico. What we do, what we value and how we look after your guests' information.",
    eyebrow: "About",
    title: "A Perth team that plans the event and builds the tools",
    lead: "Managevent brings two things together that are usually separate: people who plan and run events in Perth, and the software that handles invitations, RSVPs and check-in.",
    heroCardTitle: "Managevent",
    heroCardLines: ["Perth, Western Australia", "Events and invitations", "A product by Appilico"],
    storyTitle: "Why we exist",
    story: [
      "Anyone who has organised a wedding or a family gathering knows the pattern. The guest list lives in one place, the caterer's numbers in another, and the person hosting ends up as the messenger between ten suppliers.",
      "We built Managevent to close that gap. The invitation your guests answer is connected to the plan your coordinator works from, so the headcount, the dietary needs and the seating come from the same source.",
      "We are a new business, based in Perth and focused on Western Australia first. We would rather grow carefully than promise more than we can deliver, which is why you will not find borrowed reviews, stock photos of events we did not run, or prices we cannot stand behind on this site.",
    ],
    valuesEyebrow: "What we value",
    valuesTitle: "How we work",
    values: [
      {
        title: "Plain dealing",
        body: "One total price including GST, written down before you pay. No fees that appear at the end.",
      },
      {
        title: "Calm on the day",
        body: "A written plan, a run sheet every supplier shares and a coordinator on site, so problems are solved quietly.",
      },
      {
        title: "Respect for every occasion",
        body: "A wedding and a wake need different things. Memorial gatherings are handled in Memorial Mode: gentle wording, no promotions, no hurry.",
      },
      {
        title: "Every guest considered",
        body: "Dietary needs, allergies, access and family customs are asked about early and passed on properly.",
      },
    ],
    dataEyebrow: "Privacy",
    dataTitle: "Your guests' information stays in Australia",
    dataBody: [
      "Guests are not our customers, so we collect only what they need to reply. Core records are stored in Sydney, Australia.",
      "Dietary and allergy details are health information. We ask for consent, encrypt them, limit them to the event they were given for and delete them on a retention schedule.",
      "Private invitation links are not listed anywhere and are kept out of search engines. We do not sell personal information or run advertising trackers on this site.",
    ],
    dataLink: "Read the privacy policy",
    accessEyebrow: "Accessibility",
    accessTitle: "Built to be used by everyone",
    accessBody:
      "We aim to meet WCAG 2.2 Level AA across our sites: keyboard navigation, visible focus, labelled forms, strong contrast and reduced motion when your device asks for it. Invitation pages show the essentials, who, when and where, even without JavaScript. If something gets in your way, tell us and we will help.",
    accessLink: "Read the accessibility statement",
    appilicoTitle: "A product by Appilico",
    appilicoBody:
      "Managevent's platform is designed and built by Appilico, an Australian software studio. The event team and the software team work from the same plan.",
    scopeTitle: "What we do not do",
    scopeBody:
      "We coordinate memorial gatherings and wakes, but we are not funeral directors and do not provide care of the deceased. We coordinate licensed caterers and venues rather than preparing food or serving alcohol ourselves.",
  },

  contact: {
    metaTitle: "Contact Managevent: event enquiries in Perth",
    metaDescription:
      "Talk to Managevent about a wedding, celebration, corporate event or memorial gathering in Perth. Send an enquiry, email or call. The first conversation is free.",
    eyebrow: "Contact",
    title: "Talk to us about your event",
    lead: "Tell us what you are planning and a Perth coordinator will get back to you. The first conversation is free and there is no obligation.",
    detailsTitle: "Contact details",
    areaLabel: "Based in",
    areaValue: "Perth, Western Australia",
    serviceAreaLabel: "We work across",
    serviceAreaValue: "Perth metro, Swan Valley, Fremantle, Perth Hills and Peel",
    nextTitle: "What happens next",
    next: [
      "We read your enquiry and reply by email or phone.",
      "We arrange a free consultation at a time that suits you.",
      "You receive a written proposal with a total price including GST.",
    ],
    memorialTitle: "Arranging a memorial or wake?",
    memorialBody:
      "If time is short, phone us. We will keep it brief and ask only what we need to help.",
    invitationTitle: "Only need an invitation?",
    invitationBody: "You can create one yourself on our invitation site, free for small events.",
    formEyebrow: "Enquiry",
  },

  faq: {
    metaTitle: "Frequently asked questions",
    metaDescription:
      "Answers about planning an event with Managevent in Perth, digital invitations and RSVP, privacy and where data is stored, and how quotes, deposits and payments work.",
    eyebrow: "FAQ",
    title: "Questions people ask us",
    lead: "Straight answers about planning, invitations, privacy and payments. If yours is not here, ask us directly.",
    groups: [
      {
        id: "planning",
        title: "Planning an event",
        items: [
          {
            q: "What kinds of events do you plan?",
            a: "Weddings and engagements, milestone birthdays and anniversaries, cultural and family ceremonies, corporate and community events, and memorial gatherings, wakes and celebrations of life.",
          },
          {
            q: "Which areas do you cover?",
            a: "Perth and the surrounding region: the metropolitan area, Swan Valley, Fremantle, the Perth Hills and Peel. Events further afield are possible, with travel included in your quote.",
          },
          {
            q: "Do I have to take the full service?",
            a: "No. Some people want everything planned for them; others have a venue and caterer and only need coordination on the day, styling or hire. We scope the proposal around what you need.",
          },
          {
            q: "Can you work with a venue or supplier I have already booked?",
            a: "Yes. Tell us who you have booked and we will plan around them and include them in the run sheet.",
          },
          {
            q: "Do you own or recommend particular venues?",
            a: "We do not own venues and we do not list partner venues on this site. We help you shortlist settings that suit your numbers and budget. Venue hire is agreed with the venue, and outdoor sites such as parks and foreshores need approval from the authority that manages them.",
          },
          {
            q: "How far ahead should I get in touch?",
            a: "As early as you can for weddings and large events, because venues and popular dates book out. Smaller gatherings can come together in a few weeks, and memorial gatherings are usually arranged within days.",
          },
        ],
      },
      {
        id: "invitations",
        title: "Invitations and RSVP",
        items: [
          {
            q: "Can I use the invitations without booking an event with you?",
            a: "Yes. The invitation tool is available to anyone at invitation.managevent.com.au. It is free for up to {guests} guests, and the Premium Event Pass is {price} including GST, paid once per event.",
          },
          {
            q: "Do my guests need an account or an app?",
            a: "No. Each household receives a private link that opens in their browser. They reply for the people in their household without signing up for anything.",
          },
          {
            q: "How do guests tell me about dietary needs?",
            a: "The RSVP asks each person about dietary requirements and allergies, with their consent. You see the totals on your dashboard and can export the list for your caterer.",
          },
          {
            q: "What does it cost for a memorial?",
            a: "Nothing. Memorial events receive Premium features at no charge, and the invitation is shown in Memorial Mode with calm colours, gentle wording and a moderated tribute book.",
          },
        ],
      },
      {
        id: "privacy",
        title: "Privacy and data",
        items: [
          {
            q: "Where is guest information stored?",
            a: "Core records are stored in Sydney, Australia. Email delivery may involve processing outside Australia, which our privacy policy explains.",
          },
          {
            q: "How do you protect dietary and allergy details?",
            a: "They are health information, so we treat them as sensitive. We collect them only with consent, encrypt them, use them only for the event they were given for and delete them on a retention schedule.",
          },
          {
            q: "Can someone find my invitation through a search engine?",
            a: "No. Guest links are private, hard to guess, not listed anywhere and marked so that search engines do not index them.",
          },
        ],
      },
      {
        id: "payments",
        title: "Quotes and payments",
        items: [
          {
            q: "Why are there no package prices on the site?",
            a: "Because the cost depends on guest numbers, the services you choose, the venue and the date. A published price would be wrong for most people. You receive a tailored written quote instead, and the estimator on the home page gives an indicative range.",
          },
          {
            q: "Do your prices include GST?",
            a: "Yes. Every price we show or quote to you is in Australian dollars and includes GST, and your tax invoice shows the GST amount.",
          },
          {
            q: "How do deposits and cancellations work?",
            a: "A deposit holds your date. The amount, the payment dates and the cancellation schedule are set out in your written proposal before you pay. Any cancellation fee reflects costs actually incurred or committed, and nothing removes your rights under the Australian Consumer Law.",
          },
        ],
      },
    ],
    ctaTitle: "Still have a question?",
    ctaBody: "Ask us directly. There is no obligation and the first conversation is free.",
  },

  legal: {
    eyebrow: "Legal",
    contactTitle: "Questions about this page?",
    contactBody: "Email or phone us and a person will reply.",
    relatedLabel: "Related documents",
    documents: {
      privacy: {
        lead: "What we collect when you enquire, where it is stored and the choices you have.",
        metaDescription:
          "How Managevent collects, stores and uses the details you send through this website, where they are kept, and how to ask for access, correction or deletion.",
      },
      terms: {
        lead: "What an enquiry means, how services are agreed in writing and the rights you keep.",
        metaDescription:
          "The terms for using www.managevent.com.au: what an enquiry is and is not, how services and prices are agreed in writing, and your rights under the Australian Consumer Law.",
      },
      accessibility: {
        lead: "How this site is built to be used by everyone, and how to tell us when it falls short.",
        metaDescription:
          "Managevent aims to meet WCAG 2.2 Level AA. How this website supports keyboard, screen reader and reduced-motion use, and how to tell us about a barrier.",
      },
    },
  },

  notFound: {
    metaTitle: "Page not found",
    eyebrow: "Page not found",
    body: "The page may have moved, or the address may have been mistyped. These are the places people usually look for.",
    home: "Back to the home page",
    linksLabel: "Popular pages",
  },
};

export type SitePagesCopy = typeof sitePagesEn;

/** Returns the site-structure copy for a locale. English (en-AU) is the only enabled locale. */
export function getSitePages(locale: EnabledLocale): SitePagesCopy {
  void locale;
  return sitePagesEn;
}

/** Replaces `{token}` placeholders in a copy string. Unknown tokens are left as written. */
export function fillCopy(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token: string) => {
    const value = params[token];
    return value !== undefined ? String(value) : match;
  });
}
