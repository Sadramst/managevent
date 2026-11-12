/**
 * The fixed invitation catalogue (occasions, templates, colour themes, opening styles, time
 * zones) joined with its en-AU names, as plain serialisable options for the studio screens.
 *
 * The catalogue itself lives in `@managevent/validators`; the names live in
 * `@managevent/i18n`. Server components build the options here and hand them to client
 * components as props, so the browser bundle carries neither package.
 */
import {
  getExperienceMode,
  getInvitationStudio,
  type InvitationStudioCopy,
} from "@managevent/i18n";
import { INVITATION_PLANS } from "@managevent/payments/plans";
import type { ExperienceMode, InvitationThemeId } from "@managevent/types";
import {
  CELEBRATION_THEME_IDS,
  FREE_THEME_IDS,
  type GateStyle,
  GateStyleEnum,
  INVITATION_OCCASION_SLUGS,
  INVITATION_TEMPLATES,
  type InvitationOccasionSlug,
  type InvitationTemplateSlug,
  MEMORIAL_THEME_IDS,
} from "@managevent/validators";

export interface OccasionOption {
  slug: InvitationOccasionSlug;
  label: string;
  mode: ExperienceMode;
}

export interface TemplateOption {
  slug: InvitationTemplateSlug;
  name: string;
  description: string;
  mode: ExperienceMode;
  defaultThemeId: InvitationThemeId;
  defaultGateStyle: GateStyle;
  /** Available on the free plan. */
  free: boolean;
}

export interface ThemeOption {
  id: InvitationThemeId;
  name: string;
  mode: ExperienceMode;
  /** Available on the free plan. */
  free: boolean;
}

export interface GateOption {
  id: GateStyle;
  name: string;
  description: string;
}

export interface TimeZoneOption {
  id: string;
  label: string;
}

export interface StudioCatalog {
  occasions: OccasionOption[];
  templates: TemplateOption[];
  themes: ThemeOption[];
  gateStyles: GateOption[];
  timeZones: TimeZoneOption[];
}

type CatalogCopy = InvitationStudioCopy["catalog"];

/** The default time zone of a new event (the API default as well). */
export const DEFAULT_TIME_ZONE = "Australia/Perth";

/** The experience mode an occasion gives an event. Always through the shared helper. */
export function occasionMode(slug: string): ExperienceMode {
  return getExperienceMode({ ceremonySlug: slug });
}

/**
 * Whether an event renders in Memorial Mode. The API stores the mode at creation; the shared
 * helper is still the one place the decision is made.
 */
export function isMemorialEvent(event: {
  ceremonySlug: string;
  experienceMode: ExperienceMode;
}): boolean {
  return (
    getExperienceMode({
      ceremonySlug: event.ceremonySlug,
      experienceMode: event.experienceMode,
    }) === "MEMORIAL"
  );
}

/** The en-AU name of an occasion slug, with a neutral fallback for one the studio cannot name. */
export function occasionLabel(slug: string, copy: CatalogCopy): string {
  return Object.hasOwn(copy.occasions, slug)
    ? copy.occasions[slug as InvitationOccasionSlug]
    : copy.occasionFallback;
}

export function buildCatalog(copy: CatalogCopy = getInvitationStudio("en").catalog): StudioCatalog {
  const freeThemes: readonly string[] = FREE_THEME_IDS;
  const themeIds: { id: InvitationThemeId; mode: ExperienceMode }[] = [
    ...CELEBRATION_THEME_IDS.map((id) => ({ id, mode: "CELEBRATION" as const })),
    ...MEMORIAL_THEME_IDS.map((id) => ({ id, mode: "MEMORIAL" as const })),
  ];
  return {
    occasions: INVITATION_OCCASION_SLUGS.map((slug) => ({
      slug,
      label: copy.occasions[slug],
      mode: occasionMode(slug),
    })),
    templates: INVITATION_TEMPLATES.map((template) => ({
      slug: template.slug,
      name: copy.templates[template.slug].name,
      description: copy.templates[template.slug].description,
      mode: template.mode,
      defaultThemeId: template.defaultThemeId,
      defaultGateStyle: template.defaultGateStyle,
      free: template.free,
    })),
    // Free themes first, so the options a host can use straight away lead the list.
    themes: themeIds
      .map(({ id, mode }) => ({
        id,
        name: copy.themes[id],
        mode,
        free: freeThemes.includes(id),
      }))
      .sort((a, b) => Number(b.free) - Number(a.free)),
    gateStyles: GateStyleEnum.options.map((id) => ({
      id,
      name: copy.gateStyles[id].name,
      description: copy.gateStyles[id].description,
    })),
    timeZones: Object.entries(copy.timeZones).map(([id, label]) => ({ id, label })),
  };
}

/**
 * The time zone options for an event, with the event's own zone added when it is not one of
 * the listed Australian zones (an event created elsewhere keeps its zone selectable).
 */
export function timeZonesIncluding(options: TimeZoneOption[], current: string): TimeZoneOption[] {
  if (options.some((option) => option.id === current)) return options;
  return [...options, { id: current, label: current.replaceAll("_", " ") }];
}

/** "$69" or "$6.27" from AUD cents. Whole dollars drop the cents. No arithmetic on money here. */
export function formatAud(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  return remainder === 0 ? `$${dollars}` : `$${dollars}.${String(remainder).padStart(2, "0")}`;
}

/** How many guests the free plan covers, or null if it ever becomes unlimited. */
export function freeGuestLimit(): number | null {
  const max = INVITATION_PLANS.FREE.maxGuests;
  return typeof max === "number" ? max : null;
}
