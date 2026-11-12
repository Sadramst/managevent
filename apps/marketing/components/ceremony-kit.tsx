import type { CSSProperties, ReactNode } from "react";
import { getCeremonyPages } from "@managevent/i18n";
import type { EnabledLocale, ExperienceMode } from "@managevent/types";
import { cx } from "@managevent/ui/brand";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import { ceremonyMode, type Ceremony } from "../lib/content";
import { localePath, routes } from "../lib/site";

/** Inline style and data attribute that put a subtree into an experience mode. */
export function modeProps(mode: ExperienceMode): {
  "data-experience-mode": string;
  style?: CSSProperties;
} {
  return {
    "data-experience-mode": mode.toLowerCase(),
    ...(mode === "MEMORIAL" ? { style: getCssVariablesForMode("MEMORIAL") as CSSProperties } : {}),
  };
}

/**
 * The page's `<main>`. In Memorial Mode it swaps the palette tokens for everything inside it,
 * and the arch motif becomes a plain rule (see brand.css).
 */
export function ModeMain({ mode, children }: { mode: ExperienceMode; children: ReactNode }) {
  return (
    <main id="main" className="cp-main" {...modeProps(mode)}>
      {children}
    </main>
  );
}

export function ceremonyPath(slug: string): string {
  return `${routes.ceremonies}/${slug}`;
}

/** Where a ceremony's enquiry buttons go. The contact form reads `?ceremony=`. */
export function ceremonyEnquiryPath(slug: string): string {
  return `${routes.contact}?ceremony=${encodeURIComponent(slug)}`;
}

/** A linked card for one ceremony. Memorial ceremonies render in the memorial palette. */
export function CeremonyCard({
  locale,
  ceremony,
  headingLevel = 3,
  showMemorialTag = false,
}: {
  locale: EnabledLocale;
  ceremony: Ceremony;
  headingLevel?: 3 | 4;
  showMemorialTag?: boolean;
}) {
  const copy = getCeremonyPages(locale);
  const mode = ceremonyMode(ceremony);
  const Heading = `h${headingLevel}` as "h3" | "h4";
  return (
    <article className={cx("card", "cp-card")} {...modeProps(mode)}>
      {showMemorialTag && mode === "MEMORIAL" ? (
        <span className="pill cp-card-tag">{copy.shared.memorialTag}</span>
      ) : null}
      <Heading className="card-title">
        <a href={localePath(locale, ceremonyPath(ceremony.slug))}>{ceremony.name.en}</a>
      </Heading>
      <p className="card-body">{ceremony.summary.en}</p>
      <p className="cp-card-more" aria-hidden="true">
        {copy.hub.cardLink}
      </p>
    </article>
  );
}

/** FAQ accordion built on native `<details>`, so it works without JavaScript. */
export function FaqList({
  items,
  openFirst,
}: {
  items: readonly { question: string; answer: string }[];
  /** Show the first answer open, as a cue that the questions expand. */
  openFirst?: boolean;
}) {
  return (
    <div className="sp-faq">
      {items.map((item, index) => (
        <details key={item.question} open={openFirst && index === 0}>
          <summary>
            <h3>{item.question}</h3>
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
