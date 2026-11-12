/**
 * Shared types and helpers for the brand shell (`@managevent/ui/brand`).
 *
 * Kept free of React state and context so every brand component stays server-compatible.
 */

/** The two public Managevent web products that share this shell. */
export type BrandProduct = "events" | "invitations";

/** Which background the element sits on. Colours come from tokens either way. */
export type BrandTone = "onLight" | "onDark";

/** A navigation or footer link. Labels always come from the app (`packages/i18n`). */
export interface BrandLink {
  label: string;
  href: string;
  /** Marks the current page for assistive technology and styling (`aria-current="page"`). */
  current?: boolean;
  /** Set for links that leave this site (the sibling product, Appilico). Adds `rel="noopener"`. */
  external?: boolean;
}

/** Joins class names and drops falsy values. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Anchor attributes shared by every brand link. */
export function linkProps(link: BrandLink): {
  href: string;
  rel?: string;
  "aria-current"?: "page";
} {
  return {
    href: link.href,
    ...(link.external ? { rel: "noopener" } : {}),
    ...(link.current ? { "aria-current": "page" as const } : {}),
  };
}
