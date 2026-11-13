"use client";

import { useState, type CSSProperties } from "react";
import type { InvitationThemeId } from "@managevent/types";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import { InvitationPreview } from "./InvitationPreview";

const HERO_SWATCHES: readonly { id: InvitationThemeId; short: string }[] = [
  { id: "royal-ivory", short: "Ivory" },
  { id: "midnight-celestial", short: "Midnight" },
  { id: "emerald-botanic", short: "Emerald" },
  { id: "alabaster-platinum", short: "Platinum" },
];

export interface HeroPreviewSwitcherProps {
  initialThemeId: InvitationThemeId;
  hosts: string;
  headline: string;
  title?: string | undefined;
}

export function HeroPreviewSwitcher({
  initialThemeId,
  hosts,
  headline,
  title,
}: HeroPreviewSwitcherProps) {
  const [themeId, setThemeId] = useState<InvitationThemeId>(initialThemeId);

  return (
    <div className="pub-hero-switcher-wrap">
      <InvitationPreview themeId={themeId} hosts={hosts} headline={headline} title={title} />
      <div className="pub-hero-switcher" role="group" aria-label="Preview invitation themes">
        {HERO_SWATCHES.map((swatch) => {
          const theme = INVITATION_THEMES[swatch.id];
          const active = themeId === swatch.id;
          return (
            <button
              key={swatch.id}
              type="button"
              className="pub-hero-swatch"
              aria-pressed={active}
              aria-label={theme.name}
              onClick={() => setThemeId(swatch.id)}
              style={
                {
                  "--swatch-bg": theme.colors.bg,
                  "--swatch-accent": theme.colors.accentInk,
                } as CSSProperties
              }
            >
              <span className="pub-hero-swatch-dot" aria-hidden="true" />
              <span>{swatch.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
