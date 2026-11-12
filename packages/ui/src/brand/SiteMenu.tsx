"use client";

import React, { type ReactNode, useRef } from "react";

export interface SiteMenuProps {
  /** Visible label on the toggle, e.g. "Menu". */
  label: string;
  children?: ReactNode;
}

/**
 * The small-screen menu. It is a native `<details>` element, so it opens and closes with no
 * JavaScript. Once hydrated it also closes when a link inside is followed or Escape is pressed,
 * which matters for in-page anchors that do not reload the page.
 */
export function SiteMenu({ label, children }: SiteMenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = (restoreFocus: boolean) => {
    const details = ref.current;
    if (!details?.open) return;
    details.open = false;
    if (restoreFocus) details.querySelector("summary")?.focus();
  };
  return (
    <details
      ref={ref}
      className="site-menu"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) close(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") close(true);
      }}
    >
      <summary className="site-menu-toggle">
        <svg className="site-menu-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path
            className="when-closed"
            strokeWidth="1.75"
            strokeLinecap="round"
            d="M3 6h14M3 10h14M3 14h14"
          />
          <path
            className="when-open"
            strokeWidth="1.75"
            strokeLinecap="round"
            d="M5 5l10 10M15 5L5 15"
          />
        </svg>
        {label}
      </summary>
      <div className="site-menu-panel">{children}</div>
    </details>
  );
}
