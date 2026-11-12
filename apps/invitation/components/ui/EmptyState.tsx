import { createElement, type ReactNode } from "react";
import { cx } from "@managevent/ui/brand";

export interface EmptyStateProps {
  title: ReactNode;
  /** One or two plain sentences: what this area is for and what to do next. */
  children?: ReactNode;
  /** The next step, usually one primary button or link. */
  actions?: ReactNode;
  /** Heading level of the title (default 2). */
  level?: 2 | 3 | 4 | undefined;
  className?: string | undefined;
}

/** The dashed "nothing here yet" block (`.empty`) with a clear next step. */
export function EmptyState({ title, children, actions, level = 2, className }: EmptyStateProps) {
  return (
    <div className={cx("empty", className)}>
      {createElement(`h${level}`, { className: "empty-title" }, title)}
      {children ? <div className="empty-body">{children}</div> : null}
      {actions ? <div className="cluster">{actions}</div> : null}
    </div>
  );
}
