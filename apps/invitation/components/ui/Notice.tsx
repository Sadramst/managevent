import type { ReactNode } from "react";
import { cx } from "@managevent/ui/brand";

export type Tone = "info" | "success" | "warning" | "danger";

export interface NoticeProps {
  /** `info` (default) uses the primary rule; the others use the status tokens. */
  tone?: Tone | undefined;
  title?: ReactNode;
  children?: ReactNode;
  /**
   * `alert` interrupts a screen reader (errors after a submit); `status` waits its turn
   * (success, saved). Leave unset for static page content.
   */
  role?: "alert" | "status" | undefined;
  id?: string | undefined;
  className?: string | undefined;
  /** Lets code move focus here, e.g. to an error summary after a failed submit. */
  tabIndex?: number | undefined;
}

/** An inline message box (`.alert`): validation summaries, capability notices, confirmations. */
export function Notice({
  tone = "info",
  title,
  children,
  role,
  id,
  className,
  tabIndex,
}: NoticeProps) {
  return (
    <div
      className={cx("alert", tone !== "info" && `alert-${tone}`, className)}
      role={role}
      id={id}
      tabIndex={tabIndex}
    >
      {title ? <strong className="alert-title">{title}</strong> : null}
      {typeof children === "string" ? <p>{children}</p> : children}
    </div>
  );
}
