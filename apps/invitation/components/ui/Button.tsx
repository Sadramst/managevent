import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@managevent/ui/brand";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "small" | "default" | "large";

export interface ButtonStyle {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Stretch to the full inline size of the parent. */
  block?: boolean | undefined;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyle {
  /** Shows a spinner, sets `aria-busy` and blocks further presses. */
  pending?: boolean | undefined;
  /** Replaces the label while pending, e.g. "Saving". */
  pendingLabel?: ReactNode;
}

/** Class list for anything that should look like a brand button (`<button>`, `<a>`, `Link`). */
export function buttonClass(style: ButtonStyle = {}, className?: string): string {
  const { variant = "primary", size = "default", block } = style;
  return cx(
    "button",
    variant !== "primary" && `button-${variant}`,
    size !== "default" && `button-${size}`,
    block && "button-block",
    className,
  );
}

/**
 * A real `<button>` in the brand style, with a built-in pending state. Defaults to
 * `type="button"`; use `SubmitButton` inside a `<form action={...}>`.
 */
export function Button({
  variant,
  size,
  block,
  pending = false,
  pendingLabel,
  className,
  disabled,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={buttonClass({ variant, size, block }, className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending ? <span className="spinner" aria-hidden="true" /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
