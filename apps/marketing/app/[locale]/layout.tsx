import type { ReactNode, CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getDir, t } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
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
  if (locale !== "en" && locale !== "fa") notFound();
  return (
    <html lang={locale} dir={getDir(locale)}>
      <body style={getCssVariablesForMode("CELEBRATION") as CSSProperties}>
        <a className="skip" href="#main">
          {t(locale, "marketing.launchSkip")}
        </a>
        <header className="site-header wrap">
          <a className="wordmark" href={localePath(locale)}>
            Managevent<span>{t(locale, "common.byAppilico")}</span>
          </a>
          <nav aria-label={t(locale, "marketing.launchHome")}>
            <a href={localePath(locale, "#enquiry")}>{t(locale, "common.talkToUs")}</a>
            <a href={locale === "fa" ? "/" : "/fa"} lang={locale === "fa" ? "en" : "fa"}>
              {locale === "fa" ? "English" : "فارسی"}
            </a>
          </nav>
        </header>
        {children}
        <footer className="wrap footer">
          <div>
            <strong>Managevent</strong>
            <p>{t(locale, "common.byAppilico")}</p>
            <p>{t(locale, "marketing.launchLocation")}</p>
            <a href={`mailto:${contact.email}`}>
              <bdi>{contact.email}</bdi>
            </a>
            {contact.phone && (
              <a href={`tel:${contact.phone}`}>
                <bdi>{contact.phone}</bdi>
              </a>
            )}
          </div>
          <nav aria-label={t(locale, "marketing.launchTerms")}>
            <a href={localePath(locale, "/privacy")}>{t(locale, "marketing.launchPrivacy")}</a>
            <a href={localePath(locale, "/terms")}>{t(locale, "marketing.launchTerms")}</a>
            <a href={localePath(locale, "/accessibility")}>
              {t(locale, "marketing.launchAccessibility")}
            </a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
