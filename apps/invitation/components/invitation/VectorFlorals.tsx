import React from "react";
import type { InvitationThemeTokens } from "@managevent/ui/themes";

interface VectorFloralsProps {
  theme: InvitationThemeTokens;
  position?: "top-end" | "bottom-start" | "both";
  className?: string;
}

export const FloralCorner: React.FC<{
  position: "top-end" | "bottom-start";
  theme: InvitationThemeTokens;
  className?: string;
}> = ({ position, theme, className = "" }) => {
  const isTopEnd = position === "top-end";
  const accentColor = theme.colors.accent;
  const accentInk = theme.colors.accentInk;
  const bgWarm = theme.colors.bgWarm;
  const surface = theme.colors.surface;

  return (
    <svg
      viewBox="0 0 300 300"
      className={`pointer-events-none absolute h-52 w-52 opacity-90 transition-opacity duration-700 sm:h-72 sm:w-72 ${
        isTopEnd ? "-end-8 -top-8" : "-bottom-8 -start-8"
      } ${className}`}
      style={!isTopEnd ? { transform: "scaleX(-1) scaleY(-1)" } : undefined}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`goldGrad-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.9" />
          <stop offset="100%" stopColor={accentInk} stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Stem curves */}
      <g transform="translate(196 70) rotate(128) scale(1.15)">
        <path d="M 0 0 Q 40 -14 84 -6" fill="none" stroke={accentColor} strokeWidth="1.2" />
        {/* Leaf pairs */}
        {[
          { pos: [14, -3.96], r1: -38, r2: 34, len: 16 },
          { pos: [30, -6.2], r1: -38, r2: 34, len: 14.4 },
          { pos: [46, -8.44], r1: -38, r2: 34, len: 12.8 },
          { pos: [62, -10.68], r1: -38, r2: 34, len: 11.2 },
          { pos: [76, -12.64], r1: -38, r2: 34, len: 9.6 },
        ].map((item, idx) => {
          const px = item.pos[0] ?? 0;
          const py = item.pos[1] ?? 0;
          return (
            <g key={idx}>
              <g transform={`rotate(${item.r1} ${px} ${py})`}>
                <path
                  d={`M ${px} ${py} Q ${px + 5} ${py - 5} ${px + item.len} ${py} Q ${px + 5} ${py + 5} ${px} ${py} Z`}
                  fill={bgWarm}
                />
                <path
                  d={`M ${px} ${py} L ${px + item.len} ${py}`}
                  stroke={accentColor}
                  strokeWidth="0.8"
                  opacity="0.6"
                />
              </g>
              <g transform={`rotate(${item.r2} ${px} ${py})`}>
                <path
                  d={`M ${px} ${py} Q ${px + 5} ${py - 5} ${px + item.len} ${py} Q ${px + 5} ${py + 5} ${px} ${py} Z`}
                  fill={surface}
                />
                <path
                  d={`M ${px} ${py} L ${px + item.len} ${py}`}
                  stroke={accentColor}
                  strokeWidth="0.8"
                  opacity="0.6"
                />
              </g>
            </g>
          );
        })}
      </g>

      {/* Decorative berries */}
      <circle cx="128" cy="96" r="4.5" fill={accentInk} opacity="0.85" />
      <circle cx="140" cy="84" r="4.5" fill={accentInk} opacity="0.85" />
      <circle cx="118" cy="82" r="4.5" fill={accentInk} opacity="0.85" />
      <circle cx="196" cy="150" r="4.5" fill={accentInk} opacity="0.85" />
      <circle cx="208" cy="162" r="4.5" fill={accentInk} opacity="0.85" />

      {/* Main Blossom Flower */}
      <g>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <ellipse
            key={i}
            cx="244"
            cy="36"
            rx="15"
            ry="28"
            fill={bgWarm}
            transform={`rotate(${angle} 244 64)`}
            opacity="0.9"
          />
        ))}
        <circle cx="244" cy="64" r="14" fill={accentColor} opacity="0.75" />
        <circle cx="244" cy="64" r="7" fill={surface} opacity="0.9" />
      </g>
    </svg>
  );
};

export const VectorFlorals: React.FC<VectorFloralsProps> = ({
  theme,
  position = "both",
  className = "",
}) => {
  if (theme.ornaments === "none") return null;

  return (
    <>
      {(position === "top-end" || position === "both") && (
        <FloralCorner position="top-end" theme={theme} className={className} />
      )}
      {(position === "bottom-start" || position === "both") && (
        <FloralCorner position="bottom-start" theme={theme} className={className} />
      )}
    </>
  );
};
