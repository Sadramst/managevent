/**
 * Curated catalogue of 52 distinct invitation card designs spanning every major ceremony and
 * milestone: weddings, Persian & cultural celebrations, engagements, anniversaries, adult &
 * kids' birthdays, dog & pet birthdays, baby showers (girl, boy, neutral & gender reveal),
 * christenings/naming, bridal/graduation/housewarming, corporate galas, and memorials.
 *
 * Every design maps cleanly onto a valid `@managevent/validators` occasion, base template, theme,
 * and gate style so the Host Studio wizard, API validation, and guest micro-site remain consistent.
 * All text colours are normalized with `ensureContrast()` for strict WCAG 2.2 AA (>= 4.5:1).
 */
import type {
  GateStyle,
  InvitationOccasionSlug,
  InvitationTemplateSlug,
} from "@managevent/validators";
import type { ExperienceMode, InvitationThemeId } from "@managevent/types";
import { ensureContrast } from "@/lib/guest/theme";

export type CardDesignCategory =
  | "wedding"
  | "cultural-ceremony"
  | "engagement"
  | "anniversary"
  | "birthday-adult"
  | "birthday-kids"
  | "pet-birthday"
  | "baby-shower-girl"
  | "baby-shower-boy"
  | "baby-shower-neutral"
  | "religious-naming"
  | "lifestyle-milestone"
  | "corporate-gala"
  | "memorial";

export type CardFrameShape =
  | "arch"
  | "double-arch"
  | "scalloped"
  | "octagon"
  | "ticket-stub"
  | "polaroid"
  | "crest-shield"
  | "botanical-oval"
  | "mihrab-arch"
  | "paw-badge"
  | "cloud-dream"
  | "art-deco"
  | "scroll-parchment"
  | "minimalist-monolith"
  | "mediterranean-tile"
  | "memorial-tablet";

export type CardMotifId =
  | "wedding-rings"
  | "botanical-wreath"
  | "coastal-pearl"
  | "celestial-stars"
  | "editorial-monogram"
  | "native-banksia"
  | "mihrab-pomegranate"
  | "rose-nightingale"
  | "henna-mandala"
  | "diamond-ring"
  | "champagne-coupes"
  | "anniversary-laurel"
  | "vintage-key-21"
  | "espresso-martini"
  | "wine-crest"
  | "art-deco-fan"
  | "birthday-cake"
  | "tiara-crown"
  | "safari-lion"
  | "fairy-butterfly"
  | "space-rocket"
  | "hot-air-balloon"
  | "dog-party-hat"
  | "poodle-couture"
  | "puppy-bone-ball"
  | "cat-crown-whiskers"
  | "paw-heart-gotcha"
  | "baby-girl-pram"
  | "baby-girl-butterfly"
  | "baby-boy-prince-crown"
  | "baby-boy-sailboat"
  | "baby-neutral-moon-bear"
  | "gender-reveal-booties"
  | "dove-olive-branch"
  | "star-of-david"
  | "crescent-lantern"
  | "graduation-cap"
  | "house-key-olive"
  | "trophy-gala"
  | "memorial-eucalyptus";

export interface CardPalette {
  bg: string;
  bgWarm: string;
  surface: string;
  ink: string;
  inkMuted: string;
  accent: string;
  rule: string;
}

export interface OccasionCardDesign {
  id: string;
  name: string;
  category: CardDesignCategory;
  categoryLabel: string;
  occasionSlug: InvitationOccasionSlug;
  templateSlug: InvitationTemplateSlug;
  themeId: InvitationThemeId;
  gateStyle: GateStyle;
  mode: ExperienceMode;
  free: boolean;
  cardShape: CardFrameShape;
  motif: CardMotifId;
  badgeText: string;
  summary: string;
  tags: readonly string[];
  palette: CardPalette;
  sample: {
    hosts: string;
    headline: string;
    subheadline: string;
    title: string;
    venueName: string;
    venueAddress: string;
  };
}

export interface CardCategoryMeta {
  id: CardDesignCategory | "all";
  label: string;
  shortLabel: string;
}

export const CARD_DESIGN_CATEGORIES: readonly CardCategoryMeta[] = [
  { id: "all", label: "All Card Designs", shortLabel: "All" },
  { id: "wedding", label: "Weddings & Vows", shortLabel: "Weddings" },
  { id: "cultural-ceremony", label: "Cultural Ceremonies", shortLabel: "Cultural" },
  { id: "engagement", label: "Engagements & Proposals", shortLabel: "Engagements" },
  { id: "anniversary", label: "Milestone Anniversaries", shortLabel: "Anniversaries" },
  { id: "birthday-adult", label: "Milestone Birthdays", shortLabel: "Birthdays" },
  { id: "birthday-kids", label: "Kids' Birthdays", shortLabel: "Kids' Party" },
  { id: "pet-birthday", label: "Dog & Pet Birthdays", shortLabel: "Dog & Pet" },
  { id: "baby-shower-girl", label: "Baby Shower (Girl)", shortLabel: "Baby Girl" },
  { id: "baby-shower-boy", label: "Baby Shower (Boy)", shortLabel: "Baby Boy" },
  { id: "baby-shower-neutral", label: "Neutral & Gender Reveal", shortLabel: "Gender Reveal" },
  { id: "religious-naming", label: "Christening & Naming", shortLabel: "Naming & Faith" },
  { id: "lifestyle-milestone", label: "Bridal, Grad & Home", shortLabel: "Lifestyle" },
  { id: "corporate-gala", label: "Corporate Galas", shortLabel: "Galas" },
  { id: "memorial", label: "Memorial & Tributes", shortLabel: "Memorials" },
];

function verifiedPalette(raw: CardPalette, dark: boolean): CardPalette {
  const surfaces = [raw.bg, raw.surface];
  const inkFallback = dark ? "#F8FAFC" : "#18181B";
  const ink = ensureContrast(raw.ink, surfaces, inkFallback, 4.6);
  const inkMuted = ensureContrast(raw.inkMuted, surfaces, ink, 4.6);
  return {
    ...raw,
    ink,
    inkMuted,
  };
}

export const OCCASION_CARD_DESIGNS: readonly OccasionCardDesign[] = [
  // ── 1. WEDDINGS & VOWS (6) ──────────────────────────────────────────────
  {
    id: "wedding-royal-ivory-arch",
    name: "Royal Ivory Double Arch",
    category: "wedding",
    categoryLabel: "Weddings & Vows",
    occasionSlug: "wedding",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "double-arch",
    motif: "wedding-rings",
    badgeText: "Grand Wedding",
    summary:
      "Double-arched ivory cardstock framed in burnished gold and deep burgundy ink with intertwined rings.",
    tags: ["wedding", "ivory", "gold", "burgundy", "ballroom", "classic"],
    palette: verifiedPalette(
      {
        bg: "#FAF7F2",
        bgWarm: "#F2E9DB",
        surface: "#FFFFFF",
        ink: "#5C1A24",
        inkMuted: "#52525B",
        accent: "#C5A059",
        rule: "#C5A059",
      },
      false,
    ),
    sample: {
      hosts: "Together with their families",
      headline: "Emily & James",
      subheadline: "Request the honour of your presence at their wedding",
      title: "Sandalford Estate • Swan Valley WA",
      venueName: "Sandalford Wines Estate",
      venueAddress: "3210 West Swan Rd, Caversham WA 6055",
    },
  },
  {
    id: "wedding-swan-valley-botanic",
    name: "Swan Valley Botanic Crest",
    category: "wedding",
    categoryLabel: "Weddings & Vows",
    occasionSlug: "wedding",
    templateSlug: "botanic-garden",
    themeId: "emerald-botanic",
    gateStyle: "arch",
    mode: "CELEBRATION",
    free: false,
    cardShape: "botanical-oval",
    motif: "botanical-wreath",
    badgeText: "Vineyard Wedding",
    summary:
      "Botanical oval frame adorned with olive foliage and brushed gold accents for winery and garden vows.",
    tags: ["wedding", "vineyard", "garden", "botanical", "emerald", "swan valley"],
    palette: verifiedPalette(
      {
        bg: "#F5F8F4",
        bgWarm: "#E8EFE6",
        surface: "#FFFFFF",
        ink: "#1B3B2B",
        inkMuted: "#3E594A",
        accent: "#B89650",
        rule: "#84A38C",
      },
      false,
    ),
    sample: {
      hosts: "Invite you to celebrate their vows",
      headline: "Chloe & Harrison",
      subheadline: "Ceremony in the vineyard arbour followed by twilight supper",
      title: "Mandoon Estate • Caversham",
      venueName: "Mandoon Estate Winery",
      venueAddress: "10 Harris Rd, Caversham WA 6055",
    },
  },
  {
    id: "wedding-cottesloe-coastal-pearl",
    name: "Cottesloe Coastal Pearl",
    category: "wedding",
    categoryLabel: "Weddings & Vows",
    occasionSlug: "wedding",
    templateSlug: "modern-minimal",
    themeId: "alabaster-platinum",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "scalloped",
    motif: "coastal-pearl",
    badgeText: "Coastal Wedding",
    summary:
      "Soft ocean-mist scalloped frame crowned by a seashell pearl illustration for sunset beach ceremonies.",
    tags: ["wedding", "beach", "coastal", "cottesloe", "ocean", "pearl"],
    palette: verifiedPalette(
      {
        bg: "#F4F9FC",
        bgWarm: "#E6F2F8",
        surface: "#FFFFFF",
        ink: "#0F3D57",
        inkMuted: "#425F70",
        accent: "#6096B4",
        rule: "#93BFCF",
      },
      false,
    ),
    sample: {
      hosts: "By sea, salt air and sunset",
      headline: "Maya & Lachlan",
      subheadline: "Overlooking the Indian Ocean",
      title: "Indiana Tea House • Cottesloe Beach",
      venueName: "Indiana Cottesloe",
      venueAddress: "99 Marine Parade, Cottesloe WA 6011",
    },
  },
  {
    id: "wedding-midnight-starlight",
    name: "Midnight Starlight Vows",
    category: "wedding",
    categoryLabel: "Weddings & Vows",
    occasionSlug: "wedding",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: false,
    cardShape: "octagon",
    motif: "celestial-stars",
    badgeText: "Evening Wedding",
    summary:
      "Deep midnight sapphire octagon bordered in rose gold with celestial starlight constellations.",
    tags: ["wedding", "evening", "celestial", "navy", "stars", "luxury"],
    palette: verifiedPalette(
      {
        bg: "#0B132B",
        bgWarm: "#1C2541",
        surface: "#151E38",
        ink: "#F8FAFC",
        inkMuted: "#CBD5E1",
        accent: "#E2B697",
        rule: "#E2B697",
      },
      true,
    ),
    sample: {
      hosts: "Written under southern skies",
      headline: "Elena & Marcus",
      subheadline: "A candlelit evening ceremony & ballroom banquet",
      title: "COMO The Treasury • Perth CBD",
      venueName: "COMO The Treasury",
      venueAddress: "1 Cathedral Ave, Perth WA 6000",
    },
  },
  {
    id: "wedding-editorial-monogram",
    name: "Editorial Monogram Suite",
    category: "wedding",
    categoryLabel: "Weddings & Vows",
    occasionSlug: "wedding",
    templateSlug: "modern-minimal",
    themeId: "alabaster-platinum",
    gateStyle: "plain-fade",
    mode: "CELEBRATION",
    free: true,
    cardShape: "minimalist-monolith",
    motif: "editorial-monogram",
    badgeText: "Modern Wedding",
    summary:
      "Contemporary gallery typography framed by stark architectural hairlines and bespoke crest monogram.",
    tags: ["wedding", "minimal", "modern", "editorial", "monochrome"],
    palette: verifiedPalette(
      {
        bg: "#FAFAFA",
        bgWarm: "#EFEFF2",
        surface: "#FFFFFF",
        ink: "#09090B",
        inkMuted: "#52525B",
        accent: "#27272A",
        rule: "#52525B",
      },
      false,
    ),
    sample: {
      hosts: "Together with their loved ones",
      headline: "Sophie & Noah",
      subheadline: "Gallery ceremony followed by rooftop dining & vinyl",
      title: "AGWA Rooftop • Perth Cultural Centre",
      venueName: "AGWA Rooftop",
      venueAddress: "Perth Cultural Centre, Perth WA 6000",
    },
  },
  {
    id: "wedding-kings-park-wildflower",
    name: "Kings Park Wildflower Terracotta",
    category: "wedding",
    categoryLabel: "Weddings & Vows",
    occasionSlug: "wedding",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "arch",
    motif: "native-banksia",
    badgeText: "Wildflower Wedding",
    summary:
      "Warm terracotta desert blush arch paired with a native Western Australian banksia wildflower crest.",
    tags: ["wedding", "wildflower", "banksia", "terracotta", "boho", "perth"],
    palette: verifiedPalette(
      {
        bg: "#FDF6F0",
        bgWarm: "#F7E7DA",
        surface: "#FFFFFF",
        ink: "#6B2710",
        inkMuted: "#633D2E",
        accent: "#C06C47",
        rule: "#D89A7B",
      },
      false,
    ),
    sample: {
      hosts: "Amidst the native bushland",
      headline: "Grace & Thomas",
      subheadline: "Outdoor ceremony overlooking Perth city skyline",
      title: "Fraser's • Kings Park WA",
      venueName: "Fraser's Restaurant",
      venueAddress: "60 Fraser Ave, Kings Park WA 6005",
    },
  },

  // ── 2. CULTURAL & HERITAGE CEREMONIES (5) ───────────────────────────────
  {
    id: "cultural-sofreh-aghd-mihrab",
    name: "Sofreh Aghd Royal Mihrab",
    category: "cultural-ceremony",
    categoryLabel: "Cultural Ceremonies",
    occasionSlug: "cultural-celebration",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "mihrab-arch",
    motif: "mihrab-pomegranate",
    badgeText: "Sofreh Aghd",
    summary:
      "Pointed heritage arch illuminated in antique gold and royal ruby celebrating traditional Aqd & Aroosi ceremonies.",
    tags: ["cultural", "sofreh aghd", "aqd", "aroosi", "persian", "heritage", "ceremony"],
    palette: verifiedPalette(
      {
        bg: "#FAF5EE",
        bgWarm: "#F2E6D6",
        surface: "#FFFFFF",
        ink: "#6E1323",
        inkMuted: "#59353C",
        accent: "#C5A059",
        rule: "#C5A059",
      },
      false,
    ),
    sample: {
      hosts: "With gratitude to both families",
      headline: "Aria & Niloufar",
      subheadline: "Sofreh Aghd ceremony, mirror blessings & banquet",
      title: "Crown Towers Ballroom • Burswood",
      venueName: "Crown Towers Ballroom",
      venueAddress: "Great Eastern Hwy, Burswood WA 6100",
    },
  },
  {
    id: "cultural-shiraz-lapis-rose",
    name: "Shiraz Lapis & Rose-Nightingale",
    category: "cultural-ceremony",
    categoryLabel: "Cultural Ceremonies",
    occasionSlug: "cultural-celebration",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "arch",
    mode: "CELEBRATION",
    free: false,
    cardShape: "mihrab-arch",
    motif: "rose-nightingale",
    badgeText: "Heritage Gala",
    summary:
      "Jewel-toned lapis lazuli arch finished with gilded Gol-o-Morgh botanical linework and turquoise accents.",
    tags: ["cultural", "shiraz", "lapis", "gol o morgh", "engagement", "ceremony"],
    palette: verifiedPalette(
      {
        bg: "#0D2345",
        bgWarm: "#14315E",
        surface: "#11294E",
        ink: "#FAF6EE",
        inkMuted: "#C7DBF2",
        accent: "#E5B85B",
        rule: "#429E9D",
      },
      true,
    ),
    sample: {
      hosts: "An evening of poetry & candlelight",
      headline: "Darius & Parisa",
      subheadline: "Traditional blessings, live music & waterfront banquet",
      title: "Matilda Bay • Crawley WA",
      venueName: "Matilda Bay Restaurant",
      venueAddress: "3 Hackett Dr, Crawley WA 6009",
    },
  },
  {
    id: "cultural-nowruz-spring",
    name: "Nowruz Spring Equinox",
    category: "cultural-ceremony",
    categoryLabel: "Cultural Ceremonies",
    occasionSlug: "cultural-celebration",
    templateSlug: "botanic-garden",
    themeId: "emerald-botanic",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: false,
    cardShape: "scalloped",
    motif: "rose-nightingale",
    badgeText: "Spring Equinox",
    summary:
      "Vibrant sabzeh emerald and turquoise scallop frame celebrating New Year equinox gatherings and family feasts.",
    tags: ["nowruz", "spring", "equinox", "haft seen", "new year", "cultural"],
    palette: verifiedPalette(
      {
        bg: "#F1FAF7",
        bgWarm: "#DCF3EB",
        surface: "#FFFFFF",
        ink: "#094E41",
        inkMuted: "#225748",
        accent: "#149C88",
        rule: "#D4AF37",
      },
      false,
    ),
    sample: {
      hosts: "Welcoming a luminous new season",
      headline: "Spring Equinox Gala",
      subheadline: "Symbolic table showcase, live strings & dinner",
      title: "The Westin Perth Grand Ballroom",
      venueName: "The Westin Perth",
      venueAddress: "480 Hay St, Perth WA 6000",
    },
  },
  {
    id: "cultural-yalda-pomegranate",
    name: "Winter Solstice Pomegranate",
    category: "cultural-ceremony",
    categoryLabel: "Cultural Ceremonies",
    occasionSlug: "cultural-celebration",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: false,
    cardShape: "double-arch",
    motif: "mihrab-pomegranate",
    badgeText: "Winter Solstice",
    summary:
      "Deep garnet crimson ground illuminated with gilded pomegranate emblem for Yalda & winter solstice nights.",
    tags: ["yalda", "pomegranate", "solstice", "winter", "poetry", "cultural"],
    palette: verifiedPalette(
      {
        bg: "#3B0A14",
        bgWarm: "#52101E",
        surface: "#460D19",
        ink: "#FFF6F0",
        inkMuted: "#F7CFD6",
        accent: "#E8C067",
        rule: "#E8C067",
      },
      true,
    ),
    sample: {
      hosts: "Warmest light on the longest night",
      headline: "Solstice Poetry Gathering",
      subheadline: "Pomegranate feast, storytelling & live acoustic music",
      title: "Hyatt Regency Conservatory",
      venueName: "Hyatt Regency Perth",
      venueAddress: "99 Adelaide Terrace, East Perth WA 6004",
    },
  },
  {
    id: "cultural-mehndi-marigold",
    name: "Mehndi & Sangeet Mandala",
    category: "cultural-ceremony",
    categoryLabel: "Cultural Ceremonies",
    occasionSlug: "cultural-celebration",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "octagon",
    motif: "henna-mandala",
    badgeText: "Mehndi & Sangeet",
    summary:
      "Jewel-bright saffron marigold and magenta octagonal card adorned with intricate henna mandala geometry.",
    tags: ["mehndi", "sangeet", "indian", "hanabandan", "henna", "mandala", "cultural"],
    palette: verifiedPalette(
      {
        bg: "#FFF8EB",
        bgWarm: "#FDEAC7",
        surface: "#FFFFFF",
        ink: "#831843",
        inkMuted: "#5C3515",
        accent: "#D97706",
        rule: "#F59E0B",
      },
      false,
    ),
    sample: {
      hosts: "Colours, music & joyful dance",
      headline: "Priya & Dev's Sangeet",
      subheadline: "Evening of henna art, spice banquet & dance floor",
      title: "River View Room • Burswood",
      venueName: "Optus Stadium River View",
      venueAddress: "333 Victoria Park Dr, Burswood WA 6100",
    },
  },

  // ── 3. ENGAGEMENTS & PROPOSALS (4) ──────────────────────────────────────
  {
    id: "engagement-diamond-halo",
    name: "Solitaire Diamond Halo",
    category: "engagement",
    categoryLabel: "Engagements & Proposals",
    occasionSlug: "engagement",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "arch",
    motif: "diamond-ring",
    badgeText: "We Said Yes!",
    summary:
      "Soft rose-quartz blush arch centred on an illustrated faceted solitaire diamond ring and delicate foil rule.",
    tags: ["engagement", "proposal", "diamond", "ring", "blush", "cocktail"],
    palette: verifiedPalette(
      {
        bg: "#FFF5F7",
        bgWarm: "#FCE7EC",
        surface: "#FFFFFF",
        ink: "#7E1F38",
        inkMuted: "#61323E",
        accent: "#D48899",
        rule: "#E5B2BE",
      },
      false,
    ),
    sample: {
      hosts: "Let's raise a glass together",
      headline: "Olivia & Ethan",
      subheadline: "Engagement cocktails by the Swan River",
      title: "The Raft • Swan River Perth",
      venueName: "The Raft Perth",
      venueAddress: "Barrack St Jetty, Perth WA 6000",
    },
  },
  {
    id: "engagement-champagne-coupes",
    name: "Champagne Coupe Soirée",
    category: "engagement",
    categoryLabel: "Engagements & Proposals",
    occasionSlug: "engagement",
    templateSlug: "modern-minimal",
    themeId: "alabaster-platinum",
    gateStyle: "arch",
    mode: "CELEBRATION",
    free: true,
    cardShape: "minimalist-monolith",
    motif: "champagne-coupes",
    badgeText: "Engagement Toast",
    summary:
      "Chic oyster-cream cocktail invitation showcasing twin etched champagne coupes clinking above modern typography.",
    tags: ["engagement", "champagne", "cocktail", "toast", "modern", "party"],
    palette: verifiedPalette(
      {
        bg: "#FCFBF7",
        bgWarm: "#F4F0E5",
        surface: "#FFFFFF",
        ink: "#302614",
        inkMuted: "#544D40",
        accent: "#B49246",
        rule: "#D1BE94",
      },
      false,
    ),
    sample: {
      hosts: "Champagne, canapés & celebration",
      headline: "Hannah & Jack",
      subheadline: "Celebrate our engagement at Hadiqa Rooftop",
      title: "Hadiqa • Hibernian Place Perth",
      venueName: "Hadiqa Rooftop Lounge",
      venueAddress: "40 Irwin St, Perth WA 6000",
    },
  },
  {
    id: "engagement-amalfi-spritz",
    name: "Fremantle Amalfi Spritz",
    category: "engagement",
    categoryLabel: "Engagements & Proposals",
    occasionSlug: "engagement",
    templateSlug: "botanic-garden",
    themeId: "emerald-botanic",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: false,
    cardShape: "mediterranean-tile",
    motif: "botanical-wreath",
    badgeText: "Amalfi Spritz",
    summary:
      "Mediterranean azure tile border paired with sun-ripened citrus accents for seaside engagement long lunches.",
    tags: ["engagement", "amalfi", "fremantle", "mediterranean", "summer", "lunch"],
    palette: verifiedPalette(
      {
        bg: "#F8FCFE",
        bgWarm: "#E8F4FA",
        surface: "#FFFFFF",
        ink: "#1E40AF",
        inkMuted: "#334E68",
        accent: "#EAB308",
        rule: "#60A5FA",
      },
      false,
    ),
    sample: {
      hosts: "Amore & Aperitivo by the sea",
      headline: "Isabella & Luca",
      subheadline: "Antipasti, spritzes & coastal afternoon tunes",
      title: "Bathers Beach House • Fremantle",
      venueName: "Bathers Beach House",
      venueAddress: "47 Mews Rd, Fremantle WA 6160",
    },
  },
  {
    id: "engagement-wisteria-garden",
    name: "Wisteria Secret Garden",
    category: "engagement",
    categoryLabel: "Engagements & Proposals",
    occasionSlug: "engagement",
    templateSlug: "botanic-garden",
    themeId: "emerald-botanic",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: false,
    cardShape: "botanical-oval",
    motif: "rose-nightingale",
    badgeText: "Proposal Party",
    summary:
      "Soft lavender botanical oval designed for surprise proposal after-parties and late-afternoon garden teas.",
    tags: ["engagement", "proposal", "surprise", "lavender", "garden", "tea"],
    palette: verifiedPalette(
      {
        bg: "#FAF8FD",
        bgWarm: "#EFEAF8",
        surface: "#FFFFFF",
        ink: "#4C1D95",
        inkMuted: "#513E6E",
        accent: "#8B5CF6",
        rule: "#C4B5FD",
      },
      false,
    ),
    sample: {
      hosts: "A surprise to remember",
      headline: "Maddie & Sam",
      subheadline: "Join us right after the big question in the gardens",
      title: "Araluen Botanic Park • Roleystone",
      venueName: "Araluen Botanic Park",
      venueAddress: "362 Croyden Rd, Roleystone WA 6111",
    },
  },

  // ── 4. MILESTONE ANNIVERSARIES (5) ──────────────────────────────────────
  {
    id: "anniversary-decade-ten",
    name: "10th Anniversary Heirloom Arch",
    category: "anniversary",
    categoryLabel: "Milestone Anniversaries",
    occasionSlug: "anniversary",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "double-arch",
    motif: "anniversary-laurel",
    badgeText: "10th Anniversary",
    summary:
      "Heirloom ivory double arch crowned with a golden laurel crest honouring ten unforgettable years together.",
    tags: ["anniversary", "10th", "decade", "gold", "family", "dinner"],
    palette: verifiedPalette(
      {
        bg: "#FAF7F2",
        bgWarm: "#F2E9DB",
        surface: "#FFFFFF",
        ink: "#5C1A24",
        inkMuted: "#52525B",
        accent: "#C5A059",
        rule: "#C5A059",
      },
      false,
    ),
    sample: {
      hosts: "Ten radiant years together",
      headline: "Emma & Liam",
      subheadline: "Heirloom dinner & dancing under the chandelier",
      title: "10th Wedding Anniversary Celebration",
      venueName: "The Grand Estate Ballroom",
      venueAddress: "128 Royal Parade, Perth WA 6000",
    },
  },
  {
    id: "anniversary-silver-25",
    name: "25th Silver Jubilee Shield",
    category: "anniversary",
    categoryLabel: "Milestone Anniversaries",
    occasionSlug: "anniversary",
    templateSlug: "modern-minimal",
    themeId: "alabaster-platinum",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "crest-shield",
    motif: "anniversary-laurel",
    badgeText: "25th Silver Jubilee",
    summary:
      "Sterling silver heraldic shield with crisp slate lettering celebrating twenty-five years of marriage.",
    tags: ["anniversary", "25th", "silver", "jubilee", "milestone"],
    palette: verifiedPalette(
      {
        bg: "#F8FAFC",
        bgWarm: "#EDF2F7",
        surface: "#FFFFFF",
        ink: "#1E293B",
        inkMuted: "#475569",
        accent: "#64748B",
        rule: "#94A3B8",
      },
      false,
    ),
    sample: {
      hosts: "Celebrating twenty-five years",
      headline: "Catherine & Mark",
      subheadline: "Silver Jubilee supper & vow renewal",
      title: "Royal Freshwater Bay Yacht Club",
      venueName: "Freshwater Bay Yacht Club",
      venueAddress: "1 Hobbs Place, Peppermint Grove WA 6011",
    },
  },
  {
    id: "anniversary-pearl-30",
    name: "30th Pearl Elegance",
    category: "anniversary",
    categoryLabel: "Milestone Anniversaries",
    occasionSlug: "anniversary",
    templateSlug: "modern-minimal",
    themeId: "alabaster-platinum",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "botanical-oval",
    motif: "coastal-pearl",
    badgeText: "30th Pearl",
    summary:
      "Lustrous champagne pearl frame commemorating three decades of shared life and family milestones.",
    tags: ["anniversary", "30th", "pearl", "elegant", "cream"],
    palette: verifiedPalette(
      {
        bg: "#FDFBF8",
        bgWarm: "#F7F1EB",
        surface: "#FFFFFF",
        ink: "#4A3830",
        inkMuted: "#5E514B",
        accent: "#B8A286",
        rule: "#DFD3C3",
      },
      false,
    ),
    sample: {
      hosts: "Three decades hand in hand",
      headline: "Helen & Andrew",
      subheadline: "Our Pearl Anniversary Banquet",
      title: "Crown Pearl Ballroom • Perth",
      venueName: "Crown Pearl Ballroom",
      venueAddress: "Great Eastern Hwy, Burswood WA 6100",
    },
  },
  {
    id: "anniversary-ruby-40",
    name: "40th Ruby Velvet Banquet",
    category: "anniversary",
    categoryLabel: "Milestone Anniversaries",
    occasionSlug: "anniversary",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: false,
    cardShape: "octagon",
    motif: "champagne-coupes",
    badgeText: "40th Ruby",
    summary:
      "Rich garnet-ruby velvet octagonal invitation with champagne foil filigree for a 40th Ruby Anniversary.",
    tags: ["anniversary", "40th", "ruby", "red", "velvet", "formal"],
    palette: verifiedPalette(
      {
        bg: "#4A0E1C",
        bgWarm: "#631527",
        surface: "#581122",
        ink: "#FFF8F5",
        inkMuted: "#F4CED6",
        accent: "#E5B95C",
        rule: "#E5B95C",
      },
      true,
    ),
    sample: {
      hosts: "Hosted with love by their children",
      headline: "Margaret & Peter",
      subheadline: "Forty radiant years in ruby & gold",
      title: "C Restaurant in the Sky • Perth",
      venueName: "C Restaurant",
      venueAddress: "44 St Georges Terrace, Perth WA 6000",
    },
  },
  {
    id: "anniversary-golden-50",
    name: "50th Golden Jubilee Foil",
    category: "anniversary",
    categoryLabel: "Milestone Anniversaries",
    occasionSlug: "anniversary",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "crest-shield",
    motif: "anniversary-laurel",
    badgeText: "50th Golden",
    summary:
      "24-karat gold foil crest celebrating half a century of marriage with multi-generational family toasts.",
    tags: ["anniversary", "50th", "golden", "gold", "grandparents", "jubilee"],
    palette: verifiedPalette(
      {
        bg: "#FFFDF5",
        bgWarm: "#FBF2D6",
        surface: "#FFFFFF",
        ink: "#5C3F08",
        inkMuted: "#5E471B",
        accent: "#C89B2B",
        rule: "#E0BA4C",
      },
      false,
    ),
    sample: {
      hosts: "Half a century of love",
      headline: "Arthur & Dorothy",
      subheadline: "Golden Anniversary afternoon high tea & speeches",
      title: "Parmelia Hilton • Perth",
      venueName: "Parmelia Hilton Perth",
      venueAddress: "14 Mill St, Perth WA 6000",
    },
  },

  // ── 5. ADULT & MILESTONE BIRTHDAYS (6) ──────────────────────────────────
  {
    id: "birthday-sweet-16-tiara",
    name: "Sweet 16 Sparkling Tiara",
    category: "birthday-adult",
    categoryLabel: "Milestone Birthdays",
    occasionSlug: "birthday",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "scalloped",
    motif: "tiara-crown",
    badgeText: "Sweet Sixteen",
    summary:
      "Lilac-blush scalloped card topped with a glittering princess tiara for Sweet 16 birthday soirées.",
    tags: ["birthday", "16th", "sweet 16", "tiara", "teen", "party"],
    palette: verifiedPalette(
      {
        bg: "#FFF5FC",
        bgWarm: "#FAE5F5",
        surface: "#FFFFFF",
        ink: "#701A75",
        inkMuted: "#60356B",
        accent: "#D946EF",
        rule: "#F0ABFC",
      },
      false,
    ),
    sample: {
      hosts: "Sparkle, polaroids & starlight",
      headline: "Ava's Sweet 16",
      subheadline: "DJ, gelato cart & evening dancing",
      title: "Subiaco Arts Pavilion",
      venueName: "Subiaco Arts Centre",
      venueAddress: "180 Hamersley Rd, Subiaco WA 6008",
    },
  },
  {
    id: "birthday-21st-vintage-key",
    name: "21st Key to the Kingdom",
    category: "birthday-adult",
    categoryLabel: "Milestone Birthdays",
    occasionSlug: "birthday",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: false,
    cardShape: "arch",
    motif: "vintage-key-21",
    badgeText: "21st Birthday",
    summary:
      "Deep emerald-noir arch featuring an ornate vintage 21st birthday key emblem forged in gold foil.",
    tags: ["birthday", "21st", "key", "cocktail", "party", "milestone"],
    palette: verifiedPalette(
      {
        bg: "#0F1E1A",
        bgWarm: "#172E28",
        surface: "#142621",
        ink: "#F4FBF8",
        inkMuted: "#BCE0D4",
        accent: "#E5B95C",
        rule: "#E5B95C",
      },
      true,
    ),
    sample: {
      hosts: "Unlocking chapter twenty-one",
      headline: "Liam Turns 21",
      subheadline: "Grazing boards, cocktails & rooftop DJ",
      title: "Prince Lane Rooftop • Perth",
      venueName: "Prince Lane Rooftop",
      venueAddress: "356 Murray St, Perth WA 6000",
    },
  },
  {
    id: "birthday-30th-espresso-martini",
    name: "Thirty Espresso Martini Club",
    category: "birthday-adult",
    categoryLabel: "Milestone Birthdays",
    occasionSlug: "birthday",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "arch",
    mode: "CELEBRATION",
    free: false,
    cardShape: "ticket-stub",
    motif: "espresso-martini",
    badgeText: "30th Birthday",
    summary:
      "Moody café-noir VIP ticket stub showing an illustrated espresso martini coupe garnished with coffee beans.",
    tags: ["birthday", "30th", "espresso martini", "cocktail", "tini bit older", "party"],
    palette: verifiedPalette(
      {
        bg: "#1C1410",
        bgWarm: "#2B1F19",
        surface: "#231914",
        ink: "#FAF6F0",
        inkMuted: "#DECBB8",
        accent: "#D99B52",
        rule: "#B47B3E",
      },
      true,
    ),
    sample: {
      hosts: "A tini bit older",
      headline: "Tayla is Thirty",
      subheadline: "Espresso martinis, vinyl house & late-night bites",
      title: "Bar Lafayette • Brookfield Place",
      venueName: "Bar Lafayette",
      venueAddress: "125 St Georges Terrace, Perth WA 6000",
    },
  },
  {
    id: "birthday-40th-vintage-cellar",
    name: "40th Aged to Perfection Reserve",
    category: "birthday-adult",
    categoryLabel: "Milestone Birthdays",
    occasionSlug: "birthday",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "scroll-parchment",
    motif: "wine-crest",
    badgeText: "40th Birthday",
    summary:
      "Wine-estate parchment scroll card with vintage cabernet crest celebrating forty iconic years.",
    tags: ["birthday", "40th", "wine", "vintage", "dinner", "margaret river"],
    palette: verifiedPalette(
      {
        bg: "#FAF6F0",
        bgWarm: "#F2E9DD",
        surface: "#FFFFFF",
        ink: "#6B0F28",
        inkMuted: "#593A40",
        accent: "#9F1239",
        rule: "#C5A059",
      },
      false,
    ),
    sample: {
      hosts: "Aged to perfection",
      headline: "Ben's 40th Cellar Dinner",
      subheadline: "Five-course tasting menu & paired reserve reds",
      title: "Vasse Felix • Margaret River",
      venueName: "Vasse Felix Winery",
      venueAddress: "Caves Rd, Cowaramup WA 6284",
    },
  },
  {
    id: "birthday-50th-gatsby-art-deco",
    name: "50th Gatsby Art Deco Gala",
    category: "birthday-adult",
    categoryLabel: "Milestone Birthdays",
    occasionSlug: "birthday",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "arch",
    mode: "CELEBRATION",
    free: false,
    cardShape: "art-deco",
    motif: "art-deco-fan",
    badgeText: "50th Gold Gala",
    summary:
      "Dramatic Roaring Twenties black-and-brass sunburst archway crafted for glamorous 50th black-tie birthdays.",
    tags: ["birthday", "50th", "gatsby", "art deco", "gold", "gala"],
    palette: verifiedPalette(
      {
        bg: "#09090B",
        bgWarm: "#18181B",
        surface: "#121215",
        ink: "#FAFAFA",
        inkMuted: "#D4D4D8",
        accent: "#FACC15",
        rule: "#D4AF37",
      },
      true,
    ),
    sample: {
      hosts: "Golden 50th champagne tower",
      headline: "Victoria Turns 50",
      subheadline: "Jazz quartet & black-tie supper overlooking the quay",
      title: "The Ritz-Carlton • Elizabeth Quay",
      venueName: "The Ritz-Carlton Perth",
      venueAddress: "1 Barrack St, Perth WA 6000",
    },
  },
  {
    id: "birthday-60th-botanic-high-tea",
    name: "60th Diamond Botanic High Tea",
    category: "birthday-adult",
    categoryLabel: "Milestone Birthdays",
    occasionSlug: "birthday",
    templateSlug: "botanic-garden",
    themeId: "emerald-botanic",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: false,
    cardShape: "botanical-oval",
    motif: "birthday-cake",
    badgeText: "60th Celebration",
    summary:
      "Porcelain sage garden frame featuring a tiered birthday cake emblem for joyful 60th, 70th, and 80th teas.",
    tags: ["birthday", "60th", "70th", "80th", "high tea", "cake", "family"],
    palette: verifiedPalette(
      {
        bg: "#F4F7F4",
        bgWarm: "#E5EDE5",
        surface: "#FFFFFF",
        ink: "#1E422B",
        inkMuted: "#3E5C49",
        accent: "#B89650",
        rule: "#93B09D",
      },
      false,
    ),
    sample: {
      hosts: "Sixty bright years",
      headline: "Celebrating Susan",
      subheadline: "Botanical afternoon high tea, cake & jazz trio",
      title: "State Buildings Courtyard • Perth",
      venueName: "State Buildings Courtyard",
      venueAddress: "St Georges Terrace, Perth WA 6000",
    },
  },

  // ── 6. KIDS' BIRTHDAYS (4) ──────────────────────────────────────────────
  {
    id: "kids-wild-one-safari",
    name: "Wild One 1st Birthday Safari",
    category: "birthday-kids",
    categoryLabel: "Kids' Birthdays",
    occasionSlug: "birthday",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "polaroid",
    motif: "safari-lion",
    badgeText: "1st Birthday Safari",
    summary:
      "Cheerful savanna card with an illustrated baby lion cub wearing a crown for toddler & 1st birthdays.",
    tags: ["kids birthday", "1st birthday", "safari", "wild one", "lion", "child", "toddler"],
    palette: verifiedPalette(
      {
        bg: "#FFFBF2",
        bgWarm: "#FEF0D5",
        surface: "#FFFFFF",
        ink: "#78350F",
        inkMuted: "#614424",
        accent: "#D97706",
        rule: "#F59E0B",
      },
      false,
    ),
    sample: {
      hosts: "Our little cub turns ONE!",
      headline: "Leo's Wild One",
      subheadline: "Smash cake, animal balloons & picnic lawn fun",
      title: "Perth Zoo Picnic Lawns",
      venueName: "Perth Zoo Picnic Lawns",
      venueAddress: "20 Labouchere Rd, South Perth WA 6151",
    },
  },
  {
    id: "kids-fairy-butterfly-garden",
    name: "Enchanted Fairy Butterfly Tea",
    category: "birthday-kids",
    categoryLabel: "Kids' Birthdays",
    occasionSlug: "birthday",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "scalloped",
    motif: "fairy-butterfly",
    badgeText: "Fairy Party",
    summary:
      "Pastel blossom pink scalloped card graced with a sparkling star wand & pixie trail for kids' fairy parties.",
    tags: ["kids birthday", "fairy", "girls party", "butterfly", "magic", "pastel"],
    palette: verifiedPalette(
      {
        bg: "#FFF6FB",
        bgWarm: "#FDE8F5",
        surface: "#FFFFFF",
        ink: "#831843",
        inkMuted: "#66335A",
        accent: "#EC4899",
        rule: "#F9A8D4",
      },
      false,
    ),
    sample: {
      hosts: "Wings, wands & fairy dust",
      headline: "Mia's 5th Fairy Party",
      subheadline: "Face painting, bubble magic & cupcake decorating",
      title: "Hyde Park Gazebo • Highgate",
      venueName: "Hyde Park Gazebo",
      venueAddress: "Vincent St, Highgate WA 6003",
    },
  },
  {
    id: "kids-space-rocket-odyssey",
    name: "Blast Off Astronaut Rocket",
    category: "birthday-kids",
    categoryLabel: "Kids' Birthdays",
    occasionSlug: "birthday",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "arch",
    mode: "CELEBRATION",
    free: false,
    cardShape: "ticket-stub",
    motif: "space-rocket",
    badgeText: "Space Adventure",
    summary:
      "Galaxy boarding pass stamped with a launching astronaut rocket for kids' outer-space birthday missions.",
    tags: ["kids birthday", "space", "rocket", "astronaut", "boys party", "galaxy"],
    palette: verifiedPalette(
      {
        bg: "#091128",
        bgWarm: "#132046",
        surface: "#101B3B",
        ink: "#F8FAFC",
        inkMuted: "#C7D7F5",
        accent: "#38BDF8",
        rule: "#60A5FA",
      },
      true,
    ),
    sample: {
      hosts: "Three, two, one... blast off!",
      headline: "Noah Turns 6!",
      subheadline: "Galaxy slime lab, comet pizza & astronaut ice cream",
      title: "Scitech Discovery Courtyard",
      venueName: "Scitech Courtyard",
      venueAddress: "City West Centre, West Perth WA 6005",
    },
  },
  {
    id: "kids-hot-air-balloon",
    name: "Up, Up & Away Carousel",
    category: "birthday-kids",
    categoryLabel: "Kids' Birthdays",
    occasionSlug: "birthday",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "cloud-dream",
    motif: "hot-air-balloon",
    badgeText: "Kids' Adventure",
    summary:
      "Cloud-trimmed mint sky card lifting pastel striped hot air balloons high above toddler birthday picnics.",
    tags: ["kids birthday", "2nd birthday", "hot air balloon", "toddler", "clouds", "picnic"],
    palette: verifiedPalette(
      {
        bg: "#F5FCFA",
        bgWarm: "#E2F7F1",
        surface: "#FFFFFF",
        ink: "#0F4C5C",
        inkMuted: "#365B66",
        accent: "#F97316",
        rule: "#5EEAD4",
      },
      false,
    ),
    sample: {
      hosts: "Two-rrific adventures await!",
      headline: "Oliver's 2nd Birthday",
      subheadline: "Balloon twister, lawn games & sunshine cake",
      title: "Synergy Parkland • Kings Park",
      venueName: "Kings Park Synergy Parkland",
      venueAddress: "May Dr, West Perth WA 6005",
    },
  },

  // ── 7. DOG BIRTHDAYS & PET CELEBRATIONS (5) ─────────────────────────────
  {
    id: "pet-dog-barkday-pawty",
    name: "Dog Barkday Golden Pawty",
    category: "pet-birthday",
    categoryLabel: "Dog & Pet Birthdays",
    occasionSlug: "birthday",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "paw-badge",
    motif: "dog-party-hat",
    badgeText: "Dog Birthday",
    summary:
      "Playful paw-cornered invitation spotlighting a happy dog in a striped party hat with a birthday bone treat.",
    tags: ["dog birthday", "barkday", "dog", "puppy", "pet birthday", "pawty"],
    palette: verifiedPalette(
      {
        bg: "#FFFBF0",
        bgWarm: "#FEF0D2",
        surface: "#FFFFFF",
        ink: "#7C2D12",
        inkMuted: "#5E3F22",
        accent: "#EA580C",
        rule: "#F59E0B",
      },
      false,
    ),
    sample: {
      hosts: "Bones, belly rubs & pupcakes!",
      headline: "Barnaby's 3rd Barkday",
      subheadline: "Bring your good boys & girls for zoomies & treats",
      title: "South Beach Dog Lawn • Fremantle",
      venueName: "South Beach Dog Park Lawn",
      venueAddress: "Ocean Dr, South Fremantle WA 6162",
    },
  },
  {
    id: "pet-pampered-pooch-couture",
    name: "Pampered Pooch Poodle Couture",
    category: "pet-birthday",
    categoryLabel: "Dog & Pet Birthdays",
    occasionSlug: "birthday",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "scalloped",
    motif: "poodle-couture",
    badgeText: "Pampered Pooch",
    summary:
      "Boutique blush-pink poodle card in pearls and silk bow designed for puppuccino brunches & spoiled dogs.",
    tags: ["dog birthday", "poodle", "cavoodle", "pink dog", "pet birthday", "puppy shower"],
    palette: verifiedPalette(
      {
        bg: "#FFF5F8",
        bgWarm: "#FCE4EC",
        surface: "#FFFFFF",
        ink: "#831843",
        inkMuted: "#6B3048",
        accent: "#DB2777",
        rule: "#F472B6",
      },
      false,
    ),
    sample: {
      hosts: "Yappy Birthday to our favourite diva",
      headline: "Coco's 2nd Birthday",
      subheadline: "Puppuccinos for paws, croissants & bubbles for humans",
      title: "Café Lawn • Nedlands WA",
      venueName: "Little French Dog Café Lawn",
      venueAddress: "Stirling Hwy, Nedlands WA 6009",
    },
  },
  {
    id: "pet-puppy-first-woof-picnic",
    name: "Puppy's 1st Woof Park Picnic",
    category: "pet-birthday",
    categoryLabel: "Dog & Pet Birthdays",
    occasionSlug: "birthday",
    templateSlug: "botanic-garden",
    themeId: "emerald-botanic",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: false,
    cardShape: "polaroid",
    motif: "puppy-bone-ball",
    badgeText: "Puppy 1st Woof",
    summary:
      "Fresh lawn-green park picnic frame illustrating a bouncy tennis ball & peanut-butter dog bone.",
    tags: ["puppy birthday", "dog birthday", "1st woof", "dog park", "fetch", "pet"],
    palette: verifiedPalette(
      {
        bg: "#F4FBF4",
        bgWarm: "#E0F5E2",
        surface: "#FFFFFF",
        ink: "#14532D",
        inkMuted: "#2E5734",
        accent: "#16A34A",
        rule: "#86EFAC",
      },
      false,
    ),
    sample: {
      hosts: "One whole year of tail wags!",
      headline: "Milo's 1st Woof Day",
      subheadline: "Fetch tournament, carob cake & shady dog park blankets",
      title: "Sir James Mitchell Park • South Perth",
      venueName: "Sir James Mitchell Dog Area",
      venueAddress: "Mill Point Rd, South Perth WA 6151",
    },
  },
  {
    id: "pet-kitty-crown-birthday",
    name: "Kitty's Purr-fect Royal Birthday",
    category: "pet-birthday",
    categoryLabel: "Dog & Pet Birthdays",
    occasionSlug: "birthday",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "arch",
    mode: "CELEBRATION",
    free: true,
    cardShape: "arch",
    motif: "cat-crown-whiskers",
    badgeText: "Cat Birthday",
    summary:
      "Playful lilac-lavender arch featuring a crowned feline monarch and neat whiskers for spoiled house cats.",
    tags: ["cat birthday", "kitty", "kitten", "purrfect", "pet birthday", "feline"],
    palette: verifiedPalette(
      {
        bg: "#F7F4FF",
        bgWarm: "#EBE4FD",
        surface: "#FFFFFF",
        ink: "#4C1D95",
        inkMuted: "#4E3A78",
        accent: "#7C3AED",
        rule: "#A78BFA",
      },
      false,
    ),
    sample: {
      hosts: "Summoning loyal human subjects",
      headline: "Duchess Luna is 4!",
      subheadline: "Tuna cake, catnip lounge & afternoon tea",
      title: "Luna's Sunroom • Mt Lawley",
      venueName: "Mt Lawley Conservatory",
      venueAddress: "Beaufort St, Mount Lawley WA 6050",
    },
  },
  {
    id: "pet-gotcha-day-adoption",
    name: "Fur-ever Family Gotcha Day",
    category: "pet-birthday",
    categoryLabel: "Dog & Pet Birthdays",
    occasionSlug: "anniversary",
    templateSlug: "modern-minimal",
    themeId: "alabaster-platinum",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "polaroid",
    motif: "paw-heart-gotcha",
    badgeText: "Pet Gotcha Day",
    summary:
      "Warm teal-and-honey card centred on a heart-inside-paw emblem celebrating rescue dog & cat adoption anniversaries.",
    tags: ["gotcha day", "dog adoption", "rescue dog", "pet anniversary", "dog", "cat"],
    palette: verifiedPalette(
      {
        bg: "#F4FAFA",
        bgWarm: "#E0F2F2",
        surface: "#FFFFFF",
        ink: "#115E59",
        inkMuted: "#2D595E",
        accent: "#0D9488",
        rule: "#F59E0B",
      },
      false,
    ),
    sample: {
      hosts: "Two years since she rescued us right back",
      headline: "Bella's 2nd Gotcha Day",
      subheadline: "Celebrating adoption, love & endless zoomies",
      title: "Victoria Park Courtyard • Perth",
      venueName: "Victoria Park Garden",
      venueAddress: "Albany Hwy, Victoria Park WA 6100",
    },
  },

  // ── 8. BABY SHOWER — GIRL (2) ───────────────────────────────────────────
  {
    id: "baby-girl-vintage-pram",
    name: "Baby Girl Vintage Lace Pram",
    category: "baby-shower-girl",
    categoryLabel: "Baby Shower (Girl)",
    occasionSlug: "baby-shower",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "scalloped",
    motif: "baby-girl-pram",
    badgeText: "Baby Girl Shower",
    summary:
      "Delicate blush pink scalloped card illustrated with a vintage lace baby carriage and dainty satin bow.",
    tags: ["baby shower", "baby girl", "girl", "its a girl", "pink", "pram", "princess"],
    palette: verifiedPalette(
      {
        bg: "#FFF5F8",
        bgWarm: "#FCE4EC",
        surface: "#FFFFFF",
        ink: "#832148",
        inkMuted: "#6B384C",
        accent: "#E17B9E",
        rule: "#F2B8CD",
      },
      false,
    ),
    sample: {
      hosts: "A sweet baby girl is on her way!",
      headline: "Honouring Grace",
      subheadline: "Macaron high tea, nursery books & pink blooms",
      title: "Caversham House Garden Conservatory",
      venueName: "Caversham House Conservatory",
      venueAddress: "141 Caversham Ave, Caversham WA 6055",
    },
  },
  {
    id: "baby-girl-butterfly-kisses",
    name: "Baby Girl Butterfly Kisses",
    category: "baby-shower-girl",
    categoryLabel: "Baby Shower (Girl)",
    occasionSlug: "baby-shower",
    templateSlug: "botanic-garden",
    themeId: "emerald-botanic",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: false,
    cardShape: "botanical-oval",
    motif: "baby-girl-butterfly",
    badgeText: "It's a Girl!",
    summary:
      "Warm peach-blossom botanical oval adorned with fluttering butterflies welcoming a sweet baby daughter.",
    tags: ["baby shower", "girl", "butterfly", "rosebud", "peach", "blush"],
    palette: verifiedPalette(
      {
        bg: "#FFF7F4",
        bgWarm: "#FDE7DF",
        surface: "#FFFFFF",
        ink: "#8C3320",
        inkMuted: "#6E3E35",
        accent: "#E8846B",
        rule: "#F4B4A2",
      },
      false,
    ),
    sample: {
      hosts: "Butterfly kisses & little wishes",
      headline: "Welcoming Baby Sophia",
      subheadline: "Join us to shower Mama-to-Be & baby girl with love",
      title: "The Botanical Café • Kings Park",
      venueName: "Kings Park Botanical Café",
      venueAddress: "Fraser Ave, West Perth WA 6005",
    },
  },

  // ── 9. BABY SHOWER — BOY (2) ────────────────────────────────────────────
  {
    id: "baby-boy-little-prince",
    name: "Baby Boy Little Prince Crown",
    category: "baby-shower-boy",
    categoryLabel: "Baby Shower (Boy)",
    occasionSlug: "baby-shower",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "crest-shield",
    motif: "baby-boy-prince-crown",
    badgeText: "Baby Boy Shower",
    summary:
      "Powder-blue royal crest shield topped with a Little Prince golden crown welcoming a sweet baby boy.",
    tags: ["baby shower", "baby boy", "boy", "its a boy", "irl boy", "prince", "blue"],
    palette: verifiedPalette(
      {
        bg: "#F3F8FE",
        bgWarm: "#E1EEFC",
        surface: "#FFFFFF",
        ink: "#1E40AF",
        inkMuted: "#334E73",
        accent: "#3B82F6",
        rule: "#93C5FD",
      },
      false,
    ),
    sample: {
      hosts: "A little prince is arriving soon!",
      headline: "Hannah & Tom's Baby Boy",
      subheadline: "Blueberry tarts, games & celebration by the marina",
      title: "Hillarys Yacht Club • Harbour View",
      venueName: "Hillarys Yacht Club",
      venueAddress: "65 Northside Dr, Hillarys WA 6025",
    },
  },
  {
    id: "baby-boy-ahoy-sailor",
    name: "Baby Boy Ahoy Sailor Boy",
    category: "baby-shower-boy",
    categoryLabel: "Baby Shower (Boy)",
    occasionSlug: "baby-shower",
    templateSlug: "modern-minimal",
    themeId: "alabaster-platinum",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "octagon",
    motif: "baby-boy-sailboat",
    badgeText: "It's a Boy!",
    summary:
      "Crisp sky-blue maritime octagonal card featuring a wooden sailboat & anchor celebrating an arriving baby boy.",
    tags: ["baby shower", "boy", "baby boy", "sailor", "nautical", "blue", "boat"],
    palette: verifiedPalette(
      {
        bg: "#F2F7FB",
        bgWarm: "#DFECF6",
        surface: "#FFFFFF",
        ink: "#0C4A6E",
        inkMuted: "#314F69",
        accent: "#0284C7",
        rule: "#7DD3FC",
      },
      false,
    ),
    sample: {
      hosts: "Sailing into parenthood!",
      headline: "Ahoy! Baby Oliver",
      subheadline: "Harbour brunch to welcome our little first mate",
      title: "Fremantle Sailing Club Wardroom",
      venueName: "Fremantle Sailing Club",
      venueAddress: "151 Marine Terrace, Fremantle WA 6160",
    },
  },

  // ── 10. BABY SHOWER NEUTRAL & GENDER REVEAL (2) ─────────────────────────
  {
    id: "baby-neutral-moon-teddy",
    name: "Over The Moon Nursery Bear",
    category: "baby-shower-neutral",
    categoryLabel: "Neutral & Gender Reveal",
    occasionSlug: "baby-shower",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "cloud-dream",
    motif: "baby-neutral-moon-bear",
    badgeText: "Gender Neutral",
    summary:
      "Cozy oat-beige cloud frame illustrating a sleeping teddy bear nestled inside a golden crescent moon.",
    tags: ["baby shower", "neutral", "teddy bear", "bearly wait", "beige", "unisex"],
    palette: verifiedPalette(
      {
        bg: "#FCF9F2",
        bgWarm: "#F4ECDB",
        surface: "#FFFFFF",
        ink: "#61411B",
        inkMuted: "#594834",
        accent: "#C59B5F",
        rule: "#DECBA8",
      },
      false,
    ),
    sample: {
      hosts: "We can bear-ly wait!",
      headline: "Rachel & Daniel's Baby",
      subheadline: "Teddy bear picnic, storybooks & afternoon tea",
      title: "The Conservatory Tea Room • Como",
      venueName: "Como Conservatory Room",
      venueAddress: "Labouchere Rd, Como WA 6152",
    },
  },
  {
    id: "baby-gender-reveal-booties",
    name: "Twinkle Little Star Reveal",
    category: "baby-shower-neutral",
    categoryLabel: "Neutral & Gender Reveal",
    occasionSlug: "baby-shower",
    templateSlug: "modern-minimal",
    themeId: "alabaster-platinum",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "arch",
    motif: "gender-reveal-booties",
    badgeText: "Gender Reveal",
    summary:
      "Dreamy rose-and-sky pastel gradient arch showcasing twin pink & blue baby booties for Gender Reveal parties.",
    tags: ["gender reveal", "boy or girl", "pink or blue", "baby", "reveal", "twinkle"],
    palette: verifiedPalette(
      {
        bg: "#F8F7FC",
        bgWarm: "#EFEBF8",
        surface: "#FFFFFF",
        ink: "#4338CA",
        inkMuted: "#4B436E",
        accent: "#8B5CF6",
        rule: "#D8B4FE",
      },
      false,
    ),
    sample: {
      hosts: "Pink or Blue, what is the clue?",
      headline: "He or She? Come See!",
      subheadline: "Wear your team colour to cast your vote before the reveal",
      title: "Claremont Rose Garden Lawn",
      venueName: "Claremont Park Rose Garden",
      venueAddress: "Stirling Hwy, Claremont WA 6010",
    },
  },

  // ── 11. CHRISTENING, BAPTISM & NAMING (3) ───────────────────────────────
  {
    id: "naming-baptism-white-dove",
    name: "Christening Dove & Olive",
    category: "religious-naming",
    categoryLabel: "Christening & Naming",
    occasionSlug: "cultural-celebration",
    templateSlug: "modern-minimal",
    themeId: "alabaster-platinum",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: true,
    cardShape: "arch",
    motif: "dove-olive-branch",
    badgeText: "Baptism & Christening",
    summary:
      "Porcelain alabaster arch graced with a hand-drawn peace dove and olive sprig for christenings & baptisms.",
    tags: ["christening", "baptism", "naming", "baby", "dove", "blessing"],
    palette: verifiedPalette(
      {
        bg: "#FAFAF8",
        bgWarm: "#F2EFE9",
        surface: "#FFFFFF",
        ink: "#2F3947",
        inkMuted: "#475466",
        accent: "#B89650",
        rule: "#D4C4A1",
      },
      false,
    ),
    sample: {
      hosts: "Bless this child with joy",
      headline: "Baptism of Lucas",
      subheadline: "Morning sanctuary blessing followed by family lunch",
      title: "St George's Cathedral • Perth",
      venueName: "St George's Cathedral",
      venueAddress: "38 St Georges Terrace, Perth WA 6000",
    },
  },
  {
    id: "naming-mitzvah-sapphire",
    name: "Bar & Bat Mitzvah Sapphire Foil",
    category: "religious-naming",
    categoryLabel: "Christening & Naming",
    occasionSlug: "cultural-celebration",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "arch",
    mode: "CELEBRATION",
    free: false,
    cardShape: "double-arch",
    motif: "star-of-david",
    badgeText: "Bar / Bat Mitzvah",
    summary:
      "Deep azure sapphire arch engraved with an ornate Star of David medallion and sterling champagne highlights.",
    tags: ["bar mitzvah", "bat mitzvah", "jewish", "ceremony", "sapphire"],
    palette: verifiedPalette(
      {
        bg: "#0F223D",
        bgWarm: "#173259",
        surface: "#13294B",
        ink: "#F8FAFC",
        inkMuted: "#C7D8ED",
        accent: "#93C5FD",
        rule: "#C5A059",
      },
      true,
    ),
    sample: {
      hosts: "Mazel Tov & Celebration",
      headline: "Arielle's Bat Mitzvah",
      subheadline: "Morning service followed by family banquet & dance",
      title: "Perth Hebrew Congregation Ballroom",
      venueName: "Perth Hebrew Congregation",
      venueAddress: "28 Freedman Rd, Menora WA 6050",
    },
  },
  {
    id: "naming-aqiqah-golden-lantern",
    name: "Aqiqah & Eid Golden Lantern",
    category: "religious-naming",
    categoryLabel: "Christening & Naming",
    occasionSlug: "cultural-celebration",
    templateSlug: "botanic-garden",
    themeId: "emerald-botanic",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: false,
    cardShape: "mihrab-arch",
    motif: "crescent-lantern",
    badgeText: "Eid & Aqiqah",
    summary:
      "Royal emerald mihrab silhouette lit by golden Ramadan/Eid lanterns and crescent moon celebrating naming & Eid.",
    tags: ["eid", "aqiqah", "baby naming", "crescent", "lantern", "emerald"],
    palette: verifiedPalette(
      {
        bg: "#0B291E",
        bgWarm: "#123D2D",
        surface: "#0F3325",
        ink: "#FAF7EE",
        inkMuted: "#C0E3D2",
        accent: "#E8C067",
        rule: "#E8C067",
      },
      true,
    ),
    sample: {
      hosts: "Blessing, prayer & hospitality",
      headline: "Aqiqah of Baby Zayd",
      subheadline: "Family thanksgiving dinner & sweet treats",
      title: "Pan Pacific Perth Ballroom",
      venueName: "Pan Pacific Perth",
      venueAddress: "207 Adelaide Terrace, Perth WA 6000",
    },
  },

  // ── 12. BRIDAL SHOWER, GRADUATION & HOUSEWARMING (3) ────────────────────
  {
    id: "lifestyle-bridal-miss-to-mrs",
    name: "Bridal Brunch Miss To Mrs",
    category: "lifestyle-milestone",
    categoryLabel: "Bridal, Grad & Home",
    occasionSlug: "other-celebration",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: true,
    cardShape: "scalloped",
    motif: "champagne-coupes",
    badgeText: "Bridal Shower",
    summary:
      "French-bakery blush cream invitation celebrating the bride-to-be with ribbon bows & bellini brunch.",
    tags: ["bridal shower", "kitchen tea", "hens", "bride", "brunch", "pink"],
    palette: verifiedPalette(
      {
        bg: "#FFF9F9",
        bgWarm: "#FBECEE",
        surface: "#FFFFFF",
        ink: "#881337",
        inkMuted: "#6B3848",
        accent: "#E11D48",
        rule: "#FDA4AF",
      },
      false,
    ),
    sample: {
      hosts: "From Miss to Mrs.",
      headline: "Emily's Kitchen Tea",
      subheadline: "Prosecco brunch, bridal trivia & sunlit blooms",
      title: "Guildford Hotel Conservatory",
      venueName: "The Guildford Hotel",
      venueAddress: "159 James St, Guildford WA 6055",
    },
  },
  {
    id: "lifestyle-graduation-honours",
    name: "Graduation Academic Honours",
    category: "lifestyle-milestone",
    categoryLabel: "Bridal, Grad & Home",
    occasionSlug: "graduation",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "arch",
    mode: "CELEBRATION",
    free: false,
    cardShape: "crest-shield",
    motif: "graduation-cap",
    badgeText: "Graduation Honours",
    summary:
      "Prestige university navy shield displaying a gold-tasseled mortarboard celebrating degrees, PhDs & honours.",
    tags: ["graduation", "university", "phd", "degree", "honours", "dinner"],
    palette: verifiedPalette(
      {
        bg: "#101B2E",
        bgWarm: "#192A47",
        surface: "#14223B",
        ink: "#F8FAFC",
        inkMuted: "#CBD5E1",
        accent: "#EAB308",
        rule: "#EAB308",
      },
      true,
    ),
    sample: {
      hosts: "Hats off to the graduate!",
      headline: "Class of 2026 • Dr. Zara",
      subheadline: "Celebrating Doctor of Medicine graduation dinner",
      title: "UWA University Club • Crawley",
      venueName: "The University Club of WA",
      venueAddress: "Hackett Dr, Crawley WA 6009",
    },
  },
  {
    id: "lifestyle-housewarming-key",
    name: "Housewarming Key & Olive",
    category: "lifestyle-milestone",
    categoryLabel: "Bridal, Grad & Home",
    occasionSlug: "other-celebration",
    templateSlug: "botanic-garden",
    themeId: "emerald-botanic",
    gateStyle: "ribbon",
    mode: "CELEBRATION",
    free: false,
    cardShape: "polaroid",
    motif: "house-key-olive",
    badgeText: "Housewarming",
    summary:
      "Warm architectural linen card displaying a new-home silhouette for backyard woodfired housewarmings.",
    tags: ["housewarming", "new home", "keys", "bbq", "dinner", "olive"],
    palette: verifiedPalette(
      {
        bg: "#FAF9F5",
        bgWarm: "#EFECE0",
        surface: "#FFFFFF",
        ink: "#2F4A10",
        inkMuted: "#475745",
        accent: "#65A30D",
        rule: "#A3B88C",
      },
      false,
    ),
    sample: {
      hosts: "New home, new keys, same friends!",
      headline: "Daniel & Mei's Place",
      subheadline: "Cheeseboards, woodfired pizza & backyard drinks",
      title: "Applecross Residence • WA",
      venueName: "Applecross Residence",
      venueAddress: "Applecross WA 6153",
    },
  },

  // ── 13. CORPORATE GALAS & CHARITY BALLS (2) ─────────────────────────────
  {
    id: "corporate-black-tie-monolith",
    name: "Executive Black-Tie Gala Pass",
    category: "corporate-gala",
    categoryLabel: "Corporate Galas",
    occasionSlug: "corporate-event",
    templateSlug: "celestial-evening",
    themeId: "midnight-celestial",
    gateStyle: "arch",
    mode: "CELEBRATION",
    free: false,
    cardShape: "art-deco",
    motif: "trophy-gala",
    badgeText: "Annual Gala",
    summary:
      "Architectural obsidian and brushed bronze VIP pass built for corporate awards nights and leadership dinners.",
    tags: ["corporate", "gala", "awards", "business", "black tie", "vip"],
    palette: verifiedPalette(
      {
        bg: "#0A0A0C",
        bgWarm: "#17171C",
        surface: "#121216",
        ink: "#FAFAFA",
        inkMuted: "#C7C7D1",
        accent: "#D4AF37",
        rule: "#71717A",
      },
      true,
    ),
    sample: {
      hosts: "Annual Leadership & Innovation",
      headline: "WA Excellence Awards",
      subheadline: "Pre-dinner networking, keynote address & awards supper",
      title: "Perth Convention Centre BelleVue",
      venueName: "Perth Convention Centre",
      venueAddress: "21 Mounts Bay Rd, Perth WA 6000",
    },
  },
  {
    id: "corporate-charity-ball-emerald",
    name: "Philanthropy & Charity Soirée",
    category: "corporate-gala",
    categoryLabel: "Corporate Galas",
    occasionSlug: "corporate-event",
    templateSlug: "botanic-garden",
    themeId: "emerald-botanic",
    gateStyle: "wax-seal",
    mode: "CELEBRATION",
    free: false,
    cardShape: "double-arch",
    motif: "anniversary-laurel",
    badgeText: "Charity Ball",
    summary:
      "Jewel-emerald and champagne silk invitation tailored for charity fundraisers, auctions & orchestral balls.",
    tags: ["charity", "fundraiser", "ball", "gala", "community", "black tie"],
    palette: verifiedPalette(
      {
        bg: "#0E291F",
        bgWarm: "#163B2D",
        surface: "#123226",
        ink: "#F6FAF7",
        inkMuted: "#BBE0CF",
        accent: "#D4AF37",
        rule: "#D4AF37",
      },
      true,
    ),
    sample: {
      hosts: "An evening of generosity & hope",
      headline: "Founders Charity Ball",
      subheadline: "Silent auction, three-course dinner & live orchestra",
      title: "Crown Astral Ballroom",
      venueName: "Crown Astral Ballroom",
      venueAddress: "Great Eastern Hwy, Burswood WA 6100",
    },
  },

  // ── 14. MEMORIAL & CELEBRATION OF LIFE (3) — MEMORIAL MODE STRICT ───────
  {
    id: "memorial-alabaster-eucalyptus",
    name: "Alabaster Eucalyptus Sanctuary",
    category: "memorial",
    categoryLabel: "Memorial & Tributes",
    occasionSlug: "celebration-of-life",
    templateSlug: "memorial-calm",
    themeId: "memorial-alabaster",
    gateStyle: "plain-fade",
    mode: "MEMORIAL",
    free: true,
    cardShape: "memorial-tablet",
    motif: "memorial-eucalyptus",
    badgeText: "Memorial Service",
    summary:
      "Calm alabaster tablet with soft bronze fine rule, tribute book space, and dignified plain fade entrance.",
    tags: ["memorial", "funeral", "celebration of life", "eucalyptus", "tribute", "remembrance"],
    palette: verifiedPalette(
      {
        bg: "#F8F9FA",
        bgWarm: "#F1F5F9",
        surface: "#FFFFFF",
        ink: "#1E293B",
        inkMuted: "#475569",
        accent: "#8C7A6B",
        rule: "#CBD5E1",
      },
      false,
    ),
    sample: {
      hosts: "The Hart family",
      headline: "Rosemary Ellen Hart",
      subheadline: "Celebrating a gentle life in gratitude & quiet remembrance",
      title: "Karrakatta Memorial Chapel",
      venueName: "Karrakatta Memorial Chapel",
      venueAddress: "Railway Rd, Karrakatta WA 6010",
    },
  },
  {
    id: "memorial-slate-linen-calm",
    name: "Slate & Linen Remembrance",
    category: "memorial",
    categoryLabel: "Memorial & Tributes",
    occasionSlug: "memorial-service",
    templateSlug: "memorial-linen",
    themeId: "memorial-slate",
    gateStyle: "plain-fade",
    mode: "MEMORIAL",
    free: true,
    cardShape: "memorial-tablet",
    motif: "dove-olive-branch",
    badgeText: "Celebration of Life",
    summary:
      "Understated slate and warm linen palette crafted for funeral services, readings & cherished tribute books.",
    tags: ["memorial", "wake", "linen", "slate", "funeral", "remembrance"],
    palette: verifiedPalette(
      {
        bg: "#F5F5F4",
        bgWarm: "#E7E5E4",
        surface: "#FFFFFF",
        ink: "#1C1917",
        inkMuted: "#57534E",
        accent: "#78716C",
        rule: "#D6D3D1",
      },
      false,
    ),
    sample: {
      hosts: "The Bennett family",
      headline: "Arthur James Bennett",
      subheadline: "In loving memory • Service and afternoon fellowship",
      title: "Pinnaroo Memorial Sanctuary",
      venueName: "Pinnaroo Valley Memorial Park",
      venueAddress: "Whitfords Ave, Padbury WA 6025",
    },
  },
  {
    id: "memorial-warm-bronze-tribute",
    name: "Warm Bronze Memory Tablet",
    category: "memorial",
    categoryLabel: "Memorial & Tributes",
    occasionSlug: "wake",
    templateSlug: "memorial-calm",
    themeId: "memorial-alabaster",
    gateStyle: "plain-fade",
    mode: "MEMORIAL",
    free: true,
    cardShape: "memorial-tablet",
    motif: "memorial-eucalyptus",
    badgeText: "Tribute & Wake",
    summary:
      "Warm sand and bronze-ink remembrance tablet offering quiet clarity for 40th-day tributes, wakes, and streams.",
    tags: ["memorial", "tribute", "wake", "bronze", "condolence", "service"],
    palette: verifiedPalette(
      {
        bg: "#FAF8F5",
        bgWarm: "#EFEBE4",
        surface: "#FFFFFF",
        ink: "#292524",
        inkMuted: "#575049",
        accent: "#8C7A6B",
        rule: "#D6CFC5",
      },
      false,
    ),
    sample: {
      hosts: "With enduring gratitude",
      headline: "Prof. Dariush Shirazi",
      subheadline: "40th-day remembrance gathering & condolence book",
      title: "Kings Park Memorial Oak Grove",
      venueName: "Kings Park Memorial Oak Grove",
      venueAddress: "May Dr, Kings Park WA 6005",
    },
  },
];

export interface CardDemoContent {
  title: string;
  hosts: string;
  headline: string;
  subheadline: string;
  venue: {
    name: string;
    address: string;
    parking: string;
  };
  dressCode: string;
  wording: string;
  story: string[];
  schedule: ReadonlyArray<{
    id: string;
    time: string;
    title: string;
    description: string;
    location: string;
  }>;
  wellMessage: string;
}

interface CategoryDemoTemplate {
  parking: string;
  dressCode: string;
  wording: (d: OccasionCardDesign) => string;
  story: (d: OccasionCardDesign) => string[];
  schedule: (d: OccasionCardDesign) => CardDemoContent["schedule"];
  wellMessage: string;
}

const CATEGORY_DEMO_TEMPLATES: Record<CardDesignCategory, CategoryDemoTemplate> = {
  wedding: {
    parking: "Complimentary valet and accessible bays near the main sandstone entrance.",
    dressCode:
      "Black-tie optional • Long gowns, dark suits and comfortable footwear for lawn drinks",
    wording: (d) =>
      `${d.sample.hosts} warmly invite you to join ${d.sample.headline} at ${d.sample.venueName} for our ceremony and evening reception.\n\nKindly share your attendance and any dietary requirements via the RSVP section below so every course is prepared with care.`,
    story: (d) => [
      `Planned around the "${d.name}" aesthetic (${d.badgeText}), this celebration brings together family and lifelong friends in Perth.`,
      `${d.summary} Every detail from welcome champagne to the final dance takes place in one effortless setting.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "15:30",
        title: "Guest arrival & acoustic strings",
        description: "Find your seat before the processional begins.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "16:00",
        title: "Ceremony & exchange of vows",
        description: "Garden vows followed by group photographs.",
        location: `${d.sample.venueName} Lawn`,
      },
      {
        id: `${d.id}-3`,
        time: "17:15",
        title: "Canapés & sunset aperitifs",
        description: "WA seafood, sparkling wine and lawn mingling.",
        location: `${d.sample.venueName} Terrace`,
      },
      {
        id: `${d.id}-4`,
        time: "18:45",
        title: "Seated dinner, speeches & dancing",
        description: "Three-course banquet and late-night espresso cart.",
        location: `${d.sample.venueName} Hall`,
      },
    ],
    wellMessage:
      "Having you celebrate with us in person is the greatest gift. For those who wish to give, a wishing well contribution toward our future home is warmly appreciated.",
  },
  "cultural-ceremony": {
    parking: "Dedicated valet drop-off and lift access directly into the main hall foyer.",
    dressCode: "Formal cultural attire or black-tie • Rich jewel tones and traditional silhouettes",
    wording: (d) =>
      `${d.sample.hosts} joyfully invite you to celebrate ${d.sample.headline} (${d.sample.title}) at ${d.sample.venueName}.\n\nPlease confirm your household attendance and dietary preferences below so we can welcome every elder and family guest with honour.`,
    story: (d) => [
      `Inspired by our heritage rituals, "${d.name}" frames ${d.sample.title} with poetry, calligraphy and shared blessings.`,
      `From sweet saffron tea and mirror-and-candlestick traditions to joyful music with family, we cannot wait to share this evening with you.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "16:30",
        title: "Welcoming tea, sweets & poetry",
        description: "Persian rosewater pastries and family portraits on arrival.",
        location: `${d.sample.venueName} Foyer`,
      },
      {
        id: `${d.id}-2`,
        time: "17:30",
        title: `${d.badgeText} ceremony & blessings`,
        description: "Traditional spread, blessings from elders and ceremonial music.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-3`,
        time: "19:00",
        title: "Festive banquet & live ensemble",
        description: "Saffron rice feast, grilled platters and live santoor.",
        location: `${d.sample.venueName} Banquet Room`,
      },
      {
        id: `${d.id}-4`,
        time: "21:00",
        title: "Knife dance, cake & celebration",
        description: "Group dancing and late-night cardamom tea service.",
        location: `${d.sample.venueName} Ballroom`,
      },
    ],
    wellMessage:
      "Your blessings and presence around our ceremonial table mean everything to our families. No boxed gifts needed; a wishing card on the evening is deeply appreciated.",
  },
  engagement: {
    parking:
      "Metered street parking nearby and step-free lift entry from the main street entrance.",
    dressCode: "Cocktail chic • Elevated evening textures with a celebratory sparkle",
    wording: (d) =>
      `${d.sample.hosts} are thrilled to invite you to celebrate ${d.sample.headline} at ${d.sample.venueName}.\n\nRaise a glass with us, leave a note in our keepsake wishes book, and let us know if you have any allergies below.`,
    story: (d) => [
      `After saying yes here in Western Australia, we wanted a warm night surrounded by the people who know us best.`,
      `Designed with the "${d.name}" theme, expect cold champagne, golden hour views and zero speeches longer than two minutes.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "17:30",
        title: "Champagne coupe welcome",
        description: "Signature spritz on arrival while guests gather.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "18:30",
        title: "Grazing tables & antipasti",
        description: "Seasonal oysters, artisan cheeses and woodfired flatbreads.",
        location: `${d.sample.venueName} Deck`,
      },
      {
        id: `${d.id}-3`,
        time: "20:00",
        title: "Engagement toast & champagne tower",
        description: "Short words from family and friends.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-4`,
        time: "20:45",
        title: "DJ set & dessert bites",
        description: "Mini pavlovas, espresso martinis and dancing.",
        location: `${d.sample.venueName} Lounge`,
      },
    ],
    wellMessage:
      "Your company to celebrate our engagement is truly all we ask for! Cards and warm wishes are always welcome at the door.",
  },
  anniversary: {
    parking: "Direct drop-off bay at the main porte-cochère and nearby guest parking.",
    dressCode: "Lounge suit or cocktail elegance • Touches of metallic gold, ruby or pearl welcome",
    wording: (d) =>
      `${d.sample.hosts} invite you to honour ${d.sample.headline} at ${d.sample.venueName} for ${d.sample.title}.\n\nJoin family across generations for a celebratory dinner, cherished memories and a milestone toast.`,
    story: (d) => [
      `Years of shared adventures, Sunday roasts and growing family deserve a proper gathering styled in "${d.name}".`,
      `We would love you to share a favourite memory in the wishes book below before we raise our glasses at ${d.sample.venueName}.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "18:00",
        title: "Welcome drinks & photo gallery",
        description: "Browse framed snapshots from every decade together.",
        location: `${d.sample.venueName} Atrium`,
      },
      {
        id: `${d.id}-2`,
        time: "18:45",
        title: "Milestone dinner service",
        description: "Long-table supper celebrating years of companionship.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-3`,
        time: "20:15",
        title: "Jubilee toast & cutting the cake",
        description: "Words from children, grandchildren and oldest friends.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-4`,
        time: "21:00",
        title: "Live jazz & anniversary waltz",
        description: "Tea, coffee and petit fours to close a joyful evening.",
        location: `${d.sample.venueName} Lounge`,
      },
    ],
    wellMessage:
      "Please bring nothing more than your stories and warm smiles — no gifts, only the pleasure of your company at our table.",
  },
  "birthday-adult": {
    parking: "Close rideshare drop-off at the venue courtyard and weekend parking adjacent.",
    dressCode: "Dressed to celebrate • Festive evening wear matching the milestone vibe",
    wording: (d) =>
      `${d.sample.hosts} invite you to celebrate ${d.sample.headline} — ${d.sample.subheadline} at ${d.sample.venueName}.\n\nRSVP below with any dietary requirements so the kitchen and bar team can look after your crew properly.`,
    story: (d) => [
      `Why celebrate quietly when "${d.name}" sets the tone for an unforgettable Perth night at ${d.sample.venueName}?`,
      `Expect great playlists, flowing drinks and everyone's favourite people gathered under one roof.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "18:30",
        title: "Doors open & welcome pour",
        description: "Signature birthday cocktail and Polaroid guestbook check-in.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "19:30",
        title: "Feasting platters & shared plates",
        description: "Roast bites, grazing boards and gluten-free/vegan options.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-3`,
        time: "21:00",
        title: "Birthday speech, candles & cake",
        description: "Gather round for the milestone toast and photo moment.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-4`,
        time: "21:45",
        title: "After-hours dancefloor",
        description: "Throwback classics and celebratory cocktails till midnight.",
        location: d.sample.venueName,
      },
    ],
    wellMessage:
      "Just turn up ready to celebrate and have fun! If you'd like to chip in toward the birthday travel fund, details are below.",
  },
  "birthday-kids": {
    parking: "Free family bays right outside the park lawn with easy pram and wagon access.",
    dressCode: "Playful party outfits • Sun hats and comfy sneakers for lawn adventures",
    wording: (d) =>
      `${d.sample.hosts} invite little explorers and grown-ups alike to ${d.sample.headline} at ${d.sample.venueName}!\n\nPlease RSVP with how many children and adults are joining, plus any nut or dairy allergies so snack bags are safe for every child.`,
    story: (d) => [
      `Featuring "${d.name}" artwork, we've planned shaded picnic rugs, games, face-painting and allergen-friendly party platters.`,
      `Grown-ups are very welcome to stay for barista coffee and morning treats while the kids enjoy the magic.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "10:00",
        title: "Welcome & name badges",
        description: "Craft station, temporary tattoos and bubbles on the grass.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "10:45",
        title: "Themed treasure hunt & games",
        description: "Guided games, obstacle fun and prizes for everyone.",
        location: `${d.sample.venueName} Lawn`,
      },
      {
        id: `${d.id}-3`,
        time: "11:30",
        title: "Kids' picnic boxes & adult coffee",
        description: "Fresh fruit skewers, fairy bread and hot pastries.",
        location: `${d.sample.venueName} Gazebo`,
      },
      {
        id: `${d.id}-4`,
        time: "12:15",
        title: "Happy Birthday song & favour bags",
        description: "Blowing out the candles followed by take-home treats.",
        location: d.sample.venueName,
      },
    ],
    wellMessage:
      "Bringing your little one to celebrate with us is gift enough! If you'd prefer not to wrap, we are collecting pre-loved picture books or fiver cards for a single special toy.",
  },
  "pet-birthday": {
    parking: "Shaded lakeside/coastal parking just steps from the dog-friendly fenced lawn area.",
    dressCode:
      "Park casual for humans • Party bandanas, bowties & wagging tails encouraged for pets",
    wording: (d) =>
      `${d.sample.hosts} invite two-legged friends and furry pals to ${d.sample.headline} at ${d.sample.venueName}!\n\nLet us know how many humans and pets are coming below — plus any pet treat sensitivities so our pupcake & kitty-treat bar is 100% tail-safe.`,
    story: (d) => [
      `Because pets are family too, "${d.name}" celebrates another joyful year of park zoomies, sunbeams and unconditional love.`,
      `There will be chilled water bowls, homemade carob pupcakes for good pups (or tuna bites for royal kitties) and barista iced coffees for their humans.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "09:30",
        title: "Sniffs, bandanas & photo backdrop",
        description: "Check in for a custom pet polaroid and welcome pat.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "10:15",
        title: "Treats tasting & park parade",
        description: "Obedience tricks, best dressed tail-wag and tennis ball fetch.",
        location: `${d.sample.venueName} Lawn`,
      },
      {
        id: `${d.id}-3`,
        time: "11:00",
        title: "Pet cake cutting & singing",
        description: "Vet-safe peanut-carob barkday cake and paw-printed treats.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-4`,
        time: "11:30",
        title: "Puppuccinos & human brunch",
        description: "Doggie goodie bags to take home after a happy morning.",
        location: d.sample.venueName,
      },
    ],
    wellMessage:
      "No presents required — belly rubs and a squeaky tennis ball are plenty! Donations to our local WA pet rescue shelter in lieu of gifts are warmly welcome.",
  },
  "baby-shower-girl": {
    parking: "Free conservatory garden parking with ramp access to the tearoom veranda.",
    dressCode: "Soft blush, garden florals & warm ivory daytime chic",
    wording: (d) =>
      `${d.sample.hosts} warmly invite you to shower our sweet baby girl with love — ${d.sample.headline} at ${d.sample.venueName}.\n\nPlease RSVP with any dietary requirements so high-tea tiers and mocktail pairings are tailored for you.`,
    story: (d) => [
      `Set against soft pastel tones of "${d.name}", afternoon tea, floral posies and handwritten advice cards await our favourite people.`,
      `Your laughter and warm wishes for our growing family make this afternoon unforgettable before our little girl arrives.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "13:30",
        title: "Rosewater spritzes & nursery board",
        description: "Sign a baby-girl keepsake advice card on arrival.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "14:15",
        title: "High tea tiers & warm scones",
        description: "Finger sandwiches, seasonal berries and artisanal teas.",
        location: `${d.sample.venueName} Tearoom`,
      },
      {
        id: `${d.id}-3`,
        time: "15:15",
        title: "Nursery games & flower crown craft",
        description: "Lighthearted baby predictions and Polaroids.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-4`,
        time: "16:00",
        title: "Ribbon cake cutting & favours",
        description: "Take-home wildflower seed packets and sweet macarons.",
        location: d.sample.venueName,
      },
    ],
    wellMessage:
      "Instead of a card, we would love a signed children's book for her nursery bookshelf, or you may explore our curated baby registry below.",
  },
  "baby-shower-boy": {
    parking: "Convenient marina parking outside the yacht club lawn with pram access.",
    dressCode: "Powder blue, crisp white & coastal linen daytime attire",
    wording: (d) =>
      `${d.sample.hosts} joyfully invite you to celebrate our baby boy on the way — ${d.sample.headline} at ${d.sample.venueName}.\n\nRSVP below with any allergies or dietary notes and feel free to leave a sweet wish for our little captain.`,
    story: (d) => [
      `Styled in our "${d.name}" edition, expect bright coastal air, brunch pastries and celebratory mocktails as we countdown to meeting our boy.`,
      `Everyone — partners, family and little cousins included — is warmly welcome aboard for a relaxed afternoon by the water.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "11:00",
        title: "Blueberry spritz & guest sign-in",
        description: "Leave your birth-date & weight guess on our baby boy board.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "11:45",
        title: "Coastal grazing brunch",
        description: "Smoked salmon bagels, fresh pastries and fruit platters.",
        location: `${d.sample.venueName} Terrace`,
      },
      {
        id: `${d.id}-3`,
        time: "12:45",
        title: "Baby boy trivia & onesie painting",
        description: "Relaxed crew games and decorating newborn singlets.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-4`,
        time: "13:30",
        title: "Blueberry-vanilla cake & farewells",
        description: "Group photo before heading home with sailor treats.",
        location: d.sample.venueName,
      },
    ],
    wellMessage:
      "Having you celebrate our little boy's arrival is the best gift! A signed bedtime storybook or contribution to the stroller fund below is deeply appreciated.",
  },
  "baby-shower-neutral": {
    parking: "Closest parking along the conservatory forecourt with gentle accessible paths.",
    dressCode: "Oatmeal, sage green & cream neutrals — or pink/blue for a playful reveal guess!",
    wording: (d) =>
      `${d.sample.hosts} invite you to gather for ${d.sample.headline} at ${d.sample.venueName}!\n\nRSVP below to confirm your seats, record your guess in the wishes book, and share any dietary preferences.`,
    story: (d) => [
      `Whether you are Team Pink, Team Blue, or simply here for the buttercream cake, "${d.name}" brings everyone together for a magical afternoon.`,
      `From sweet predictions to the big reveal countdown, we can't wait to share this milestone with our dearest circle.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "14:00",
        title: "Cast your vote & mocktails",
        description: "Grab a keepsake pin and write a message for baby.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "14:45",
        title: "Savory bites & garden tea",
        description: "Seasonal antipasti, warm tarts and sparkling iced tea.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-3`,
        time: "15:30",
        title: "The big reveal moment",
        description: "Gather on the lawn for the reveal toast and group cheers.",
        location: `${d.sample.venueName} Lawn`,
      },
      {
        id: `${d.id}-4`,
        time: "16:15",
        title: "Reveal cake & celebration",
        description: "Slice into the cake together and enjoy takeaway sweets.",
        location: d.sample.venueName,
      },
    ],
    wellMessage:
      "Your love and excitement for our little one is priceless! Feel free to leave a card or peek at our neutral nursery essentials below.",
  },
  "religious-naming": {
    parking: "Venue courtyard drop-off and validated parking adjacent to the main sanctuary.",
    dressCode: "Modest formal or Sunday best • Crisp cream, navy, emerald or soft gold",
    wording: (d) =>
      `${d.sample.hosts} warmly invite you to witness ${d.sample.headline} — ${d.sample.subheadline} at ${d.sample.venueName}.\n\nPlease RSVP so we can arrange family seating and prepare all blessed feast & dietary options with care.`,
    story: (d) => [
      `Crafted in our "${d.name}" layout, this blessed ceremony marks an important spiritual milestone surrounded by elders, godparents and friends.`,
      `Following the morning blessing, please stay for a generous family luncheon, music and shared gratitude.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "10:00",
        title: "Family arrival & seating",
        description: "Warm greeting at the sanctuary entrance.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "10:30",
        title: "Naming & blessing service",
        description: "Sacred readings, music and ceremonial blessings.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-3`,
        time: "12:00",
        title: "Family portraits & welcome drinks",
        description: "Gather with godparents, elders and guests in the courtyard.",
        location: `${d.sample.venueName} Courtyard`,
      },
      {
        id: `${d.id}-4`,
        time: "12:45",
        title: "Celebratory banquet luncheon",
        description: "Halal/kosher/allergen-conscious seasonal menu and sweets.",
        location: `${d.sample.venueName} Hall`,
      },
    ],
    wellMessage:
      "Your prayers, blessings and warm presence on this special day are the greatest treasure our family could receive.",
  },
  "lifestyle-milestone": {
    parking: "Quiet street parking out front and step-free walkway to the front veranda.",
    dressCode: "Smart daytime or relaxed evening style • Comfortable & celebratory",
    wording: (d) =>
      `${d.sample.hosts} invite you to celebrate ${d.sample.headline} at ${d.sample.venueName}!\n\nLet us know if you can make it below and share any food allergies before we pop the champagne.`,
    story: (d) => [
      `Tailored around our "${d.name}" card, this gathering marks a proud personal chapter — from bridal brunches and academic honours to turning the key on a new front door.`,
      `Good conversation, homemade platters and Perth sunshine are on the agenda.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "15:00",
        title: "Welcome drinks & tour",
        description: "Say hello with chilled bubbles or iced citrus tea.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "16:00",
        title: "Grazing platters & nibbles",
        description: "Artisan dips, seasonal produce and warm finger food.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-3`,
        time: "17:15",
        title: "Celebration toast & stories",
        description: "Brief milestone words and cheers with everyone.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-4`,
        time: "18:00",
        title: "Sweet bites & lawn mingling",
        description: "Gelato cups, coffee and acoustic playlist till dusk.",
        location: d.sample.venueName,
      },
    ],
    wellMessage:
      "Showing up to celebrate this chapter together is all we want! Thank you for being part of the journey.",
  },
  "corporate-gala": {
    parking: "Underground convention carpark (Lift Lobby B) and taxi rank at the main plaza.",
    dressCode: "Black tie / Executive formal • Evening gowns & tailored dinner jackets",
    wording: (d) =>
      `${d.sample.hosts} request the pleasure of your company at ${d.sample.headline} hosted at ${d.sample.venueName}.\n\nPlease confirm your guest details and dietary requirements below; your QR door pass will be issued immediately upon RSVP.`,
    story: (d) => [
      `Presented with the "${d.name}" pass aesthetic, this flagship evening unites leaders, partners and philanthropic supporters across Western Australia.`,
      `Use your digital QR pass at Express Check-In from 6:00 PM for pre-dinner champagne and networking.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "18:00",
        title: "Red carpet check-in & pre-dinner drinks",
        description: "Fast QR door pass scanning and networking aperitifs.",
        location: `${d.sample.venueName} Atrium`,
      },
      {
        id: `${d.id}-2`,
        time: "19:00",
        title: "Opening keynote & welcome",
        description: "Ballroom doors open for welcome address and first course.",
        location: `${d.sample.venueName} Main Hall`,
      },
      {
        id: `${d.id}-3`,
        time: "20:30",
        title: "Annual awards & charity pledge",
        description: "Celebrating milestones and community impact.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-4`,
        time: "21:45",
        title: "Dessert table & live quartet",
        description: "Post-gala digestifs and evening fellowship.",
        location: `${d.sample.venueName} Lounge`,
      },
    ],
    wellMessage:
      "Thank you for supporting this year's gala. Direct pledge links for our partner foundation are listed below if your organisation wishes to contribute.",
  },
  memorial: {
    parking: "Reserved family and accessible parking close to the chapel entrance.",
    dressCode: "Smart, understated attire • Soft colours or whatever feels most respectful to you",
    wording: (d) =>
      `${d.sample.hosts} gently invite family, neighbours and friends to gather in remembrance of ${d.sample.headline} at ${d.sample.venueName}.\n\nPlease indicate below if you plan to attend so seating and quiet afternoon refreshments are arranged with care. You are also welcome to share a memory in the tribute book.`,
    story: (d) => [
      `${d.sample.headline} touched many lives through quiet kindness, dedication and warmth toward everyone around them.`,
      `Whether joining in person at ${d.sample.venueName} or holding us in your thoughts from afar, reading your memories in the tribute book brings lasting comfort.`,
    ],
    schedule: (d) => [
      {
        id: `${d.id}-1`,
        time: "10:00",
        title: "Chapel doors open & quiet music",
        description: "Sign the remembrance book and be seated comfortably.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-2`,
        time: "10:30",
        title: "Memorial service & reflections",
        description: "Readings, shared tributes and quiet reflection.",
        location: d.sample.venueName,
      },
      {
        id: `${d.id}-3`,
        time: "11:30",
        title: "Farewell tribute & eucalyptus sprig",
        description: "A calm moment to pay respects as the service concludes.",
        location: `${d.sample.venueName} Courtyard`,
      },
      {
        id: `${d.id}-4`,
        time: "12:00",
        title: "Afternoon tea & remembrance",
        description: "Light refreshments and quiet conversation with family.",
        location: `${d.sample.venueName} Lounge`,
      },
    ],
    wellMessage:
      "In lieu of flowers, charitable donations may be made via the memorial link below, and every written memory in the tribute book is deeply cherished.",
  },
};

export function getCardDemoContent(design: OccasionCardDesign): CardDemoContent {
  const tpl = CATEGORY_DEMO_TEMPLATES[design.category];
  return {
    title: design.sample.title,
    hosts: design.sample.hosts,
    headline: design.sample.headline,
    subheadline: design.sample.subheadline,
    venue: {
      name: design.sample.venueName,
      address: design.sample.venueAddress,
      parking: tpl.parking,
    },
    dressCode: tpl.dressCode,
    wording: tpl.wording(design),
    story: tpl.story(design),
    schedule: tpl.schedule(design),
    wellMessage: tpl.wellMessage,
  };
}

export function getCardDesignById(id?: string | null): OccasionCardDesign | undefined {
  if (!id) return undefined;
  return OCCASION_CARD_DESIGNS.find((design) => design.id === id);
}

/**
 * Resolves the specific card design for a guest micro-site or studio event: prefers explicit
 * `cardId` (preserving Memorial Mode guardrails), then infers a tasteful match from occasion/text.
 */
export function inferCardDesignForInvitation(input: {
  cardId?: string | null | undefined;
  ceremonySlug?: string | undefined;
  templateSlug?: string | undefined;
  themeId?: string | undefined;
  title?: string | undefined;
  headline?: string | undefined;
  subheadline?: string | undefined;
  memorial?: boolean | undefined;
}): OccasionCardDesign | undefined {
  const isMemorial = Boolean(input.memorial);

  if (input.cardId) {
    const explicit = getCardDesignById(input.cardId);
    if (explicit) {
      if (isMemorial && explicit.mode !== "MEMORIAL") {
        return OCCASION_CARD_DESIGNS.find((d) => d.mode === "MEMORIAL");
      }
      if (!isMemorial && explicit.mode === "MEMORIAL") {
        return undefined;
      }
      return explicit;
    }
  }

  if (isMemorial) {
    return (
      OCCASION_CARD_DESIGNS.find(
        (d) => d.mode === "MEMORIAL" && d.templateSlug === input.templateSlug,
      ) ?? OCCASION_CARD_DESIGNS.find((d) => d.mode === "MEMORIAL")
    );
  }

  const text =
    `${input.title ?? ""} ${input.headline ?? ""} ${input.subheadline ?? ""}`.toLowerCase();
  if (/\b(dog|puppy|barkday|woof|pup|poodle)\b/.test(text)) {
    return getCardDesignById("pet-dog-barkday-pawty");
  }
  if (/\b(cat|kitty|kitten|purr)\b/.test(text)) {
    return getCardDesignById("pet-kitty-crown-birthday");
  }
  if (/\b(baby girl|princess|little girl|it'?s a girl)\b/.test(text)) {
    return getCardDesignById("baby-girl-vintage-pram");
  }
  if (/\b(baby boy|prince|sailor|it'?s a boy|irl boy)\b/.test(text)) {
    return getCardDesignById("baby-boy-little-prince");
  }
  if (/\b(gender reveal|pink or blue|boy or girl)\b/.test(text)) {
    return getCardDesignById("baby-gender-reveal-booties");
  }
  if (/\b(sofreh|aghd|aqd|aroosi|nowruz|yalda|persian)\b/.test(text)) {
    return getCardDesignById("cultural-sofreh-aghd-mihrab");
  }

  if (input.ceremonySlug) {
    const byOccasion = OCCASION_CARD_DESIGNS.find(
      (d) => d.mode === "CELEBRATION" && d.occasionSlug === input.ceremonySlug,
    );
    if (byOccasion) return byOccasion;
  }

  return undefined;
}
