"use client";

import React from "react";
import type { InvitationThemeId, ExperienceMode } from "@managevent/types";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import { Palette, Check, Sparkles, Shield } from "lucide-react";

interface ThemeStudioProps {
  currentThemeId: InvitationThemeId;
  experienceMode: ExperienceMode;
  onSelectTheme: (themeId: InvitationThemeId) => void;
}

export const ThemeStudio: React.FC<ThemeStudioProps> = ({
  currentThemeId,
  experienceMode,
  onSelectTheme,
}) => {
  const isMemorial = experienceMode === "MEMORIAL";

  // Filter allowed themes based on Memorial Mode contract
  const availableThemes = Object.values(INVITATION_THEMES).filter((t) => {
    if (isMemorial) {
      return t.id.startsWith("memorial-");
    }
    return !t.id.startsWith("memorial-");
  });

  return (
    <div className="rounded-card border bg-white p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-amber-600" />
            <h3 className="font-display text-lg font-bold text-neutral-900">
              Visual Design & Palette
            </h3>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Select a curated typography and color theme designed for your ceremony.
          </p>
        </div>

        {isMemorial && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border px-3 py-1 text-xs font-semibold text-neutral-700">
            <Shield className="h-3.5 w-3.5 text-neutral-500" />
            <span>Memorial Mode Protected</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableThemes.map((theme) => {
          const isSelected = currentThemeId === theme.id;
          const { colors } = theme;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme.id as InvitationThemeId)}
              className={`group relative rounded-card border text-start p-4 transition-all ${
                isSelected
                  ? "ring-2 ring-amber-600 shadow-md"
                  : "hover:border-neutral-400 hover:shadow-xs"
              }`}
              style={{
                backgroundColor: colors.bg,
                borderColor: isSelected ? colors.accent : colors.rule,
              }}
            >
              {/* Color swatches preview bar */}
              <div
                className="flex h-6 w-full overflow-hidden rounded-button border mb-3"
                style={{ borderColor: colors.rule }}
              >
                <div className="flex-1" style={{ backgroundColor: colors.surface }} />
                <div className="flex-1" style={{ backgroundColor: colors.bgWarm }} />
                <div className="flex-1" style={{ backgroundColor: colors.accent }} />
                <div className="flex-1" style={{ backgroundColor: colors.accentInk }} />
              </div>

              {/* Title & Description */}
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm font-bold" style={{ color: colors.accentInk }}>
                  {theme.name}
                </span>
                {isSelected && (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.accent, color: "#FFFFFF" }}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs" style={{ color: colors.inkMuted }}>
                {theme.ornaments === "tile"
                  ? "Persian geometric tile motifs & gold foils"
                  : theme.ornaments === "florals"
                    ? "Subtle botanical filigree borders"
                    : theme.ornaments === "arch"
                      ? "Classic architectural arch frames"
                      : "Calm, dignified minimal borders"}
              </p>

              {/* Badge for theme ornaments */}
              <div
                className="mt-3 flex items-center gap-1.5 text-[10px] font-mono uppercase"
                style={{ color: colors.accent }}
              >
                <Sparkles className="h-3 w-3" />
                <span>{theme.ornaments} ornament</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
