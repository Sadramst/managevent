import { cx } from "@managevent/ui/brand";

export interface SpinnerProps {
  /** Read out by screen readers. Omit when nearby text already says what is happening. */
  label?: string | undefined;
  large?: boolean | undefined;
  className?: string | undefined;
}

/** A quiet progress ring. It stops turning under `prefers-reduced-motion`. */
export function Spinner({ label, large, className }: SpinnerProps) {
  return (
    <>
      <span className={cx("spinner", large && "spinner-large", className)} aria-hidden="true" />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  );
}

/** A centred spinner with visible text, for `loading.tsx` files and pending panels. */
export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="loading-block" role="status">
      <span className="spinner spinner-large" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
