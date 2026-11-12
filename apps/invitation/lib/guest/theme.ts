/**
 * Turns an invitation theme (`@managevent/ui/themes`) into the brand shell's `--me-*` tokens, so
 * every brand.css class (buttons, fields, alerts, dialogs) renders in the guest's theme without a
 * second stylesheet. Guest pages are the one place that does not use the site palette.
 *
 * Colours come only from the theme and the mode palette. Where a theme pairing would fall under
 * WCAG AA for text, the colour is moved towards the ink until it passes; nothing is hard-coded.
 */
import type { ExperienceMode, InvitationThemeId } from "@managevent/types";
import {
  getDefaultThemeForMode,
  INVITATION_THEMES,
  type InvitationThemeTokens,
  isThemeCompatibleWithMode,
} from "@managevent/ui/themes";
import { getContrastRatio, getPaletteTokens, parseHexRgb } from "@managevent/ui/tokens";

const AA_TEXT = 4.5;

export interface GuestTheme {
  id: InvitationThemeId;
  /** `dark` when the page background is dark (Midnight Celestial). */
  tone: "light" | "dark";
  ornaments: InvitationThemeTokens["ornaments"];
  /** `--me-*` and `--inv-*` custom properties for the page wrapper's inline style. */
  style: Record<string, string>;
  /** The same properties as a `:root { ... }` rule, so the body and overlays match the page. */
  rootCss: string;
  /** Page background, for the browser's `theme-color`. */
  themeColor: string;
}

function toHex(channel: number): string {
  return Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, "0");
}

/** Mixes two `#RRGGBB` colours: `amount` 0 is all `from`, 1 is all `to`. */
export function mixHex(from: string, to: string, amount: number): string {
  const a = parseHexRgb(from);
  const b = parseHexRgb(to);
  return `#${a.map((channel, index) => toHex(channel + ((b[index] ?? channel) - channel) * amount)).join("")}`;
}

/**
 * Returns `colour`, or the nearest step from it towards `towards` that reaches `minimum` contrast
 * against every background in `against`.
 */
export function ensureContrast(
  colour: string,
  against: readonly string[],
  towards: string,
  minimum = AA_TEXT,
): string {
  const passes = (candidate: string) =>
    against.every((background) => getContrastRatio(candidate, background) >= minimum);
  if (passes(colour)) return colour;
  for (let step = 1; step <= 10; step += 1) {
    const candidate = mixHex(colour, towards, step / 10);
    if (passes(candidate)) return candidate;
  }
  return towards;
}

function mostReadableOn(background: string, candidates: readonly string[]): string {
  let best = candidates[0] ?? background;
  for (const candidate of candidates) {
    if (getContrastRatio(candidate, background) > getContrastRatio(best, background)) {
      best = candidate;
    }
  }
  return best;
}

/** The theme to render: the invitation's own, or the mode default if the two ever disagree. */
export function resolveThemeTokens(
  themeId: InvitationThemeId,
  experienceMode: ExperienceMode,
): InvitationThemeTokens {
  const compatible = isThemeCompatibleWithMode(themeId, experienceMode);
  return INVITATION_THEMES[compatible ? themeId : getDefaultThemeForMode(experienceMode)];
}

export function getGuestTheme(
  themeId: InvitationThemeId,
  experienceMode: ExperienceMode,
): GuestTheme {
  const theme = resolveThemeTokens(themeId, experienceMode);
  const { colors, gate } = theme;
  const palette = getPaletteTokens(experienceMode);
  const surfaces = [colors.bg, colors.bgWarm, colors.surface];
  const tone = isDark(colors.bg) ? "dark" : "light";

  const ink = ensureContrast(
    colors.ink,
    surfaces,
    tone === "dark" ? palette.surfaceRaised : palette.ink,
  );
  const inkMuted = ensureContrast(colors.inkMuted, surfaces, ink);
  // The theme's `accentInk` is the heading and button colour on light themes. On a dark theme it
  // is the ink that sits ON the accent, so the accent itself becomes the primary.
  const primaryBase =
    getContrastRatio(colors.accentInk, colors.bg) >= AA_TEXT ? colors.accentInk : colors.accent;
  const primary = ensureContrast(primaryBase, surfaces, ink);
  const onPrimary = mostReadableOn(primary, [colors.bg, colors.surface, colors.accentInk, ink]);
  const accentStrong = ensureContrast(colors.accent, surfaces, primary);
  const status = (colour: string) => ensureContrast(colour, surfaces, ink);

  const style: Record<string, string> = {
    "--me-surface": colors.bg,
    "--me-surface-raised": colors.surface,
    "--me-ink": ink,
    "--me-ink-muted": inkMuted,
    "--me-primary": primary,
    "--me-on-primary": onPrimary,
    "--me-accent": colors.accent,
    "--me-accent-strong": accentStrong,
    "--me-danger": status(palette.danger),
    "--me-success": status(palette.success),
    "--me-warning": status(palette.warning),
    "--inv-bg-warm": colors.bgWarm,
    "--inv-rule": colors.rule,
    "--inv-seal": gate.sealColor,
    "--inv-on-seal": mostReadableOn(gate.sealColor, [
      colors.bg,
      colors.surface,
      colors.accentInk,
      ink,
    ]),
    "--inv-ribbon": gate.ribbonColor,
    "--inv-font-display": theme.fonts.display,
    "--inv-font-body": theme.fonts.body,
  };

  const rootCss = `:root{${Object.entries(style)
    .map(([name, value]) => `${name}:${value}`)
    .join(";")}}`;

  return { id: theme.id, tone, ornaments: theme.ornaments, style, rootCss, themeColor: colors.bg };
}

function isDark(hex: string): boolean {
  const [r, g, b] = parseHexRgb(hex);
  // Perceived brightness; a page background under ~35% reads as dark.
  return (r * 299 + g * 587 + b * 114) / 1000 < 90;
}
