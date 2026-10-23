/**
 * Tailwind v4 preset and design token bridge for Managevent workspaces.
 *
 * Mirrors the brand tokens defined in `docs/design/DESIGN_SYSTEM.md` and `packages/ui`.
 */

export interface BrandColorTokens {
  surface: string;
  surfaceRaised: string;
  ink: string;
  inkMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
}

/**
 * Celebration and Memorial colour tokens per `docs/design/DESIGN_SYSTEM.md`.
 */
export const tailwindBrandTokens: Readonly<{
  celebration: BrandColorTokens;
  memorial: BrandColorTokens;
  radius: Readonly<{
    sheet: string;
    panel: string;
    control: string;
    chip: string;
  }>;
  fonts: Readonly<{
    displayLatin: string;
    bodyLatin: string;
    farsi: string;
  }>;
  motion: Readonly<{
    microMs: number;
    uiMs: number;
    gateMs: number;
    reducedMotionMs: number;
    easing: string;
  }>;
}> = {
  celebration: {
    surface: "#FAF7F2",
    surfaceRaised: "#FFFFFF",
    ink: "#18181B",
    inkMuted: "#52525B",
    primary: "#5C1A24",
    onPrimary: "#FAF7F2",
    accent: "#C5A059",
  },
  memorial: {
    surface: "#F8F9FA",
    surfaceRaised: "#FFFFFF",
    ink: "#1E293B",
    inkMuted: "#64748B",
    primary: "#1E293B",
    onPrimary: "#F8F9FA",
    accent: "#8C7A6B",
  },
  radius: {
    sheet: "24px",
    panel: "12px",
    control: "8px",
    chip: "999px",
  },
  fonts: {
    displayLatin: "'Cormorant Garamond', Georgia, serif",
    bodyLatin: "'Plus Jakarta Sans', system-ui, sans-serif",
    farsi: "'Vazirmatn', system-ui, sans-serif",
  },
  motion: {
    microMs: 120,
    uiMs: 240,
    gateMs: 1600,
    reducedMotionMs: 200,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  },
};

/**
 * Generates a Tailwind v4 `@theme` CSS block consuming Managevent CSS custom properties.
 *
 * @returns CSS string with `@theme` declarations and `:root` / `[data-experience-mode="memorial"]` variables.
 */
export function generateTailwindV4ThemeCss(): string {
  const { celebration, memorial, radius, fonts, motion } = tailwindBrandTokens;
  return `@import "tailwindcss";

:root,
[data-experience-mode="celebration"] {
  --me-surface: ${celebration.surface};
  --me-surface-raised: ${celebration.surfaceRaised};
  --me-ink: ${celebration.ink};
  --me-ink-muted: ${celebration.inkMuted};
  --me-primary: ${celebration.primary};
  --me-on-primary: ${celebration.onPrimary};
  --me-accent: ${celebration.accent};
}

[data-experience-mode="memorial"] {
  --me-surface: ${memorial.surface};
  --me-surface-raised: ${memorial.surfaceRaised};
  --me-ink: ${memorial.ink};
  --me-ink-muted: ${memorial.inkMuted};
  --me-primary: ${memorial.primary};
  --me-on-primary: ${memorial.onPrimary};
  --me-accent: ${memorial.accent};
}

@theme {
  --color-surface: var(--me-surface);
  --color-surface-raised: var(--me-surface-raised);
  --color-ink: var(--me-ink);
  --color-ink-muted: var(--me-ink-muted);
  --color-primary: var(--me-primary);
  --color-on-primary: var(--me-on-primary);
  --color-accent: var(--me-accent);

  --radius-sheet: ${radius.sheet};
  --radius-panel: ${radius.panel};
  --radius-control: ${radius.control};
  --radius-chip: ${radius.chip};

  --font-display: ${fonts.displayLatin};
  --font-sans: ${fonts.bodyLatin};
  --font-farsi: ${fonts.farsi};

  --ease-brand: ${motion.easing};
}
`;
}
