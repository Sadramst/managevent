/**
 * Design tokens for Celebration and Memorial modes (`docs/design/DESIGN_SYSTEM.md`).
 *
 * Exported as TypeScript constants, CSS variables, Tailwind v4 theme variables,
 * NativeWind theme config, and JSON-serializable tokens for Tauri.
 * Never hard-code hex values in apps.
 */
import type { ExperienceMode } from "@managevent/types";

export interface PaletteTokens {
  surface: string;
  surfaceRaised: string;
  ink: string;
  inkMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
}

export const celebrationTokens: Readonly<PaletteTokens> = {
  surface: "#FAF7F2",
  surfaceRaised: "#FFFFFF",
  ink: "#18181B",
  inkMuted: "#52525B",
  primary: "#5C1A24",
  onPrimary: "#FAF7F2",
  accent: "#C5A059",
};

export const memorialTokens: Readonly<PaletteTokens> = {
  surface: "#F8F9FA",
  surfaceRaised: "#FFFFFF",
  ink: "#1E293B",
  inkMuted: "#64748B",
  primary: "#1E293B",
  onPrimary: "#F8F9FA",
  accent: "#8C7A6B",
};

export const designTokens = {
  palettes: {
    CELEBRATION: celebrationTokens,
    MEMORIAL: memorialTokens,
  },
  typography: {
    latinDisplay: "'Cormorant Garamond', Georgia, serif",
    latinBody: "'Plus Jakarta Sans', system-ui, sans-serif",
    farsiDisplay: "'Vazirmatn', system-ui, sans-serif",
    farsiBody: "'Vazirmatn', system-ui, sans-serif",
    scaleRatioMobile: 1.25,
    scaleRatioDesktop: 1.333,
    baseFontSizePx: 16,
  },
  radius: {
    sheet: "24px",
    panel: "12px",
    control: "8px",
    chip: "999px",
  },
  motion: {
    microMs: 120,
    uiMs: 240,
    gateMs: 1600,
    reducedMotionMs: 200,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  },
} as const;

/**
 * Returns the colour token set for a given `ExperienceMode`.
 */
export function getPaletteTokens(mode: ExperienceMode): Readonly<PaletteTokens> {
  return mode === "MEMORIAL" ? memorialTokens : celebrationTokens;
}

/**
 * Returns inline CSS custom properties (`--me-*`) for a given `ExperienceMode`.
 */
export function getCssVariablesForMode(mode: ExperienceMode): Record<string, string> {
  const palette = getPaletteTokens(mode);
  return {
    "--me-surface": palette.surface,
    "--me-surface-raised": palette.surfaceRaised,
    "--me-ink": palette.ink,
    "--me-ink-muted": palette.inkMuted,
    "--me-primary": palette.primary,
    "--me-on-primary": palette.onPrimary,
    "--me-accent": palette.accent,
  };
}

/**
 * Parses a `#RRGGBB` hex string into `[r, g, b]` channels (`0..255`).
 */
export function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Invalid 6-digit hex colour: ${hex}`);
  }
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function channelRelativeLuminance(channel8Bit: number): number {
  const sRgb = channel8Bit / 255;
  return sRgb <= 0.03928 ? sRgb / 12.92 : ((sRgb + 0.055) / 1.055) ** 2.4;
}

/**
 * Computes WCAG 2.2 relative luminance (`0..1`) for a `#RRGGBB` hex colour.
 */
export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHexRgb(hex);
  return (
    0.2126 * channelRelativeLuminance(r) +
    0.7152 * channelRelativeLuminance(g) +
    0.0722 * channelRelativeLuminance(b)
  );
}

/**
 * Computes the WCAG 2.2 contrast ratio (`1..21`) between two `#RRGGBB` hex colours.
 */
export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}
