import type { ReactNode } from "react";
import { getSitePages } from "@managevent/i18n";
import type { EnabledLocale } from "@managevent/types";
import { ButtonLink, cx } from "@managevent/ui/brand";
import { localePath, routes } from "../lib/site";
import {
  breadcrumbJsonLd,
  serializeJsonLd,
  type Crumb,
  type JsonLdData,
} from "../lib/structured-data";

/** Inline structured data. A JSON data block, not executable script. */
export function JsonLd({ data }: { data: JsonLdData | readonly JsonLdData[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

/**
 * Visible breadcrumb trail plus its BreadcrumbList structured data. Pass the trail after
 * "Home"; the last item is the current page and is not a link.
 */
export function Breadcrumbs({ locale, trail }: { locale: EnabledLocale; trail: readonly Crumb[] }) {
  const copy = getSitePages(locale).nav;
  const crumbs: Crumb[] = [{ name: copy.home, path: routes.home }, ...trail];
  return (
    <>
      <nav className="wrap sp-crumbs" aria-label={copy.breadcrumbLabel}>
        <ol>
          {crumbs.map((crumb, index) =>
            index === crumbs.length - 1 ? (
              <li key={crumb.path} aria-current="page">
                {crumb.name}
              </li>
            ) : (
              <li key={crumb.path}>
                <a href={localePath(locale, crumb.path)}>{crumb.name}</a>
              </li>
            ),
          )}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}

/** The brand arch drawn as a line mark, used at the top of an arch composition. */
function ArchMark() {
  return (
    <svg
      className="sp-arch-mark"
      viewBox="0 0 44 52"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 50V22a18 18 0 0 1 36 0v28" />
      <path d="M12 50V24a10 10 0 0 1 20 0v26" />
      <path d="M1 50h42" />
    </svg>
  );
}

/**
 * A typographic arch composition for a page hero's second column. The site has no event
 * photography yet, so this carries the brand motif without inventing imagery.
 */
export function ArchCard({
  title,
  lines,
  ordered,
}: {
  title: string;
  /** Short lines of text, or links. */
  lines: readonly ReactNode[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className="arch-frame sp-arch">
      <ArchMark />
      <p className="sp-arch-title">{title}</p>
      <List>
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </List>
    </div>
  );
}

export function CheckList({ items, columns }: { items: readonly string[]; columns?: 1 | 2 }) {
  return (
    <ul className={cx("sp-checks", columns === 2 && "sp-checks-2")}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** The closing call to action shared by the inner pages. */
export function CtaBand({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-dark sp-dark sp-cta">
      <div className="wrap section">
        <h2>{title}</h2>
        <p className="section-lead">{body}</p>
        <div className="page-hero-actions">{children}</div>
      </div>
    </section>
  );
}

/** The default closing band: "Talk to us" plus one related link. */
export function EnquiryCta({
  locale,
  secondary,
}: {
  locale: EnabledLocale;
  secondary?: { label: string; href: string; external?: boolean };
}) {
  const copy = getSitePages(locale).shared;
  return (
    <CtaBand title={copy.ctaTitle} body={copy.ctaBody}>
      <ButtonLink
        variant="inverse"
        label={copy.talkToUs}
        href={localePath(locale, routes.contact)}
      />
      {secondary ? <ButtonLink variant="outline-inverse" {...secondary} /> : null}
    </CtaBand>
  );
}
