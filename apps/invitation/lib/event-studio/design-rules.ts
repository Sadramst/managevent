/**
 * Which template, colours and opening style an event may use on its plan. Mirrors
 * `resolveInvitationDesign` in the API (`apps/api/src/modules/events/rules.ts`), so the design
 * screen can explain a Premium option before the host tries to save it. The API stays the
 * authority: a `FEATURE_NOT_IN_PLAN` answer is still handled.
 *
 * Pure and safe for client components (types only from other packages).
 */
import type { InvitationThemeId } from "@managevent/types";
import type { GateStyle, InvitationTemplateSlug } from "@managevent/validators";
import type { GateOption, TemplateOption, ThemeOption } from "./catalog";

export interface DesignEntitlements {
  /** `entitlements.allThemesAndAnimations` from the plan view. */
  allThemes: boolean;
  /** `entitlements.allGateStyles` from the plan view. */
  allGateStyles: boolean;
}

/** Memorial invitations always open with this, whatever the plan. */
export const PLAIN_GATE: GateStyle = "plain-fade";

export interface DesignSelection {
  templateSlug: InvitationTemplateSlug;
  themeId: InvitationThemeId;
  gateStyle: GateStyle;
}

export function isTemplateLocked(template: TemplateOption, plan: DesignEntitlements): boolean {
  return !plan.allThemes && !template.free;
}

export function isThemeLocked(theme: ThemeOption, plan: DesignEntitlements): boolean {
  return !plan.allThemes && !theme.free;
}

export function isGateLocked(
  gate: GateOption,
  template: TemplateOption | undefined,
  plan: DesignEntitlements,
): boolean {
  if (plan.allGateStyles) return false;
  return gate.id !== PLAIN_GATE && gate.id !== template?.defaultGateStyle;
}

/** The names of the selected options the plan does not include, in template, colours, opening order. */
export function lockedSelections(
  selection: DesignSelection,
  catalog: { templates: TemplateOption[]; themes: ThemeOption[]; gateStyles: GateOption[] },
  plan: DesignEntitlements,
): string[] {
  const names: string[] = [];
  const template = catalog.templates.find((item) => item.slug === selection.templateSlug);
  const theme = catalog.themes.find((item) => item.id === selection.themeId);
  const gate = catalog.gateStyles.find((item) => item.id === selection.gateStyle);
  if (template && isTemplateLocked(template, plan)) names.push(template.name);
  if (theme && isThemeLocked(theme, plan)) names.push(theme.name);
  if (gate && isGateLocked(gate, template, plan)) names.push(gate.name);
  return names;
}

/**
 * What picking a template does: it brings its usual colours and opening with it, the same as
 * the API does when a template changes without a theme or gate being named.
 */
export function applyTemplate(template: TemplateOption): DesignSelection {
  return {
    templateSlug: template.slug,
    themeId: template.defaultThemeId,
    gateStyle: template.mode === "MEMORIAL" ? PLAIN_GATE : template.defaultGateStyle,
  };
}

/** The first template a new event of this mode can use without paying. */
export function defaultTemplateFor(
  templates: TemplateOption[],
  mode: TemplateOption["mode"],
): TemplateOption | undefined {
  return (
    templates.find((template) => template.mode === mode && template.free) ??
    templates.find((template) => template.mode === mode)
  );
}
