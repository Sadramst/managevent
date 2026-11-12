import React, { type HTMLAttributes, type ReactNode } from "react";
import { type BrandLink, cx, linkProps } from "./shared.js";

type BlockTag = "div" | "section" | "article" | "main" | "aside" | "header" | "footer" | "li";

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: BlockTag;
  /** `narrow` caps the measure at 880px for prose and forms. */
  size?: "default" | "narrow";
}

/** The page gutter and maximum width (`.wrap`). */
export function Container({ as = "div", size = "default", className, ...rest }: ContainerProps) {
  return React.createElement(as, {
    className: cx("wrap", size === "narrow" && "wrap-narrow", className),
    ...rest,
  });
}

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  /** A full-bleed raised band with fine rules above and below. */
  band?: boolean;
  /** Halve the vertical rhythm for dense app screens. */
  tight?: boolean;
  /** Width of the inner container. */
  size?: "default" | "narrow";
}

/** A page section with the brand's vertical rhythm and an inner container. */
export function Section({
  band,
  tight,
  size = "default",
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section className={cx(band && "band", className)} {...rest}>
      <div
        className={cx(
          "wrap",
          size === "narrow" && "wrap-narrow",
          "section",
          tight && "section-tight",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

/** The small label above a heading. Sentence case, never tracked capitals. */
export function Eyebrow({ className, ...rest }: EyebrowProps) {
  return <p className={cx("eyebrow", className)} {...rest} />;
}

export interface SectionHeadProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Heading level of the title. Defaults to 2. */
  level?: 1 | 2 | 3;
  className?: string;
}

/** Eyebrow, heading and lead paragraph that open a section. */
export function SectionHead({ eyebrow, title, lead, level = 2, className }: SectionHeadProps) {
  return (
    <div className={cx("section-head", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      {React.createElement(`h${level}`, null, title)}
      {lead ? <p className="section-lead">{lead}</p> : null}
    </div>
  );
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: BlockTag;
  /**
   * `default` raised card, `quiet` sits flush on a raised band, `accent` adds a primary top
   * rule, `rule` is a borderless card with a primary start rule, `sheet` is the large 24px panel.
   */
  variant?: "default" | "quiet" | "accent" | "rule" | "sheet";
}

/** A content card or panel. Radius follows hierarchy (sheet 24px, card 12px). */
export function Card({ as = "div", variant = "default", className, ...rest }: CardProps) {
  const variantClass =
    variant === "sheet"
      ? "panel"
      : cx(
          "card",
          variant === "quiet" && "card-quiet",
          variant === "accent" && "card-accent",
          variant === "rule" && "card-rule",
        );
  return React.createElement(as, { className: cx(variantClass, className), ...rest });
}

export interface ButtonLinkProps extends BrandLink {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "inverse" | "outline-inverse";
  size?: "small" | "default" | "large";
  /** Stretch to the full inline size of the parent. */
  block?: boolean;
  className?: string;
}

/**
 * A link that looks like a button (`.button`). For actions, use a real
 * `<button className="button">` with the same classes.
 */
export function ButtonLink({
  variant = "primary",
  size = "default",
  block,
  className,
  ...link
}: ButtonLinkProps) {
  return (
    <a
      className={cx(
        "button",
        variant !== "primary" && `button-${variant}`,
        size !== "default" && `button-${size}`,
        block && "button-block",
        className,
      )}
      {...linkProps(link)}
    >
      {link.label}
    </a>
  );
}

export interface PageHeroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Buttons or links under the lead. */
  actions?: ReactNode;
  /** Optional second column, e.g. arch-framed media. */
  aside?: ReactNode;
  /** Render on the burgundy surface instead of ivory. */
  tone?: "light" | "dark";
  className?: string;
}

/** The opening block of an inner page: eyebrow, `h1`, lead, actions and optional media. */
export function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  aside,
  tone = "light",
  className,
}: PageHeroProps) {
  return (
    <section className={cx("page-hero", tone === "dark" && "surface-dark", className)}>
      <div className="wrap page-hero-grid">
        <div>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h1>{title}</h1>
          {lead ? <p className="lead">{lead}</p> : null}
          {actions ? <div className="page-hero-actions">{actions}</div> : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </section>
  );
}
