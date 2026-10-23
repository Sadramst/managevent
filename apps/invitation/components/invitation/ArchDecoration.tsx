import React from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";

interface ArchDecorationProps {
  theme: InvitationThemeTokens;
  className?: string;
}

export const ArchDecoration: React.FC<ArchDecorationProps> = ({ theme, className = "" }) => {
  const { ornaments, colors } = theme;
  const accentColor = colors.accent;

  if (ornaments === "none") return null;

  if (ornaments === "tile") {
    // Isfahan / Persian Azure geometric arch
    return (
      <svg
        className={`pointer-events-none absolute inset-x-2 top-2 bottom-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] ${className}`}
        viewBox="0 0 400 700"
        preserveAspectRatio="none"
        aria-hidden="true"
        fill="none"
      >
        <circle cx="200" cy="220" r="170" stroke={accentColor} strokeWidth="1.2" strokeDasharray="6 4" opacity="0.45" />
        <circle cx="200" cy="220" r="185" stroke={accentColor} strokeWidth="0.6" opacity="0.25" />
        <path d="M 15 220 L 15 690 L 385 690 L 385 220" stroke={accentColor} strokeWidth="0.8" opacity="0.3" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  if (ornaments === "florals") {
    // Botanic frame
    return (
      <svg
        className={`pointer-events-none absolute inset-x-3 top-3 bottom-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] ${className}`}
        viewBox="0 0 400 700"
        preserveAspectRatio="none"
        aria-hidden="true"
        fill="none"
      >
        <rect x="12" y="12" width="376" height="676" rx="24" stroke={accentColor} strokeWidth="1.2" opacity="0.5" vectorEffect="non-scaling-stroke" />
        <rect x="20" y="20" width="360" height="660" rx="18" stroke={accentColor} strokeWidth="0.6" opacity="0.3" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  // Default: Classic Luxury Double Arch
  return (
    <svg
      className={`pointer-events-none absolute inset-x-4 top-4 bottom-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] ${className}`}
      viewBox="0 0 400 700"
      preserveAspectRatio="none"
      aria-hidden="true"
      fill="none"
    >
      {/* Outer Arch */}
      <path
        d="M 8 692 L 8 210 A 192 192 0 0 1 392 210 L 392 692"
        stroke={accentColor}
        strokeWidth="1.4"
        opacity="0.55"
        vectorEffect="non-scaling-stroke"
      />
      {/* Inner Arch */}
      <path
        d="M 20 692 L 20 214 A 180 180 0 0 1 380 214 L 380 692"
        stroke={accentColor}
        strokeWidth="0.7"
        opacity="0.32"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
