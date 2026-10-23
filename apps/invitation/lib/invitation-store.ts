import type { DietaryTag, ExperienceMode } from "@managevent/types";
import { generateEventSalt, generateEventSlug, generateGuestToken, isValidGuestTokenFormat } from "./tokens";
import type {
  EventModel,
  EventResponsesSummary,
  GuestMember,
  GuestParty,
  RsvpSubmissionPayload,
} from "./types";

const PEPPER = process.env.GUEST_TOKEN_PEPPER || "managevent-local-dev-pepper-default-salt";
const SALT_ANNIVERSARY = "salt_appilico_anniversary_2026_x89a";

const SEED_EVENTS: EventModel[] = [
  {
    id: "evt_anniversary_10",
    slug: "anniversary",
    title: "Niloofar & Sadra — 10th Anniversary",
    ceremonySlug: "wedding",
    experienceMode: "CELEBRATION",
    themeId: "royal-ivory",
    templateSlug: "classic-romance",
    gateStyle: "wax-seal",
    plan: "PREMIUM",
    startsAt: "2026-09-18T18:30:00+08:00",
    endsAt: "2026-09-18T23:30:00+08:00",
    timeZone: "Australia/Perth",
    languages: ["en", "fa"],
    defaultLanguage: "en",
    rsvpDeadline: "2026-09-01T23:59:59+08:00",
    venue: {
      name: "The Grand Estate & Ballroom",
      address: "128 Royal Parade, Parkville VIC 3052, Australia",
      googleMapsUrl: "https://maps.google.com/?q=Royal+Parade+Parkville",
      appleMapsUrl: "https://maps.apple.com/?q=Royal+Parade+Parkville",
      dressCode: "Black Tie & Elegant Evening Attire",
      parkingInfo: "Complimentary valet parking available at the grand entrance.",
    },
    schedule: [
      {
        time: "18:30",
        title: "Welcome Drinks & Canapés",
        description: "Arrival reception with signature cocktails, champagne and live acoustic music.",
      },
      {
        time: "19:30",
        title: "Anniversary Toast & Memories",
        description: "Heirloom speeches, fine dinner service, and milestone video presentation.",
      },
      {
        time: "21:00",
        title: "Music, Dance & Cake Cutting",
        description: "Celebration cake cutting followed by dancing under the chandelier.",
      },
    ],
    content: {
      headline: "A Decade of Love, Laughter & Shared Dreams",
      subheadline: "Celebrating 10 years of togetherness and a lifetime to come.",
      coupleOrHostNames: "Niloofar & Sadra",
      invitationStory: [
        "Ten years ago, we began a beautiful journey hand in hand.",
        "Through every adventure, triumph, and sweet memory, having you in our lives has made every step brighter.",
        "We warmly invite you to join us as we celebrate our 10th wedding anniversary.",
      ],
      pillars: [
        { title: "Date & Time", description: "Friday, 18 September 2026 — 6:30 PM" },
        { title: "Location", description: "The Grand Estate & Ballroom" },
        { title: "Dress Code", description: "Black Tie & Elegant Formal" },
      ],
      audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-piano-112199.mp3",
      audioTitle: "Nocturne in Gold — Ambient Waltz",
      coverImageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&q=80",
      ],
      dressCode: "Black Tie & Elegant Evening Attire",
      parkingInfo: "Complimentary valet parking at the entrance.",
      wishingWell: {
        payId: "0412345678",
        bsb: "066-000",
        accountNumber: "12345678",
        accountName: "Niloofar & Sadra",
        message: "Your warm presence is our greatest present. If you wish to honor us with a gift, a contribution toward our anniversary adventure would be gratefully received.",
      },
    },
    parties: [
      {
        id: "pty_armita",
        stableId: "stable_armita_1",
        displayName: "Armita & Hesam",
        token: "armita-party-g9qtmt",
        maxSeats: 4,
        allowPlusOnes: false,
        childrenAllowed: true,
        tableLabel: "Table 1 (VIP)",
        tags: ["VIP", "Family"],
        legacySlugs: ["armita-party-g9qtmt", "/anniversary/armita-party-g9qtmt", "/e/anniversary/armita-party-g9qtmt"],
        status: "YES",
        notes: "VIP family party",
        members: [
          { id: "gst_armita", name: "Armita", isPrimary: true, isChild: false, status: "YES", dietary: ["NONE"] },
          { id: "gst_hesam", name: "Hesam", isChild: false, status: "YES", dietary: ["NONE"] },
          { id: "gst_negar", name: "Negar", isChild: false, status: "YES", dietary: ["VEGETARIAN"] },
          { id: "gst_samyar", name: "Samyar", isChild: true, status: "YES", dietary: ["NONE"] },
        ],
      },
      {
        id: "pty_farhad",
        stableId: "stable_farhad_2",
        displayName: "Farhad & Maryam",
        token: "farhad-family-7kd92m",
        maxSeats: 2,
        allowPlusOnes: false,
        childrenAllowed: false,
        tableLabel: "Table 2",
        tags: ["Close Friends"],
        legacySlugs: ["farhad-maryam-party-7kd92m"],
        status: "YES",
        members: [
          { id: "gst_farhad", name: "Farhad", isPrimary: true, isChild: false, status: "YES", dietary: ["NONE"] },
          { id: "gst_maryam", name: "Maryam", isChild: false, status: "YES", dietary: ["GLUTEN_FREE"], allergyNotes: "Coeliac", allergySeverity: "MODERATE" },
        ],
      },
      {
        id: "pty_kian",
        stableId: "stable_kian_3",
        displayName: "Kian & Sahar",
        token: "kian-family-2j4p9q",
        maxSeats: 2,
        allowPlusOnes: true,
        childrenAllowed: true,
        tableLabel: "Table 3",
        tags: ["Perth Friends"],
        legacySlugs: ["kian-sahar-party-2j4p9q"],
        status: "PENDING",
        members: [
          { id: "gst_kian", name: "Kian", isPrimary: true, isChild: false, status: "PENDING" },
          { id: "gst_sahar", name: "Sahar", isChild: false, status: "PENDING" },
        ],
      },
      {
        id: "pty_sara",
        stableId: "stable_sara_4",
        displayName: "Sara & Ali",
        token: "sara-family-g9qtmt",
        maxSeats: 2,
        allowPlusOnes: false,
        childrenAllowed: false,
        tableLabel: "Table 4",
        tags: ["Friends"],
        status: "PENDING",
        members: [
          { id: "gst_sara", name: "Sara", isPrimary: true, isChild: false, status: "PENDING" },
          { id: "gst_ali", name: "Ali", isChild: false, status: "PENDING" },
        ],
      },
    ],
    salt: SALT_ANNIVERSARY,
    allowForwarding: false,
    wallEnabled: true,
    isPublished: true,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-10-23T12:00:00Z",
  },
  {
    id: "evt_persian_wedding",
    slug: "sara-reza-wedding-7kq",
    title: "Sara & Reza — Sofreh Aghd & Reception",
    ceremonySlug: "sofreh-aghd",
    experienceMode: "CELEBRATION",
    themeId: "persian-azure",
    templateSlug: "persian-heritage",
    gateStyle: "wax-seal",
    plan: "PREMIUM",
    startsAt: "2026-11-20T16:00:00+08:00",
    endsAt: "2026-11-20T23:30:00+08:00",
    timeZone: "Australia/Perth",
    languages: ["en", "fa"],
    defaultLanguage: "fa",
    rsvpDeadline: "2026-11-01T23:59:59+08:00",
    venue: {
      name: "Sandalford Wines & Estate",
      address: "3210 West Swan Rd, Caversham WA 6055, Australia",
      googleMapsUrl: "https://maps.google.com/?q=Sandalford+Wines+Caversham",
      dressCode: "Formal Persian Ceremony Attire",
    },
    schedule: [
      { time: "16:00", title: "Sofreh Aghd Ceremony", description: "Traditional Persian marriage blessing by the mirror and candlelight." },
      { time: "18:00", title: "Cocktail Hour & Garden Sunset", description: "Persian sweets, tea, and hors d'oeuvres overlooking the vineyard." },
      { time: "19:30", title: "Dinner & Reception", description: "Feast with Persian saffron rice, kebabs, and live music." },
    ],
    content: {
      headline: "پیوند آسمانی و جشن شادمانی سارا و رضا",
      subheadline: "با کمال افتخار شما را به آیین سنتی سفره عقد و جشن پیوندمان دعوت می‌کنیم.",
      coupleOrHostNames: "سارا و رضا (Sara & Reza)",
      invitationStory: [
        "در سایه‌سار مهر یزدان و در کنار زیباترین یادگارهای فرهنگ کهن ایرانی، آغاز با هم بودنمان را جشن می‌گیریم.",
        "حضور گرم شما در کنار سفره عقد، روشنی‌بخش محفل پر از امید و شادمانی ما خواهد بود.",
      ],
      coverImageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80",
    },
    parties: [
      {
        id: "pty_reza_guest",
        stableId: "stable_reza_guest_1",
        displayName: "خانواده اسدی (Asadi Family)",
        token: "asadi-family-8nm24p",
        maxSeats: 3,
        allowPlusOnes: false,
        childrenAllowed: true,
        tags: ["فامیل داماد"],
        status: "PENDING",
        members: [
          { id: "gst_asadi_1", name: "محسن اسدی", isPrimary: true, isChild: false, status: "PENDING" },
          { id: "gst_asadi_2", name: "زهرا رحیمی", isChild: false, status: "PENDING" },
          { id: "gst_asadi_3", name: "امیرعلی اسدی", isChild: true, status: "PENDING" },
        ],
      },
    ],
    salt: "salt_persian_wedding_2026_azur",
    allowForwarding: true,
    wallEnabled: true,
    isPublished: true,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-10-23T12:00:00Z",
  },
  {
    id: "evt_memorial_demo",
    slug: "dariush-memorial-3kp",
    title: "In Loving Memory of Dariush — Celebration of Life",
    ceremonySlug: "celebration-of-life",
    experienceMode: "MEMORIAL",
    themeId: "memorial-alabaster",
    templateSlug: "memorial-calm",
    gateStyle: "plain-fade",
    plan: "PREMIUM",
    startsAt: "2026-10-30T14:00:00+08:00",
    endsAt: "2026-10-30T17:00:00+08:00",
    timeZone: "Australia/Perth",
    languages: ["en", "fa"],
    defaultLanguage: "en",
    rsvpDeadline: "2026-10-25T23:59:59+08:00",
    venue: {
      name: "Karrakatta Memorial Garden Chapel",
      address: "Railway Rd, Karrakatta WA 6010, Australia",
      googleMapsUrl: "https://maps.google.com/?q=Karrakatta+Cemetery",
    },
    schedule: [
      { time: "14:00", title: "Memorial Service & Readings", description: "Sharing reflections, poetry and cherished memories of Dariush." },
      { time: "15:30", title: "Gathering & Refreshments", description: "Quiet fellowship, tea and light refreshments in the courtyard." },
    ],
    content: {
      headline: "A Life Well Lived, Forever in Our Hearts",
      subheadline: "Please join the family in celebrating and remembering the gentle life of Dariush.",
      coupleOrHostNames: "The Family of Dariush",
      honoureeName: "Dariush",
      invitationStory: [
        "Dariush brought immense warmth, kindness, and quiet wisdom to all whose lives he touched.",
        "Your presence and memories will bring great comfort to our family as we honor his legacy.",
      ],
      tributeBook: {
        prompt: "Share a memory, a message of comfort, or a story of Dariush.",
      },
    },
    parties: [
      {
        id: "pty_memorial_guest",
        stableId: "stable_memorial_guest_1",
        displayName: "Dr. Cyrus & Family",
        token: "cyrus-family-9xm42k",
        maxSeats: 2,
        allowPlusOnes: false,
        childrenAllowed: false,
        tags: ["Close Friends"],
        status: "PENDING",
        members: [
          { id: "gst_cyrus", name: "Dr. Cyrus", isPrimary: true, isChild: false, status: "PENDING" },
          { id: "gst_roya", name: "Roya", isChild: false, status: "PENDING" },
        ],
      },
    ],
    salt: "salt_memorial_dariush_2026_bronze",
    allowForwarding: false,
    wallEnabled: false,
    isPublished: true,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-23T12:00:00Z",
  },
];

class InvitationStore {
  private events: Map<string, EventModel> = new Map();

  constructor() {
    for (const evt of SEED_EVENTS) {
      this.events.set(evt.id, evt);
      this.events.set(`slug:${evt.slug}`, evt);
    }
  }

  public getAllEvents(): EventModel[] {
    return Array.from(new Set(this.events.values()));
  }

  public getEventById(id: string): EventModel | undefined {
    return this.events.get(id);
  }

  public getEventBySlug(slug: string): EventModel | undefined {
    return this.events.get(`slug:${slug}`);
  }

  public findGuestOrPartyByToken(
    eventSlug: string,
    guestToken: string,
  ): {
    event: EventModel;
    party: GuestParty;
    guest?: GuestMember;
    greetingName: string;
    isParty: boolean;
  } | null {
    const event = this.getEventBySlug(eventSlug);
    if (!event) return null;

    const normalizedToken = guestToken.trim().toLowerCase();

    // 1. Check exact token matches on party or member
    for (const party of event.parties) {
      if (party.token.toLowerCase() === normalizedToken) {
        return {
          event,
          party,
          greetingName: party.displayName,
          isParty: true,
        };
      }

      // Check legacy slug matches (e.g. armita-party-g9qtmt)
      if (party.legacySlugs?.some((ls) => ls.toLowerCase() === normalizedToken || ls.toLowerCase().endsWith(`/${normalizedToken}`))) {
        return {
          event,
          party,
          greetingName: party.displayName,
          isParty: true,
        };
      }

      // Check individual guest
      for (const member of party.members) {
        const memberSlug = member.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        if (normalizedToken.startsWith(memberSlug)) {
          return {
            event,
            party,
            guest: member,
            greetingName: member.name,
            isParty: false,
          };
        }
      }
    }

    // 2. Universal fallback for any valid guest token format
    if (isValidGuestTokenFormat(normalizedToken)) {
      const parts = normalizedToken.split("-");
      parts.pop(); // remove suffix
      const rawName = parts.join(" ").trim();
      const isParty = rawName.includes("party") || rawName.includes("family") || rawName.includes("خانواده");

      const cleanName =
        rawName
          .replace(/party|family|خانواده/gi, "")
          .trim()
          .replace(/\b\w/g, (l) => l.toUpperCase()) || "Honored Guest";

      const fallbackParty: GuestParty = {
        id: `pty_fallback_${normalizedToken}`,
        stableId: `stable_${normalizedToken}`,
        displayName: cleanName,
        token: normalizedToken,
        maxSeats: isParty ? 2 : 1,
        allowPlusOnes: isParty,
        childrenAllowed: true,
        tags: ["Auto-Imported"],
        status: "PENDING",
        members: [
          {
            id: `gst_fallback_${normalizedToken}`,
            name: cleanName,
            isPrimary: true,
            isChild: false,
            status: "PENDING",
          },
        ],
      };

      event.parties.push(fallbackParty);

      return {
        event,
        party: fallbackParty,
        guest: fallbackParty.members[0]!,
        greetingName: cleanName,
        isParty,
      };
    }

    return null;
  }

  public findGuestPartyByToken(eventSlugOrId: string, tokenOrSlug: string) {
    return this.findGuestOrPartyByToken(eventSlugOrId, tokenOrSlug);
  }

  public submitRsvp(payload: RsvpSubmissionPayload): GuestParty | null {
    const target = this.findGuestOrPartyByToken(payload.eventSlug, payload.guestToken);
    if (!target) return null;

    const { party } = target;
    party.status = payload.status;

    for (const g of payload.guests) {
      const existing = party.members.find((m) => m.id === g.id || m.name === g.name);
      if (existing) {
        existing.status = g.status;
        existing.dietary = g.dietary;
        existing.allergyNotes = g.allergyNotes;
        existing.allergySeverity = g.allergySeverity;
        existing.accessibilityNotes = g.accessibilityNotes;
      } else {
        const newMember: GuestMember = {
          id: g.id || `gst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: g.name,
          status: g.status,
          dietary: g.dietary,
          allergyNotes: g.allergyNotes,
          allergySeverity: g.allergySeverity,
          accessibilityNotes: g.accessibilityNotes,
        };
        party.members.push(newMember);
      }
    }

    if (payload.messageToHost) {
      party.notes = payload.messageToHost;
    }

    target.event.updatedAt = new Date().toISOString();
    return party;
  }

  public createEvent(params: {
    title: string;
    ceremonySlug: string;
    experienceMode: ExperienceMode;
    themeId: EventModel["themeId"];
    templateSlug: string;
    gateStyle: EventModel["gateStyle"];
    startsAt: string;
    timeZone?: string;
    languages: Array<"en" | "fa">;
    defaultLanguage: "en" | "fa";
    venueName: string;
    venueAddress: string;
    content: Partial<EventModel["content"]>;
    parties?: Array<{ name: string; seats?: number; isChild?: boolean }>;
  }): EventModel {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const salt = generateEventSalt();
    const slug = generateEventSlug(params.title, salt);

    const parties: GuestParty[] = (params.parties || []).map((p, idx) => {
      const stableId = `stable_${idx + 1}_${Math.random().toString(36).slice(2, 8)}`;
      const token = generateGuestToken(p.name, PEPPER, salt, stableId);
      const isParty = p.name.toLowerCase().includes("party") || p.name.toLowerCase().includes("family");

      return {
        id: `pty_${Date.now()}_${idx}`,
        stableId,
        displayName: p.name,
        token,
        maxSeats: p.seats || 2,
        allowPlusOnes: isParty,
        childrenAllowed: true,
        tags: ["Initial"],
        status: "PENDING",
        members: [
          {
            id: `gst_${Date.now()}_${idx}`,
            name: p.name,
            isPrimary: true,
            isChild: p.isChild || false,
            status: "PENDING",
          },
        ],
      };
    });

    const newEvent: EventModel = {
      id: eventId,
      slug,
      title: params.title,
      ceremonySlug: params.ceremonySlug,
      experienceMode: params.experienceMode,
      themeId: params.themeId,
      templateSlug: params.templateSlug,
      gateStyle: params.gateStyle,
      plan: "FREE",
      startsAt: params.startsAt,
      timeZone: params.timeZone || "Australia/Perth",
      languages: params.languages,
      defaultLanguage: params.defaultLanguage,
      venue: {
        name: params.venueName,
        address: params.venueAddress,
      },
      schedule: [
        { time: "18:00", title: "Ceremony Begins", description: "Guest arrival and seating" },
        { time: "19:30", title: "Dinner & Celebration", description: "Food, music and memories" },
      ],
      content: {
        headline: params.content.headline || params.title,
        subheadline: params.content.subheadline || "We invite you to celebrate with us.",
        coupleOrHostNames: params.content.coupleOrHostNames || params.title,
        invitationStory: params.content.invitationStory || [
          "We are delighted to invite you to celebrate this meaningful occasion with us.",
        ],
        ...params.content,
      },
      parties,
      salt,
      allowForwarding: true,
      wallEnabled: false,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.events.set(newEvent.id, newEvent);
    this.events.set(`slug:${newEvent.slug}`, newEvent);
    return newEvent;
  }

  public addPartyToEvent(
    eventId: string,
    partyName: string,
    seats: number,
    tags: string[] = [],
    tableLabel?: string,
  ): GuestParty | null {
    const event = this.getEventById(eventId);
    if (!event) return null;

    const stableId = `stable_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const token = generateGuestToken(partyName, PEPPER, event.salt, stableId);

    const newParty: GuestParty = {
      id: `pty_${Date.now()}`,
      stableId,
      displayName: partyName,
      token,
      maxSeats: seats,
      allowPlusOnes: seats > 1,
      childrenAllowed: true,
      tags,
      tableLabel,
      status: "PENDING",
      members: [
        {
          id: `gst_${Date.now()}`,
          name: partyName,
          isPrimary: true,
          status: "PENDING",
        },
      ],
    };

    event.parties.push(newParty);
    event.updatedAt = new Date().toISOString();
    return newParty;
  }

  public getEventResponsesSummary(eventId: string): EventResponsesSummary | null {
    const event = this.getEventById(eventId);
    if (!event) return null;

    let confirmedAdults = 0;
    let confirmedChildren = 0;
    let declinedCount = 0;
    let pendingCount = 0;
    const dietaryBreakdown: Record<string, number> = {};
    const messages: Array<{ from: string; message: string; date: string }> = [];

    for (const p of event.parties) {
      if (p.notes) {
        messages.push({
          from: p.displayName,
          message: p.notes,
          date: event.updatedAt,
        });
      }

      for (const m of p.members) {
        if (m.status === "YES") {
          if (m.isChild) confirmedChildren++;
          else confirmedAdults++;

          if (m.dietary) {
            for (const d of m.dietary) {
              if (d !== "NONE") {
                dietaryBreakdown[d] = (dietaryBreakdown[d] || 0) + 1;
              }
            }
          }
        } else if (m.status === "NO") {
          declinedCount++;
        } else {
          pendingCount++;
        }
      }
    }

    return {
      eventId,
      totalParties: event.parties.length,
      totalGuests: confirmedAdults + confirmedChildren + declinedCount + pendingCount,
      confirmedAdults,
      confirmedChildren,
      declinedCount,
      pendingCount,
      dietaryBreakdown,
      songRequests: [],
      messages,
    };
  }
}

export const invitationStore = new InvitationStore();
