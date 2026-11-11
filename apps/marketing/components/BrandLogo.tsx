import React from "react";

export interface BrandLogoProps {
  /** Variant of the logo to render */
  variant?: "full" | "compact" | "mark" | "badge";
  /** Subtitle text underneath MANAGEVENT, e.g. 'Invitations', 'Ceremonies & Events', 'Host Studio' */
  subtitle?: string;
  /** Size scale: 'sm' | 'md' | 'lg' | 'xl' */
  size?: "sm" | "md" | "lg" | "xl";
  /** Color theme: 'gold' (default celebration gold on dark/burgundy) | 'dark' | 'light' | 'memorial' */
  theme?: "gold" | "dark" | "light" | "memorial";
  /** Custom className */
  className?: string;
}

/**
 * Managevent Luxury Brand Logo & Emblem Mark
 *
 * Implements the brand design system specifications:
 * - Signature Ceremony Arch Frame motif
 * - Slender gold leaf botanical accents
 * - Cormorant Garamond luxury serif typography
 * - High-contrast metallic champagne gold & royal burgundy palette
 * - Full SVG vector clarity and responsive scaling
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "compact",
  subtitle = "Invitations",
  size = "md",
  theme = "gold",
  className = "",
}) => {
  // Size metrics
  const emblemSizes = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const titleSizes = {
    sm: "text-base tracking-widest",
    md: "text-lg tracking-widest",
    lg: "text-2xl tracking-[0.2em]",
    xl: "text-3xl tracking-[0.22em]",
  };

  const subtitleSizes = {
    sm: "text-[9px] tracking-wider",
    md: "text-[10px] tracking-widest",
    lg: "text-xs tracking-[0.25em]",
    xl: "text-sm tracking-[0.28em]",
  };

  // Color mappings
  const strokeColor =
    theme === "memorial"
      ? "#8C7A6B" // Warm Bronze
      : theme === "dark"
      ? "#18181B" // Rich Charcoal
      : theme === "light"
      ? "#FFFFFF"
      : "#C5A059"; // Champagne Gold

  const gradientStart =
    theme === "memorial"
      ? "#8C7A6B"
      : theme === "dark"
      ? "#27272A"
      : theme === "light"
      ? "#FFFFFF"
      : "#F3E2B8";

  const gradientEnd =
    theme === "memorial"
      ? "#57483B"
      : theme === "dark"
      ? "#18181B"
      : theme === "light"
      ? "#E5E7EB"
      : "#9E7D3B";

  const badgeBg =
    theme === "memorial"
      ? "bg-stone-900 border-stone-700 shadow-stone-950/40"
      : theme === "dark"
      ? "bg-stone-100 border-stone-300"
      : "bg-gradient-to-b from-[#2B0E14] to-[#150609] border-[#C5A059]/40 shadow-amber-950/50";

  // SVG Arch Emblem
  const ArchEmblem = (
    <div
      className={`relative flex items-center justify-center rounded-button ${badgeBg} border shadow-lg ${emblemSizes[size]} transition-all duration-300`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 60 72"
        className="h-full w-full p-1"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`goldGrad-${size}-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="50%" stopColor="#DFC389" />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
          <filter id={`glow-${size}-${theme}`} x1="-20%" y1="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Ceremony Arch Frame */}
        <path
          d="M 6 66 L 6 30 A 24 24 0 0 1 54 30 L 54 66"
          stroke={`url(#goldGrad-${size}-${theme})`}
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Delicate Inner Arch Accent */}
        <path
          d="M 11 64 L 11 31 A 19 19 0 0 1 49 31 L 49 64"
          stroke={strokeColor}
          strokeWidth="0.7"
          strokeDasharray="2 2"
          opacity="0.6"
        />

        {/* Arch Keystone Star / Diamond */}
        <path
          d="M 30 3.5 L 32.5 6 L 30 8.5 L 27.5 6 Z"
          fill={`url(#goldGrad-${size}-${theme})`}
        />

        {/* Left Laurel Sprig Accent */}
        <path
          d="M 8 50 C 4 48 4 44 9 46 M 7 56 C 2 54 3 50 8 52"
          stroke={strokeColor}
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Right Laurel Sprig Accent */}
        <path
          d="M 52 50 C 56 48 56 44 51 46 M 53 56 C 58 54 57 50 52 52"
          stroke={strokeColor}
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Refined Luxury Serif Monogram 'M' */}
        <text
          x="30"
          y="48"
          textAnchor="middle"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontSize="24"
          fontWeight="600"
          fill={`url(#goldGrad-${size}-${theme})`}
          style={{ letterSpacing: "-0.02em" }}
        >
          M
        </text>

        {/* Base Pedestal Line */}
        <line
          x1="12"
          y1="64"
          x2="48"
          y2="64"
          stroke={`url(#goldGrad-${size}-${theme})`}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );

  if (variant === "mark" || variant === "badge") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {ArchEmblem}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {ArchEmblem}

      <div className="flex flex-col text-start">
        <div className="flex items-center gap-2">
          <span
            className={`font-serif font-bold text-white uppercase ${titleSizes[size]} transition-colors`}
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Managevent
          </span>
          {subtitle && variant === "compact" && (
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              {subtitle}
            </span>
          )}
        </div>

        {variant === "full" && subtitle && (
          <span
            className={`font-sans font-medium uppercase text-amber-300/80 ${subtitleSizes[size]} mt-0.5`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;

