/**
 * The six sample invitations shown on the templates page: one per template and theme.
 *
 * Every person, family and venue here is invented. The wording is written the way a host would
 * write it (en-AU), so a visitor sees what a finished invitation reads like. The two memorial
 * samples keep to Memorial Mode: calm, plain, no celebration language and no gift registry.
 *
 * No images or music: this iteration has no uploads, and a sample must never point at someone
 * else's media.
 */
import type {
  InvitationContentInput,
  InvitationOccasionSlug,
  InvitationTemplateSlug,
  RsvpConfigInput,
  WellConfig,
} from "@managevent/validators";

export interface DemoEventDefinition {
  /** Fixed slug the sample is upserted by. */
  eventSlug: string;
  templateSlug: InvitationTemplateSlug;
  ceremonySlug: InvitationOccasionSlug;
  title: string;
  /** How long the event runs from its 4 pm start, in hours. */
  durationHours: number;
  /** Days before the event that replies are due. */
  rsvpDeadlineDaysBefore: number;
  content: InvitationContentInput;
  rsvpConfig: RsvpConfigInput;
  wellMode: "WISHING_WELL" | "TRIBUTE_BOOK";
  wellConfig: WellConfig;
  tableLabel: string | null;
}

const NO_MUSIC = { enabled: false, url: null, title: null, rightsAttested: false } as const;

export const DEMO_OWNER = {
  email: "demo-host@managevent.invalid",
  name: "Managevent Sample Host",
} as const;

/** The one party every sample has, so the sample opens as a guest would see it. */
export const DEMO_PARTY = {
  displayName: "Sample Guest Family",
  guests: [
    { name: "Alex Sample", isChild: false },
    { name: "Jordan Sample", isChild: false },
    { name: "Riley Sample", isChild: true },
  ],
} as const;

export const DEMO_EVENTS: readonly DemoEventDefinition[] = [
  {
    eventSlug: "sample-royal-classic-smp2",
    templateSlug: "royal-classic",
    ceremonySlug: "wedding",
    title: "The wedding of Eleanor and James",
    durationHours: 7,
    rsvpDeadlineDaysBefore: 28,
    content: {
      version: 1,
      headline: "Eleanor & James",
      subheadline: "are getting married, and it would not be the same without you",
      hosts: "Together with their families",
      wording:
        "With great joy, we invite you to share our wedding day.\n\n" +
        "Join us for a ceremony under the old fig trees, followed by a long dinner, a few short " +
        "speeches and dancing until the band packs up.",
      story: [
        "We met in the queue for coffee on a wet Tuesday in Fremantle. James let Eleanor go " +
          "first, then spent ten minutes working up the courage to say something. He asked " +
          "what she was reading. She has not let him forget how nervous he sounded.",
        "Seven years, two house moves and one very opinionated kelpie later, he asked a much " +
          "bigger question on the beach at Yallingup. She said yes before he had finished.",
        "We cannot wait to celebrate with the people who have cheered us on from the start.",
      ],
      schedule: [
        {
          id: "arrive",
          time: "16:00",
          title: "Guests arrive",
          description: "A cool drink on the lawn while everyone finds a seat.",
          location: "The fig tree lawn",
        },
        {
          id: "ceremony",
          time: "16:30",
          title: "Ceremony",
          description: "Short, heartfelt and in the shade.",
          location: "The fig tree lawn",
        },
        {
          id: "canapes",
          time: "17:15",
          title: "Canapés and lawn games",
          description: "Photos for us, bocce and sparkling for you.",
          location: "The rose garden",
        },
        {
          id: "dinner",
          time: "18:30",
          title: "Dinner is served",
          location: "The homestead dining room",
        },
        {
          id: "speeches",
          time: "20:00",
          title: "Speeches and cake",
          description: "We have promised each speaker three minutes. Hold us to it.",
        },
        { id: "dancing", time: "20:45", title: "First dance, then everybody dances" },
        {
          id: "farewell",
          time: "23:00",
          title: "Farewell",
          description: "The last shuttle leaves from the main gate.",
        },
      ],
      venue: {
        name: "Larkspur House",
        address: "48 Marri Blossom Lane, Upper Swan WA 6069",
        parking:
          "Free parking in the paddock beside the main gate. Accessible bays are next to the " +
          "homestead entrance, and the path to the lawn is level.",
      },
      dressCode: "Formal. The ceremony is on grass, so block heels or flats are a wise choice.",
      faq: [
        {
          question: "Are children welcome?",
          answer:
            "Yes. Children named on your invitation are very welcome, and there will be a " +
            "children's menu and a quiet room with games.",
        },
        {
          question: "I have dietary requirements. What should I do?",
          answer:
            "Tell us when you reply and the kitchen will look after you. Please mention any " +
            "allergies, even mild ones.",
        },
        {
          question: "How do I get home?",
          answer:
            "A shuttle runs to Midland station at 10 pm and 11 pm. Taxis and rideshare are " +
            "scarce in the valley late at night, so the shuttle is your best option.",
        },
        {
          question: "Can I take photos during the ceremony?",
          answer:
            "We would love you to be fully present, so please keep phones away during the " +
            "ceremony. Our photographer will share everything afterwards.",
        },
      ],
      coverImageUrl: null,
      galleryImageUrls: [],
      music: NO_MUSIC,
    },
    rsvpConfig: { allowMaybe: false, songPrompt: "STANDARD" },
    wellMode: "WISHING_WELL",
    wellConfig: {
      message:
        "Having you with us is the only gift we need. If you would like to give something, a " +
        "contribution towards our honeymoon would be treasured.",
    },
    tableLabel: "Table 4",
  },
  {
    eventSlug: "sample-modern-minimal-smp3",
    templateSlug: "modern-minimal",
    ceremonySlug: "birthday",
    title: "Margot turns forty",
    durationHours: 5,
    rsvpDeadlineDaysBefore: 14,
    content: {
      version: 1,
      headline: "Margot turns forty",
      subheadline: "Long lunch energy, late afternoon timing",
      hosts: "Hosted by Daniel, Frankie and Bea",
      wording:
        "Forty years of Margot deserves a proper afternoon.\n\n" +
        "Come for grazing tables, good wine and a playlist she has been quietly curating " +
        "since March. No speeches, unless Margot changes her mind after a second glass.",
      story: [
        "Margot would like it known that she is not making a fuss. The rest of us would like " +
          "it known that we are making one on her behalf.",
      ],
      schedule: [
        { id: "doors", time: "16:00", title: "Doors open", description: "Drinks on arrival." },
        {
          id: "graze",
          time: "16:30",
          title: "Grazing tables",
          description: "Help yourself. There is plenty.",
        },
        { id: "cake", time: "18:00", title: "Cake and a toast" },
        { id: "music", time: "18:30", title: "Music up, shoes optional" },
        { id: "close", time: "21:00", title: "Last drinks" },
      ],
      venue: {
        name: "The Saltbush Pavilion",
        address: "3 Limestone Walk, North Coogee WA 6163",
        parking: "Street parking on Limestone Walk. The pavilion has step-free access throughout.",
      },
      dressCode: "Dress up a little. Bring a layer for the sea breeze after sunset.",
      faq: [
        {
          question: "Is this a surprise?",
          answer: "No. Margot chose the cake herself and is very pleased with it.",
        },
        {
          question: "Can I bring the kids?",
          answer:
            "Children named on your invitation are welcome. There is a fenced lawn, and the " +
            "afternoon winds down by 9 pm.",
        },
        {
          question: "What about presents?",
          answer:
            "Truly not needed. If you would like to mark the day, there is a note about " +
            "Margot's garden fund further down.",
        },
      ],
      coverImageUrl: null,
      galleryImageUrls: [],
      music: NO_MUSIC,
    },
    rsvpConfig: { allowMaybe: true, songPrompt: "STANDARD" },
    wellMode: "WISHING_WELL",
    wellConfig: {
      message:
        "Your company is the present. If you would like to add something, Margot is saving " +
        "for a lemon tree and a very good pair of secateurs.",
    },
    tableLabel: null,
  },
  {
    eventSlug: "sample-celestial-evening-smp4",
    templateSlug: "celestial-evening",
    ceremonySlug: "engagement",
    title: "Priya and Tom are engaged",
    durationHours: 6,
    rsvpDeadlineDaysBefore: 21,
    content: {
      version: 1,
      headline: "Priya & Tom",
      subheadline: "An evening under the stars to celebrate their engagement",
      hosts: "Hosted by the Raman and Whitlock families",
      wording:
        "She said yes on a clear night, so we are celebrating on another.\n\n" +
        "Please join our two families for sunset drinks, a shared feast and stargazing from " +
        "the terrace once the sky turns dark.",
      story: [
        "Tom proposed on the lookout at Lesmurdie with a thermos of chai and a telescope he " +
          "had borrowed from a neighbour. Priya found Saturn before she found the ring.",
        "Our families have been swapping recipes ever since. This evening is the first time " +
          "everyone will be around the same table.",
      ],
      schedule: [
        {
          id: "sunset",
          time: "16:00",
          title: "Sunset drinks",
          description: "Sparkling, mango lassi and something warm for later.",
          location: "The west terrace",
        },
        {
          id: "blessing",
          time: "17:00",
          title: "A blessing from both families",
          location: "The west terrace",
        },
        {
          id: "feast",
          time: "18:00",
          title: "Shared feast",
          description: "Served family style, with plenty of vegetarian dishes.",
          location: "The long room",
        },
        { id: "toast", time: "19:30", title: "Toasts" },
        {
          id: "stars",
          time: "20:15",
          title: "Stargazing",
          description: "An astronomer will be on the terrace with two telescopes.",
          location: "The west terrace",
        },
        { id: "goodnight", time: "22:00", title: "Goodnight" },
      ],
      venue: {
        name: "The Observatory Terrace",
        address: "210 Stargazer Rise, Gooseberry Hill WA 6076",
        parking:
          "Parking is on site, with attendants to guide you after dark. A ramp leads from the " +
          "car park to the terrace.",
      },
      dressCode: "Cocktail, in jewel tones if you have them. It gets cool on the hill at night.",
      faq: [
        {
          question: "Will there be vegetarian food?",
          answer:
            "Yes, about half the menu. Tell us about allergies or other needs when you reply " +
            "and we will pass them to the caterer.",
        },
        {
          question: "What happens if it is cloudy?",
          answer:
            "The feast goes ahead either way, and the astronomer has promised to be just as " +
            "interesting indoors.",
        },
        {
          question: "Is there a gift registry?",
          answer:
            "No registry. There is a short note about a wishing well further down if you " +
            "would like to contribute.",
        },
      ],
      coverImageUrl: null,
      galleryImageUrls: [],
      music: NO_MUSIC,
    },
    rsvpConfig: { allowMaybe: false, songPrompt: "STANDARD" },
    wellMode: "WISHING_WELL",
    wellConfig: {
      message:
        "Please do not feel you need to bring anything. For those who have asked, we are " +
        "putting any gifts towards our first home together.",
    },
    tableLabel: "Table 7",
  },
  {
    eventSlug: "sample-botanic-garden-smp5",
    templateSlug: "botanic-garden",
    ceremonySlug: "anniversary",
    title: "Helen and Robert's ruby anniversary",
    durationHours: 5,
    rsvpDeadlineDaysBefore: 21,
    content: {
      version: 1,
      headline: "Forty years of Helen & Robert",
      subheadline: "A garden party for their ruby wedding anniversary",
      hosts: "With love from Kate, Simon and the grandchildren",
      wording:
        "Mum and Dad were married in a garden, so that is where we are taking them back to.\n\n" +
        "Please join us for an afternoon among the roses, with high tea, a glass of something " +
        "red and a few stories they would probably rather we did not tell.",
      story: [
        "Helen and Robert met at a bushwalking club in 1984. He was holding the map upside " +
          "down. She pointed this out, kindly, and they have been finding their way together " +
          "ever since.",
        "Forty years on there are three children, five grandchildren and a vegetable patch " +
          "that feeds half the street. We would love you to help us say thank you.",
      ],
      schedule: [
        {
          id: "welcome",
          time: "16:00",
          title: "Welcome drinks in the rose walk",
          location: "The rose walk",
        },
        {
          id: "hightea",
          time: "16:30",
          title: "High tea",
          description: "Sandwiches, scones and Helen's own lemon slice.",
          location: "The conservatory",
        },
        {
          id: "stories",
          time: "17:30",
          title: "A toast and a few stories",
          location: "The conservatory",
        },
        {
          id: "photo",
          time: "18:15",
          title: "Family photograph",
          description: "Everyone is in it. Yes, you too.",
          location: "The fountain lawn",
        },
        { id: "dusk", time: "19:00", title: "Music and dessert as the lights come on" },
        { id: "carriages", time: "21:00", title: "Carriages" },
      ],
      venue: {
        name: "The Glasshouse at Fernleigh",
        address: "17 Fernleigh Close, Kalamunda WA 6076",
        parking:
          "Parking is along Fernleigh Close. Gravel paths lead through the garden; the " +
          "conservatory entrance is step-free.",
      },
      dressCode: "Garden party. A touch of red for the ruby anniversary would be lovely.",
      faq: [
        {
          question: "Should we bring a gift?",
          answer:
            "Please do not. Mum and Dad have asked for memories instead, so bring a photo or a " +
            "story if you have one.",
        },
        {
          question: "Is the garden suitable for wheelchairs and prams?",
          answer:
            "Yes. The conservatory and the fountain lawn are step-free, and there is seating " +
            "throughout the garden.",
        },
        {
          question: "What if it rains?",
          answer: "Everything moves into the conservatory, which is glorious in the rain.",
        },
      ],
      coverImageUrl: null,
      galleryImageUrls: [],
      music: NO_MUSIC,
    },
    rsvpConfig: { allowMaybe: false, songPrompt: "STANDARD" },
    wellMode: "WISHING_WELL",
    wellConfig: {
      message:
        "No gifts, please. If you would like to write Helen and Robert a few words, leave " +
        "them here and we will collect them into a book for the day.",
    },
    tableLabel: "Table 2",
  },
  {
    eventSlug: "sample-memorial-calm-smp6",
    templateSlug: "memorial-calm",
    ceremonySlug: "celebration-of-life",
    title: "Celebrating the life of Rosemary Hart",
    durationHours: 3,
    rsvpDeadlineDaysBefore: 7,
    content: {
      version: 1,
      headline: "Celebrating the life of Rosemary Ellen Hart",
      subheadline: "Loved mother, grandmother, teacher and friend",
      hosts: "The Hart family",
      honoureeName: "Rosemary Ellen Hart",
      wording:
        "Our family invites you to join us in remembering Rosemary.\n\n" +
        "We will gather in the garden she loved to share stories, music and afternoon tea. " +
        "Please come as you are. Your presence will mean a great deal to us.",
      story: [
        "Rosemary taught at the local primary school for thirty-one years and could still " +
          "name most of her students decades later. She grew sweet peas along every fence she " +
          "ever owned and gave most of them away.",
        "She asked that we keep this simple and that nobody feel they must wear black. We " +
          "hope the afternoon feels like one she would have enjoyed.",
      ],
      schedule: [
        {
          id: "gather",
          time: "16:00",
          title: "Family and friends gather",
          location: "The garden room",
        },
        {
          id: "remember",
          time: "16:30",
          title: "Words of remembrance",
          description: "Led by Rosemary's children, with time for anyone who wishes to speak.",
          location: "The garden room",
        },
        {
          id: "music",
          time: "17:15",
          title: "A piece of music she loved",
        },
        {
          id: "afternoon-tea",
          time: "17:30",
          title: "Afternoon tea",
          description: "Stay as long as you would like.",
          location: "The verandah",
        },
      ],
      venue: {
        name: "The Banksia Rooms",
        address: "9 Sweet Pea Lane, Guildford WA 6055",
        parking:
          "Parking is available behind the building on Sweet Pea Lane. The entrance and the " +
          "garden room are step-free, and seating is reserved near the front for anyone who " +
          "needs it.",
      },
      dressCode: "Come as you are. Rosemary loved colour, and it is welcome.",
      faq: [
        {
          question: "May I bring my children?",
          answer:
            "Yes. Rosemary spent her life with children and they are welcome. There is a " +
            "quiet space beside the garden room if they need a break.",
        },
        {
          question: "Should I send flowers?",
          answer:
            "The family has asked for no flowers. If you would like to do something, you " +
            "might plant something in your own garden in her memory.",
        },
        {
          question: "I would like to say a few words. Is that all right?",
          answer:
            "Please do. There will be an open time during the remembrance, and you can also " +
            "leave a written tribute for the family on this page.",
        },
        {
          question: "I cannot attend. How can I share my condolences?",
          answer:
            "A message in the tribute book on this page will reach the family, and it will be " +
            "read with gratitude.",
        },
      ],
      coverImageUrl: null,
      galleryImageUrls: [],
      music: NO_MUSIC,
    },
    rsvpConfig: { allowMaybe: false, songPrompt: "MEMORIAL" },
    wellMode: "TRIBUTE_BOOK",
    wellConfig: {
      message: "Your memories of Rosemary are a comfort to her family.",
      tributePrompt:
        "If you have a memory of Rosemary, a story or a few words for the family, you are " +
        "welcome to share it here.",
    },
    tableLabel: null,
  },
  {
    eventSlug: "sample-memorial-linen-smp7",
    templateSlug: "memorial-linen",
    ceremonySlug: "memorial-service",
    title: "In memory of Arthur Bennett",
    durationHours: 3,
    rsvpDeadlineDaysBefore: 7,
    content: {
      version: 1,
      headline: "In loving memory of Arthur James Bennett",
      subheadline: "A service of remembrance",
      hosts: "The Bennett family",
      honoureeName: "Arthur James Bennett",
      wording:
        "With love and sadness, the Bennett family invites you to a memorial service for " +
        "Arthur.\n\n" +
        "The service will be followed by refreshments. All who knew him are welcome.",
      story: [
        "Arthur was a carpenter for more than forty years, and there are few houses in his " +
          "street without something he made or mended. He was a patient teacher, a steady " +
          "friend and a devoted husband to Joan.",
      ],
      schedule: [
        {
          id: "arrival",
          time: "16:00",
          title: "Arrival",
          description: "Please be seated by a quarter past four.",
          location: "The chapel",
        },
        {
          id: "service",
          time: "16:15",
          title: "Memorial service",
          description: "Readings and reflections from family and friends.",
          location: "The chapel",
        },
        {
          id: "silence",
          time: "17:00",
          title: "A moment of quiet reflection",
          location: "The chapel",
        },
        {
          id: "refresh",
          time: "17:15",
          title: "Refreshments with the family",
          location: "The hall beside the chapel",
        },
      ],
      venue: {
        name: "Jacaranda Chapel",
        address: "26 Carpenters Row, South Perth WA 6151",
        parking:
          "Parking is available at the rear of the chapel. The chapel and hall are step-free, " +
          "and a hearing loop is fitted.",
      },
      dressCode: "Respectful dress in any colour.",
      faq: [
        {
          question: "Will the service be suitable for children?",
          answer: "Yes. Children are welcome to attend with their families.",
        },
        {
          question: "Are flowers welcome?",
          answer:
            "The family would prefer no flowers. A written memory in the tribute book on this " +
            "page would be valued.",
        },
        {
          question: "Is there somewhere to sit if I arrive early?",
          answer: "The chapel opens at half past three and the garden outside has seating.",
        },
      ],
      coverImageUrl: null,
      galleryImageUrls: [],
      music: NO_MUSIC,
    },
    rsvpConfig: { allowMaybe: false, songPrompt: "HIDDEN" },
    wellMode: "TRIBUTE_BOOK",
    wellConfig: {
      tributePrompt:
        "Please share a memory of Arthur or a message of support for Joan and the family.",
    },
    tableLabel: null,
  },
];
