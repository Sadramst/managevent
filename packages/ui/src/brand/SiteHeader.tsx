import React from "react";
import { BrandLogo } from "./BrandLogo.js";
import { type BrandLink, type BrandProduct, cx, linkProps } from "./shared.js";
import { SiteMenu } from "./SiteMenu.js";

export interface SiteHeaderCrossLink extends BrandLink {
  /** Zero-based position among `navItems`. Defaults to the end. */
  index?: number;
}

export interface SiteHeaderProps {
  /** Which product this header belongs to. Exposed as `data-product` for styling and tests. */
  product: BrandProduct;
  /** Short product name shown under the wordmark, e.g. "Events" or "Invitations". */
  productLabel: string;
  /** Where the logo links to (the product's home). The link is named by the visible wordmark. */
  homeHref: string;
  /** Accessible name of the navigation landmark, e.g. "Main". */
  navLabel: string;
  /** Primary navigation links, in order. */
  navItems: readonly BrandLink[];
  /** Link to the sibling site (www <-> invitation). Rendered inside the navigation. */
  crossLink?: SiteHeaderCrossLink;
  /** The one primary action, e.g. "Talk to us". */
  cta: BrandLink;
  /** An optional quieter action beside the primary one, e.g. "Sign in". */
  secondaryCta?: BrandLink;
  /** Visible label of the small-screen menu toggle, e.g. "Menu". */
  menuLabel: string;
  className?: string;
}

/**
 * The shared site header: logo, primary navigation, sibling-site link and call to action.
 *
 * Server-compatible. Below 900px the navigation collapses into a `<details>` menu that works
 * without JavaScript (`SiteMenu` only adds close-on-navigate once hydrated).
 */
export function SiteHeader({
  product,
  productLabel,
  homeHref,
  navLabel,
  navItems,
  crossLink,
  cta,
  secondaryCta,
  menuLabel,
  className,
}: SiteHeaderProps) {
  const links: BrandLink[] = [...navItems];
  if (crossLink) {
    const { index, ...link } = crossLink;
    const position = Math.min(Math.max(index ?? links.length, 0), links.length);
    links.splice(position, 0, { ...link, external: link.external ?? true });
  }

  return (
    <header className={cx("site-header-bar", className)} data-product={product}>
      <div className="wrap site-header">
        <a className="site-brand" href={homeHref}>
          <BrandLogo descriptor={productLabel} />
        </a>
        <nav className="site-nav" aria-label={navLabel}>
          {links.map((link) => (
            <a key={`${link.href}-${link.label}`} className="site-nav-link" {...linkProps(link)}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="site-header-actions">
          {secondaryCta && (
            <a className="button button-ghost" {...linkProps(secondaryCta)}>
              {secondaryCta.label}
            </a>
          )}
          <a className="button" {...linkProps(cta)}>
            {cta.label}
          </a>
        </div>
        <SiteMenu label={menuLabel}>
          <nav aria-label={navLabel}>
            <ul className="site-menu-list">
              {links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a className="site-menu-link" {...linkProps(link)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="site-menu-actions">
            <a className="button button-block" {...linkProps(cta)}>
              {cta.label}
            </a>
            {secondaryCta && (
              <a className="button button-secondary button-block" {...linkProps(secondaryCta)}>
                {secondaryCta.label}
              </a>
            )}
          </div>
        </SiteMenu>
      </div>
    </header>
  );
}
