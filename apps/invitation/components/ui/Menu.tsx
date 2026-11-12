"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";
import { cx } from "@managevent/ui/brand";

export interface MenuProps {
  /** What the toggle shows (text, an avatar, an icon). */
  summary: ReactNode;
  /** Accessible name of the toggle when its content is not descriptive enough. */
  label?: string | undefined;
  summaryClassName?: string | undefined;
  /** Which inline edge of the toggle the panel lines up with. */
  align?: "start" | "end" | undefined;
  className?: string | undefined;
  /** Menu content: `.menu-list` with `.menu-item` links or buttons, `.menu-heading`, `.menu-sep`. */
  children: ReactNode;
}

/**
 * A small popover menu on a native `<details>` element, so it opens and closes without
 * JavaScript. Once hydrated it also closes on Escape (focus returns to the toggle), on a press
 * outside, when a link inside is followed and when the route changes.
 */
export function Menu({
  summary,
  label,
  summaryClassName,
  align = "end",
  className,
  children,
}: MenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const details = ref.current;
      if (details?.open && !details.contains(event.target as Node)) details.open = false;
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <details
      ref={ref}
      className={cx("menu", className)}
      data-align={align}
      onKeyDown={(event) => {
        const details = ref.current;
        if (event.key === "Escape" && details?.open) {
          details.open = false;
          details.querySelector("summary")?.focus();
        }
      }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a") && ref.current) ref.current.open = false;
      }}
    >
      <summary className={summaryClassName} aria-label={label}>
        {summary}
      </summary>
      <div className="menu-panel">{children}</div>
    </details>
  );
}
