import type { ReactNode, CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getDir, t } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import { BrandLogo } from "../../components/BrandLogo";
import { contact, localePath } from "../../lib/site";
import "../globals.css";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return (
    <html lang={locale} dir={getDir(locale)}>
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
              <a href={localePath(locale, "#services")}>
                {t(locale, "marketing.launchServicesNav")}
              </a>
              <a href={localePath(locale, "#estimator")}>
                {t(locale, "marketing.launchEstimatorNav")}
              </a>
              <a href={localePath(locale, "#venues")}>{t(locale, "marketing.launchVenuesNav")}</a>
              <a href={localePath(locale, "/admin")} className="nav-pill">
                {t(locale, "marketing.launchAdminNav")}
              </a>
              <a href={localePath(locale, "#enquiry")} className="nav-cta">
                {t(locale, "common.talkToUs")}
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="footer-shell">
          <div className="wrap footer">
            <div className="footer-brand">
              <div className="mb-3">
                <BrandLogo variant="compact" size="sm" subtitle="Perth WA" theme="gold" />
              </div>
              <p>{t(locale, "common.byAppilico")}</p>
              <p>{t(locale, "marketing.launchLocation")}</p>
              <p className="footer-ack">{t(locale, "legal.acknowledgementOfCountry")}</p>
              <div className="footer-contacts">
                <a href={`mailto:${contact.email}`}>
                  <bdi>{contact.email}</bdi>
                </a>
                {contact.phone && (
                  <a href={`tel:${contact.phone}`}>
                    <bdi>{contact.phone}</bdi>
                  </a>
                )}
              </div>
            </div>
            <nav aria-label={t(locale, "marketing.launchTerms")} className="footer-nav">
              <a href={localePath(locale, "#services")}>
                {t(locale, "marketing.launchServicesNav")}
              </a>
              <a href={localePath(locale, "#estimator")}>
                {t(locale, "marketing.launchEstimatorNav")}
              </a>
              <a href={localePath(locale, "/admin")}>{t(locale, "marketing.launchAdminNav")}</a>
              <a href={localePath(locale, "/privacy")}>{t(locale, "marketing.launchPrivacy")}</a>
              <a href={localePath(locale, "/terms")}>{t(locale, "marketing.launchTerms")}</a>
              <a href={localePath(locale, "/accessibility")}>
                {t(locale, "marketing.launchAccessibility")}
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
