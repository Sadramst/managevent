import type { ReactNode, CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDir, t } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import { BrandLogo } from "../../components/BrandLogo";
import { DynamicContactEmail, DynamicContactPhone } from "../../components/dynamic-contact";
import { loadPerthCity } from "../../lib/content";
import {
  buildLocalBusinessJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "../../lib/seo-schema";
import { contact, localePath, siteUrl } from "../../lib/site";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const perthCity = loadPerthCity();
  const orgJsonLd = buildOrganizationJsonLd();
  const localBusinessJsonLd = buildLocalBusinessJsonLd(perthCity.areasServed);
  const webSiteJsonLd = buildWebSiteJsonLd();

  return (
    <html lang="en-AU" dir={getDir(locale)}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([orgJsonLd, localBusinessJsonLd, webSiteJsonLd]),
          }}
        />
      </head>
      <body style={getCssVariablesForMode("CELEBRATION") as CSSProperties}>
        <a className="skip" href="#main">
          {t(locale, "marketing.launchSkip")}
        </a>
        <header className="site-header-bar">
          <div className="site-header wrap">
            <a className="wordmark inline-flex items-center gap-3" href={localePath(locale)}>
              <BrandLogo variant="compact" size="md" subtitle="Perth WA" theme="gold" />
            </a>
            <nav aria-label={t(locale, "marketing.launchHome")}>
              <a href={localePath(locale, "/ceremonies")}>
                {t(locale, "marketing.launchCeremoniesNav")}
              </a>
              <a href={localePath(locale, "/packages")}>
                {t(locale, "marketing.launchPackagesNav")}
              </a>
              <a href={localePath(locale, "/venues")}>{t(locale, "marketing.launchVenuesNav")}</a>
              <a href={localePath(locale, "/services")}>
                {t(locale, "marketing.launchServicesNav")}
              </a>
              <a href={localePath(locale, "/invitations")}>
                {t(locale, "marketing.launchInvitationsNav")}
              </a>
              <a href={localePath(locale, "/memorials")}>
                {t(locale, "marketing.launchMemorialsNav")}
              </a>
              <a href={localePath(locale, "/perth")}>{t(locale, "marketing.launchPerthHubNav")}</a>
              <a href={localePath(locale, "/admin")} className="nav-pill">
                {t(locale, "marketing.launchAdminNav")}
              </a>
              <a href={localePath(locale, "/#enquiry")} className="nav-cta">
                {t(locale, "common.talkToUs")}
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="footer-shell">
          <div className="wrap footer-columns">
            <div className="footer-brand">
              <div className="mb-3">
                <BrandLogo variant="compact" size="sm" subtitle="Perth WA" theme="dark" />
              </div>
              <p>{t(locale, "common.byAppilico")}</p>
              <p>{t(locale, "marketing.launchLocation")}</p>
              <p className="footer-ack">{t(locale, "legal.acknowledgementOfCountry")}</p>
              <div className="footer-contacts">
                <DynamicContactEmail fallback={contact.email} asLink />
                <DynamicContactPhone fallback={contact.phone} asLink />
              </div>
            </div>

            <div className="footer-col">
              <strong>Perth Ceremonies</strong>
              <nav aria-label="Perth Ceremonies" className="footer-links-list">
                <a href={localePath(locale, "/perth/weddings")}>Perth Weddings</a>
                <a href={localePath(locale, "/perth/engagement-parties")}>Engagement Parties</a>
                <a href={localePath(locale, "/perth/birthday-party-packages")}>
                  Milestone Birthdays
                </a>
                <a href={localePath(locale, "/perth/kids-party-packages")}>Kids&apos; Parties</a>
                <a href={localePath(locale, "/perth/corporate-events")}>Corporate Galas & Events</a>
                <a href={localePath(locale, "/perth/cultural-weddings")}>Cultural Ceremonies</a>
                <a href={localePath(locale, "/perth/community-hall-events")}>Council Hall Events</a>
                <a href={localePath(locale, "/perth/celebration-of-life")}>Celebrations of Life</a>
                <a href={localePath(locale, "/perth/wake-catering")}>Wake Catering Perth</a>
              </nav>
            </div>

            <div className="footer-col">
              <strong>Platform & Guides</strong>
              <nav aria-label="Platform and Guides" className="footer-links-list">
                <a href={localePath(locale, "/ceremonies")}>All Ceremonies (0 to 100)</a>
                <a href={localePath(locale, "/packages")}>Packages Catalogue</a>
                <a href={localePath(locale, "/venues")}>Perth Venues Guide</a>
                <a href={localePath(locale, "/services")}>Full-Stack Services</a>
                <a href={localePath(locale, "/invitations")}>Digital Invitations & RSVP</a>
                <a href={localePath(locale, "/memorials")}>Memorial Mode Hub</a>
                <a href={localePath(locale, "/how-it-works")}>How 0-to-100 Works</a>
                <a href={localePath(locale, "/pricing")}>Pricing & GST Guide</a>
                <a href={localePath(locale, "/faq")}>Perth Event FAQ</a>
              </nav>
            </div>

            <div className="footer-col">
              <strong>Company & Compliance</strong>
              <nav aria-label={t(locale, "marketing.launchTerms")} className="footer-links-list">
                <a href={localePath(locale, "/perth")}>Perth Local Hub</a>
                <a href={localePath(locale, "/about")}>About Managevent</a>
                <a href={localePath(locale, "/contact")}>Contact & Consultations</a>
                <a href={localePath(locale, "/admin")}>{t(locale, "marketing.launchAdminNav")}</a>
                <a href={localePath(locale, "/privacy")}>{t(locale, "marketing.launchPrivacy")}</a>
                <a href={localePath(locale, "/terms")}>{t(locale, "marketing.launchTerms")}</a>
                <a href={localePath(locale, "/accessibility")}>
                  {t(locale, "marketing.launchAccessibility")}
                </a>
              </nav>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
