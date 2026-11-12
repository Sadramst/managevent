/**
 * Pure rules for host events and invitations: which template, theme and gate a mode and plan may
 * use, what a memorial invitation may carry, what publishing needs, and how a custom slug is built.
 *
 * Nothing here touches the database, so every rule is unit-tested directly.
 */
import type { InvitationPlanEntitlements } from "@managevent/payments";
import {
  CELEBRATION_THEME_IDS,
  FREE_THEME_IDS,
  type GateStyle,
  INVITATION_TEMPLATES,
  type InvitationTemplateSlug,
  MEMORIAL_FORBIDDEN_WELL_FIELDS,
  MEMORIAL_THEME_IDS,
  type PublishRequirement,
  type RsvpConfig,
  SafeEventSlugSchema,
  type WellConfig,
} from "@managevent/validators";
import { ApiProblem } from "../../lib/errors.js";

export type ExperienceMode = "CELEBRATION" | "MEMORIAL";
export type WellMode = "NONE" | "WISHING_WELL" | "TRIBUTE_BOOK";
export type InvitationThemeId =
  (typeof CELEBRATION_THEME_IDS)[number] | (typeof MEMORIAL_THEME_IDS)[number];

/** The gate every memorial invitation uses: no seal, ribbon or arch reveal. */
export const MEMORIAL_GATE_STYLE: GateStyle = "plain-fade";

/** `400 VALIDATION_ERROR` in the same `details` shape as a failed Zod parse (`flatten()`). */
export function validationProblem(fieldErrors: Record<string, string[]>): ApiProblem {
  return new ApiProblem(400, "VALIDATION_ERROR", "Request validation failed", {
    formErrors: [],
    fieldErrors,
  });
}

function featureNotInPlan(
  feature: "allThemesAndAnimations" | "allGateStyles" | "customEventSlug",
  field: string,
): ApiProblem {
  return new ApiProblem(403, "FEATURE_NOT_IN_PLAN", "This feature is not included in the plan", {
    feature,
    field,
  });
}

export function findTemplate(slug: string) {
  return INVITATION_TEMPLATES.find((template) => template.slug === slug) ?? null;
}

export function themesForMode(mode: ExperienceMode): readonly InvitationThemeId[] {
  return mode === "MEMORIAL" ? MEMORIAL_THEME_IDS : CELEBRATION_THEME_IDS;
}

export interface InvitationDesign {
  templateSlug: InvitationTemplateSlug;
  themeId: InvitationThemeId;
  gateStyle: GateStyle;
}

/**
 * Works out the template, theme and gate an invitation ends up with, and rejects a combination
 * the event's mode or plan does not allow.
 *
 * - The template must belong to the event's mode, and the theme to that mode's theme set (400).
 * - Choosing a different template without naming a theme or gate takes that template's defaults.
 * - Memorial invitations always use the plain fade gate, whatever was asked for.
 * - Without `allThemesAndAnimations` only free templates and `FREE_THEME_IDS` are allowed; without
 *   `allGateStyles` only the template's own gate or the plain fade (403 `FEATURE_NOT_IN_PLAN`).
 */
export function resolveInvitationDesign(input: {
  mode: ExperienceMode;
  plan: Pick<InvitationPlanEntitlements, "allThemesAndAnimations" | "allGateStyles">;
  /** The stored design, or null when the invitation is being created. */
  current: { templateSlug: string; themeId: string; gateStyle: string } | null;
  change: { templateSlug?: string; themeId?: string; gateStyle?: string };
}): InvitationDesign {
  const { mode, plan, current, change } = input;

  const templateSlug = change.templateSlug ?? current?.templateSlug;
  const template = templateSlug ? findTemplate(templateSlug) : null;
  if (!template) {
    throw validationProblem({ templateSlug: ["Unknown invitation template"] });
  }
  if (template.mode !== mode) {
    throw validationProblem({
      templateSlug: ["This template is not available for this kind of event"],
    });
  }

  const templateChanged = current === null || template.slug !== current.templateSlug;

  const themeId = change.themeId ?? (templateChanged ? template.defaultThemeId : current.themeId);
  const allowedThemes: readonly string[] = themesForMode(mode);
  if (!allowedThemes.includes(themeId)) {
    throw validationProblem({ themeId: ["This theme is not available for this kind of event"] });
  }

  const gateStyle =
    mode === "MEMORIAL"
      ? MEMORIAL_GATE_STYLE
      : (change.gateStyle ?? (templateChanged ? template.defaultGateStyle : current.gateStyle));

  if (!plan.allThemesAndAnimations) {
    if (!template.free) throw featureNotInPlan("allThemesAndAnimations", "templateSlug");
    if (!(FREE_THEME_IDS as readonly string[]).includes(themeId)) {
      throw featureNotInPlan("allThemesAndAnimations", "themeId");
    }
  }
  if (
    !plan.allGateStyles &&
    gateStyle !== template.defaultGateStyle &&
    gateStyle !== MEMORIAL_GATE_STYLE
  ) {
    throw featureNotInPlan("allGateStyles", "gateStyle");
  }

  return {
    templateSlug: template.slug,
    themeId: themeId as InvitationThemeId,
    gateStyle: gateStyle as GateStyle,
  };
}

/**
 * Wishing wells belong to celebrations and tribute books to memorials. A memorial invitation never
 * carries bank or registry details.
 */
export function assertWellAllowed(
  mode: ExperienceMode,
  wellMode: WellMode,
  wellConfig: WellConfig,
): void {
  if (mode === "MEMORIAL") {
    if (wellMode === "WISHING_WELL") {
      throw validationProblem({
        wellMode: ["A memorial invitation can offer a tribute book, not a wishing well"],
      });
    }
    const present = MEMORIAL_FORBIDDEN_WELL_FIELDS.filter(
      (field) => wellConfig[field] !== undefined,
    );
    if (present.length > 0) {
      throw validationProblem({
        wellConfig: present.map((field) => `${field} is not available on a memorial invitation`),
      });
    }
    return;
  }
  if (wellMode === "TRIBUTE_BOOK") {
    throw validationProblem({
      wellMode: ["A tribute book is only available on a memorial invitation"],
    });
  }
}

/** The standard song-request prompt ("what will get you dancing?") is never shown at a memorial. */
export function assertRsvpConfigAllowed(mode: ExperienceMode, rsvpConfig: RsvpConfig): void {
  if (mode === "MEMORIAL" && rsvpConfig.songPrompt === "STANDARD") {
    throw validationProblem({
      rsvpConfig: ["songPrompt must be MEMORIAL or HIDDEN on a memorial invitation"],
    });
  }
}

/** What is still missing before an invitation can be published. Empty means ready. */
export function missingPublishRequirements(
  content: {
    headline?: string | null;
    hosts?: string | null;
    venue?: { name?: string | null } | null;
  },
  startsAt: Date,
  now: Date,
): PublishRequirement[] {
  const missing: PublishRequirement[] = [];
  if (!content.headline?.trim()) missing.push("HEADLINE");
  if (!content.hosts?.trim()) missing.push("HOSTS");
  if (!content.venue?.name?.trim()) missing.push("VENUE");
  if (startsAt.getTime() <= now.getTime()) missing.push("START_IN_FUTURE");
  return missing;
}

/**
 * Replaces the words of an event slug and keeps its random suffix (`anna-and-tom-x7k2` with
 * `the-big-day` becomes `the-big-day-x7k2`).
 */
export function replaceEventSlugWords(currentSlug: string, words: string): string {
  const suffix = currentSlug.slice(currentSlug.lastIndexOf("-") + 1);
  const next = `${words}-${suffix}`;
  if (!SafeEventSlugSchema.safeParse(next).success) {
    throw validationProblem({ eventSlugWords: ["This does not make a valid invitation link"] });
  }
  return next;
}
