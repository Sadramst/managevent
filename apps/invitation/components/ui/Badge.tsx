import type { ReactNode } from "react";
import { cx } from "@managevent/ui/brand";

export interface BadgeProps {
  /** `primary` (default) is the outlined burgundy chip; the others are status tones. */
  tone?: "primary" | "neutral" | "success" | "warning" | "danger" | undefined;
  /** Filled instead of outlined (primary tone only). */
  solid?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/** A small status chip (`.badge`). The text carries the meaning; colour only supports it. */
export function Badge({ tone = "primary", solid, className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        "badge",
        tone !== "primary" && `badge-${tone}`,
        solid && tone === "primary" && "badge-solid",
        className,
      )}
    >
      {children}
    </span>
  );
}
