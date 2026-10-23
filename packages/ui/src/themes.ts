/**
 * The 7 launch invitation themes (`WEBSITE.md` §B4) and theme/mode compatibility helpers.
 */
import type { ExperienceMode, InvitationThemeId } from "@managevent/types";

export interface InvitationThemeTokens {
  id: InvitationThemeId;
  name: string;
  mode: "celebration" | "memorial";
  colors: {
    bg: string;
    bgWarm: string;
    surface: string;
    ink: string;
    inkMuted: string;
    accent: string;
    accentInk: string;
    rule: string;
  };
  fonts: {
    display: string;
    body: string;
    faDisplay: string;
    faBody: string;
  };
  ornaments: "arch" | "florals" | "tile" | "none";
  gate: {
    sealColor: string;
    ribbonColor: string;
    style: "wax-seal" | "ribbon" | "arch" | "plain-fade";
  };
  motion: "full" | "gentle" | "none";
}

export const INVITATION_THEMES: Readonly<Record<InvitationThemeId, InvitationThemeTokens>> = {
  "royal-ivory": {
    id: "royal-ivory",
    name: "Royal Ivory & Gold Burgundy",
    mode: "celebration",
    colors: {
      bg: "#FAF7F2",
      bgWarm: "#F4EFE6",
      surface: "#FFFFFF",
      ink: "#18181B",
      inkMuted: "#52525B",
      accent: "#C5A059",
      accentInk: "#5C1A24",
      rule: "#C5A059",
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      faDisplay: "'Vazirmatn', system-ui, sans-serif",
      faBody: "'Vazirmatn', system-ui, sans-serif",
    },
    ornaments: "arch",
    gate: {
      sealColor: "#5C1A24",
      ribbonColor: "#C5A059",
      style: "wax-seal",
    },
    motion: "full",
  },
  "midnight-celestial": {
    id: "midnight-celestial",
    name: "Midnight Celestial & Rose Gold",
    mode: "celebration",
    colors: {
      bg: "#0F172A",
      bgWarm: "#1E293B",
      surface: "#1E293B",
      ink: "#F8FAFC",
      inkMuted: "#CBD5E1",
      accent: "#E2B697",
      accentInk: "#0F172A",
      rule: "#E2B697",
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      faDisplay: "'Vazirmatn', system-ui, sans-serif",
      faBody: "'Vazirmatn', system-ui, sans-serif",
    },
    ornaments: "arch",
    gate: {
      sealColor: "#E2B697",
      ribbonColor: "#94A3B8",
      style: "arch",
    },
    motion: "full",
  },
  "emerald-botanic": {
    id: "emerald-botanic",
    name: "Emerald Botanic Garden",
    mode: "celebration",
    colors: {
      bg: "#F6F8F5",
      bgWarm: "#EBF0E8",
      surface: "#FFFFFF",
      ink: "#14261C",
      inkMuted: "#3F594A",
      accent: "#B89650",
      accentInk: "#1B3B2B",
      rule: "#B89650",
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      faDisplay: "'Vazirmatn', system-ui, sans-serif",
      faBody: "'Vazirmatn', system-ui, sans-serif",
    },
    ornaments: "florals",
    gate: {
      sealColor: "#1B3B2B",
      ribbonColor: "#B89650",
      style: "ribbon",
    },
    motion: "full",
  },
  "persian-azure": {
    id: "persian-azure",
    name: "Persian Azure & Isfahan Turquoise",
    mode: "celebration",
    colors: {
      bg: "#FAF6EF",
      bgWarm: "#F2E9DA",
      surface: "#FFFFFF",
      ink: "#162436",
      inkMuted: "#475569",
      accent: "#1C6E8C",
      accentInk: "#FAF6EF",
      rule: "#C5A059",
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      faDisplay: "'Vazirmatn', system-ui, sans-serif",
      faBody: "'Vazirmatn', system-ui, sans-serif",
    },
    ornaments: "tile",
    gate: {
      sealColor: "#1C6E8C",
      ribbonColor: "#C5A059",
      style: "arch",
    },
    motion: "full",
  },
  "alabaster-platinum": {
    id: "alabaster-platinum",
    name: "Minimalist Alabaster & Platinum",
    mode: "celebration",
    colors: {
      bg: "#FAFAFA",
      bgWarm: "#F4F4F5",
      surface: "#FFFFFF",
      ink: "#18181B",
      inkMuted: "#52525B",
      accent: "#71717A",
      accentInk: "#18181B",
      rule: "#A1A1AA",
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      faDisplay: "'Vazirmatn', system-ui, sans-serif",
      faBody: "'Vazirmatn', system-ui, sans-serif",
    },
    ornaments: "arch",
    gate: {
      sealColor: "#27272A",
      ribbonColor: "#A1A1AA",
      style: "wax-seal",
    },
    motion: "full",
  },
  "memorial-alabaster": {
    id: "memorial-alabaster",
    name: "Alabaster & Bronze",
    mode: "memorial",
    colors: {
      bg: "#F8F9FA",
      bgWarm: "#F1F5F9",
      surface: "#FFFFFF",
      ink: "#1E293B",
      inkMuted: "#64748B",
      accent: "#8C7A6B",
      accentInk: "#1E293B",
      rule: "#8C7A6B",
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      faDisplay: "'Vazirmatn', system-ui, sans-serif",
      faBody: "'Vazirmatn', system-ui, sans-serif",
    },
    ornaments: "none",
    gate: {
      sealColor: "#8C7A6B",
      ribbonColor: "#CBD5E1",
      style: "plain-fade",
    },
    motion: "gentle",
  },
  "memorial-slate": {
    id: "memorial-slate",
    name: "Slate & Linen",
    mode: "memorial",
    colors: {
      bg: "#F5F5F4",
      bgWarm: "#E7E5E4",
      surface: "#FFFFFF",
      ink: "#1E293B",
      inkMuted: "#57534E",
      accent: "#78716C",
      accentInk: "#1E293B",
      rule: "#A8A29E",
    },
    fonts: {
      display: "'Cormorant Garamond', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      faDisplay: "'Vazirmatn', system-ui, sans-serif",
      faBody: "'Vazirmatn', system-ui, sans-serif",
    },
    ornaments: "none",
    gate: {
      sealColor: "#475569",
      ribbonColor: "#D6D3D1",
      style: "plain-fade",
    },
    motion: "gentle",
  },
};

/**
 * Checks whether an invitation theme ID is compatible with the event's `ExperienceMode` (`WEBSITE.md` §B4).
 *
 * Memorial events can ONLY choose memorial themes, and celebration events CANNOT choose memorial themes.
 */
export function isThemeCompatibleWithMode(
  themeId: InvitationThemeId,
  experienceMode: ExperienceMode,
): boolean {
  const theme = INVITATION_THEMES[themeId];
  if (!theme) return false;
  return experienceMode === "MEMORIAL" ? theme.mode === "memorial" : theme.mode === "celebration";
}

/**
 * Returns the default invitation theme ID for a given `ExperienceMode`.
 */
export function getDefaultThemeForMode(experienceMode: ExperienceMode): InvitationThemeId {
  return experienceMode === "MEMORIAL" ? "memorial-alabaster" : "royal-ivory";
}
