import type { ReactNode } from "react";
import { cx } from "@managevent/ui/brand";

export interface StatsProps {
  /** Accessible name for the group, e.g. "Replies so far". */
  label?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/** A responsive grid of `StatTile`s, marked up as a description list. */
export function Stats({ label, className, children }: StatsProps) {
  return (
    <dl className={cx("stats", className)} aria-label={label}>
      {children}
    </dl>
  );
}

export interface StatTileProps {
  label: ReactNode;
  /** The figure. Numbers render with tabular lining numerals. */
  value: ReactNode;
  /** A short qualifier under the figure, e.g. "of 120 invited". */
  note?: ReactNode;
  className?: string | undefined;
}

/** One figure with its label (`.stat`). Use inside `Stats`. */
export function StatTile({ label, value, note, className }: StatTileProps) {
  return (
    <div className={cx("stat", className)}>
      <dt className="stat-label">{label}</dt>
      <dd className="stat-value">{value}</dd>
      {note ? <dd className="stat-note">{note}</dd> : null}
    </div>
  );
}
