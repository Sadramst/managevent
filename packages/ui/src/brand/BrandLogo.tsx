import React from "react";
import { type BrandTone, cx } from "./shared.js";

export interface BrandLogoProps {
  /**
   * The background the logo sits on. `onLight` (default) is for ivory and white surfaces,
   * `onDark` is for burgundy, ink and photo overlays. Colours are token-driven, so the logo
   * follows Memorial Mode automatically.
   */
  tone?: BrandTone;
  /** Size of the lockup. `md` (default) suits a header, `sm` a footer, `lg` a splash screen. */
  size?: "sm" | "md" | "lg";
  /** Small line under the name, e.g. the product ("Events", "Invitations"). Supplied by the app. */
  descriptor?: string;
  /** Render only the arch mark, without the name. Pass `title` so it still has a name. */
  markOnly?: boolean;
  /** Accessible name for the mark when it stands alone (`markOnly`). */
  title?: string;
  className?: string;
}

/** The brand name is a proper noun, not translatable copy. */
const BRAND_NAME = "Managevent";

/**
 * The Managevent logo: the ceremony-arch mark plus the wordmark. Single source for every app.
 *
 * It is styled by `@managevent/ui/brand.css` (`.brand-logo`, `.brand-mark`, `.brand-name`,
 * `.brand-descriptor`) and needs no Tailwind utilities. The mark is drawn with paths only,
 * so it renders identically before web fonts load.
 */
export function BrandLogo({
  tone = "onLight",
  size = "md",
  descriptor,
  markOnly = false,
  title,
  className,
}: BrandLogoProps) {
  const labelled = Boolean(markOnly && title);
  return (
    <span className={cx("brand-logo", className)} data-tone={tone} data-size={size}>
      <svg
        className="brand-mark"
        viewBox="0 0 48 56"
        width="36"
        height="42"
        role={labelled ? "img" : undefined}
        aria-label={labelled ? title : undefined}
        aria-hidden={labelled ? undefined : true}
        focusable="false"
      >
        <path
          className="brand-mark-ground"
          strokeWidth="1.5"
          d="M3 53.5V24a21 21 0 0 1 42 0v29.5Z"
        />
        <path className="brand-mark-line" strokeWidth="1" d="M8.5 49V24a15.5 15.5 0 0 1 31 0v25" />
        <path
          className="brand-mark-line"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          d="M16 43.5V27l8 10.5L32 27v16.5"
        />
      </svg>
      {!markOnly && (
        <span className="brand-wordmark">
          <span className="brand-name">{BRAND_NAME}</span>
          {descriptor ? <span className="brand-descriptor">{descriptor}</span> : null}
        </span>
      )}
    </span>
  );
}
