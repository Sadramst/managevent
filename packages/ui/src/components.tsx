/**
 * RTL-safe and Memorial-Mode-aware base UI components (`docs/design/DESIGN_SYSTEM.md`).
 *
 * Uses logical CSS properties exclusively (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`).
 */
import React, { createContext, type ReactNode, useContext } from "react";
import { type ExperienceModeInput, getExperienceMode } from "@managevent/i18n";
import type { ExperienceMode } from "@managevent/types";
import { getCssVariablesForMode } from "./tokens.js";

const ExperienceModeContext = createContext<ExperienceMode>("CELEBRATION");

export interface ExperienceModeProviderProps {
  /** Direct mode override (`"CELEBRATION"` | `"MEMORIAL"`). */
  mode?: ExperienceMode;
  /** Ceremony slug, route or event metadata passed to `getExperienceMode()`. */
  ceremonyOrRoute?: ExperienceModeInput;
  /** Document direction (`"ltr"` | `"rtl"`). */
  dir?: "ltr" | "rtl";
  children?: ReactNode;
}

/**
 * Provides the active `ExperienceMode` and sets `data-experience-mode` and CSS variables.
 */
export function ExperienceModeProvider({
  mode,
  ceremonyOrRoute,
  dir,
  children,
}: ExperienceModeProviderProps) {
  const resolvedMode: ExperienceMode = mode ?? getExperienceMode(ceremonyOrRoute);
  const cssVars = getCssVariablesForMode(resolvedMode);

  return (
    <ExperienceModeContext.Provider value={resolvedMode}>
      <div
        data-experience-mode={resolvedMode.toLowerCase()}
        dir={dir}
        style={cssVars as React.CSSProperties}
        className="bg-surface text-ink text-start"
      >
        {children}
      </div>
    </ExperienceModeContext.Provider>
  );
}

/**
 * Reads the active `ExperienceMode` from `ExperienceModeProvider`.
 */
export function useExperienceMode(override?: ExperienceMode): ExperienceMode {
  const ctx = useContext(ExperienceModeContext);
  return override ?? ctx;
}

/**
 * Joins class names, filtering out falsy values.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  loading?: boolean;
  experienceMode?: ExperienceMode;
}

/**
 * Accessible button component (`rounded-[8px]` control radius, logical padding, focus-visible ring).
 */
export function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  experienceMode,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const mode = useExperienceMode(experienceMode);
  const isDisabled = disabled || loading;

  const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-primary text-on-primary hover:opacity-95 active:opacity-90",
    secondary: "bg-surface-raised text-ink border border-accent/40 hover:bg-surface",
    outline: "border border-primary text-primary bg-transparent hover:bg-primary/5",
    ghost: "bg-transparent text-ink hover:bg-ink/5",
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-experience-mode={mode.toLowerCase()}
      className={cn(
        "inline-flex items-center justify-center rounded-control ps-4 pe-4 py-2.5 font-sans text-sm font-medium transition-opacity",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to apply Sofreh-inspired subtle overlap layering (`DESIGN_SYSTEM.md`). */
  layered?: boolean;
  experienceMode?: ExperienceMode;
}

/**
 * Content panel (`rounded-[12px]` panel radius, `surface-raised` background, logical alignment).
 */
export function Panel({
  layered = false,
  experienceMode,
  className,
  children,
  ...rest
}: PanelProps) {
  const mode = useExperienceMode(experienceMode);
  return (
    <div
      data-experience-mode={mode.toLowerCase()}
      className={cn(
        "rounded-panel bg-surface-raised text-ink ps-6 pe-6 py-6 text-start border border-accent/25",
        layered && "-mt-3 ms-2 me-2",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  experienceMode?: ExperienceMode;
}

/**
 * Accessible form input control (`rounded-[8px]` control radius, logical padding).
 */
export function Input({ hasError = false, experienceMode, className, ...rest }: InputProps) {
  const mode = useExperienceMode(experienceMode);
  return (
    <input
      aria-invalid={hasError || undefined}
      data-experience-mode={mode.toLowerCase()}
      className={cn(
        "w-full rounded-control bg-surface-raised text-ink ps-3.5 pe-3.5 py-2 text-sm text-start border",
        hasError ? "border-primary" : "border-ink-muted/40",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
      {...rest}
    />
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  experienceMode?: ExperienceMode;
}

/**
 * Pill chip/badge (`rounded-[999px]` chip radius).
 */
export function Badge({ experienceMode, className, children, ...rest }: BadgeProps) {
  const mode = useExperienceMode(experienceMode);
  return (
    <span
      data-experience-mode={mode.toLowerCase()}
      className={cn(
        "inline-flex items-center rounded-chip bg-surface-raised text-ink ps-3 pe-3 py-1 text-xs font-medium border border-accent/40",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export interface ArchFrameProps {
  experienceMode?: ExperienceMode;
  className?: string;
  children?: ReactNode;
}

/**
 * Signature brand structural motif (`DESIGN_SYSTEM.md`):
 * - In Celebration Mode: renders a thin gold/accent arch framing hero media.
 * - In Memorial Mode: renders a calm rectangular frame with a fine bronze rule (no celebratory arch).
 */
export function ArchFrame({ experienceMode, className, children }: ArchFrameProps) {
  const mode = useExperienceMode(experienceMode);
  const isMemorial = mode === "MEMORIAL";

  return (
    <div
      data-experience-mode={mode.toLowerCase()}
      data-motif={isMemorial ? "memorial-rule" : "celebration-arch"}
      className={cn(
        "relative overflow-hidden border border-accent ps-6 pe-6 py-8",
        isMemorial ? "rounded-panel" : "rounded-t-[999px] rounded-b-panel",
        className,
      )}
    >
      {!isMemorial && (
        <svg
          aria-hidden="true"
          viewBox="0 0 200 260"
          className="pointer-events-none absolute inset-0 h-full w-full text-accent"
          fill="none"
        >
          <path
            d="M 8 252 L 8 104 A 92 92 0 0 1 192 104 L 192 252 Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
