import React, { type CSSProperties } from "react";
import { BrandLogo } from "./BrandLogo.js";
import { type BrandLink, type BrandProduct, cx, linkProps } from "./shared.js";

export interface SiteFooterColumn {
  /** Column heading, also the accessible name of the column's navigation landmark. */
  title: string;
  links: readonly BrandLink[];
}

export interface SiteFooterContact {
  /** Heading of the contact block, e.g. "Contact". */
  title: string;
  email?: string;
  phone?: string;
}

export interface SiteFooterProps {
  /** Which product this footer belongs to. Exposed as `data-product`. */
  product: BrandProduct;
  /** Short product name shown under the wordmark, e.g. "Events" or "Invitations". */
  productLabel: string;
  /** Where the logo links to (the product's home). The link is named by the visible wordmark. */
  homeHref: string;
  /** One short line under the logo, e.g. the service area. */
  tagline?: string;
  /** Link columns for this product (site sections, product pages). */
  columns: readonly SiteFooterColumn[];
  /** Links between the Managevent sites (www <-> invitation). Rendered as the last link column. */
  crossLinks?: SiteFooterColumn;
  /** How to reach the team. Omitted values are not rendered. */
  contact?: SiteFooterContact;
  /** Accessible name of the legal links list, e.g. "Legal". */
  legalLabel: string;
  /** Privacy, terms, accessibility. Use absolute www URLs so every product shares one set. */
  legalLinks: readonly BrandLink[];
  /** The Acknowledgement of Country (`legal.acknowledgementOfCountry`). */
  acknowledgement: string;
  /** "A product by Appilico" (`common.byAppilico`). */
  byline: string;
  /** Optional link for the byline. */
  bylineHref?: string;
  /** Optional copyright line. */
  copyright?: string;
  /** `light` (default) is the raised ivory footer, `dark` the burgundy one. */
  tone?: "light" | "dark";
  className?: string;
}

/**
 * The shared site footer: logo, contact, link columns, sibling-site links, the
 * Acknowledgement of Country, legal links and the Appilico byline. Server-compatible.
 */
export function SiteFooter({
  product,
  productLabel,
  homeHref,
  tagline,
  columns,
  crossLinks,
  contact,
  legalLabel,
  legalLinks,
  acknowledgement,
  byline,
  bylineHref,
  copyright,
  tone = "light",
  className,
}: SiteFooterProps) {
  const allColumns = crossLinks ? [...columns, crossLinks] : [...columns];
  const hasContact = Boolean(contact && (contact.email || contact.phone));
  const columnCount = allColumns.length + (hasContact ? 1 : 0);

  return (
    <footer
      className={cx("footer-shell", tone === "dark" && "surface-dark", className)}
      data-product={product}
    >
      <div className="wrap footer" style={{ "--footer-cols": columnCount } as CSSProperties}>
        <div className="footer-brand">
          <a className="site-brand" href={homeHref}>
            <BrandLogo
              size="sm"
              tone={tone === "dark" ? "onDark" : "onLight"}
              descriptor={productLabel}
            />
          </a>
          {tagline && <p className="footer-tagline">{tagline}</p>}
        </div>
        {allColumns.map((column) => (
          <nav key={column.title} className="footer-col" aria-label={column.title}>
            <p className="footer-heading">{column.title}</p>
            <ul className="footer-links">
              {column.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a {...linkProps(link)}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        {hasContact && contact && (
          <div className="footer-col">
            <p className="footer-heading">{contact.title}</p>
            <div className="footer-contacts">
              {contact.email && (
                <a href={`mailto:${contact.email}`}>
                  <bdi>
                    {/* A break opportunity before the "@", so a long address wraps cleanly. */}
                    {contact.email
                      .split("@")
                      .map((part, index) =>
                        index === 0 ? part : [<wbr key={index} />, `@${part}`],
                      )}
                  </bdi>
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`}>
                  <bdi>{contact.phone}</bdi>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="wrap">
        <div className="footer-base">
          <p className="footer-ack">{acknowledgement}</p>
          <div className="footer-meta">
            <p className="footer-byline">
              {copyright ? `${copyright} · ` : null}
              {bylineHref ? (
                <a href={bylineHref} rel="noopener">
                  {byline}
                </a>
              ) : (
                byline
              )}
            </p>
            <ul className="footer-legal" aria-label={legalLabel}>
              {legalLinks.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a {...linkProps(link)}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
