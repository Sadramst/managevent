import type { ReactNode, CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getDir, t } from "@managevent/i18n";
import { SiteFooter, SiteHeader } from "@managevent/ui/brand";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import { contact, invitationUrl, localePath } from "../../lib/site";
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

  const home = localePath(locale);
  const services = {
    label: t(locale, "marketing.launchServicesNav"),
    href: localePath(locale, "/#services"),
  };
  const estimator = {
    label: t(locale, "marketing.launchEstimatorNav"),
    href: localePath(locale, "/#estimator"),
  };
  const enquiry = { label: t(locale, "common.talkToUs"), href: localePath(locale, "/#enquiry") };

  return (
    <html lang={locale} dir={getDir(locale)}>
      <body style={getCssVariablesForMode("CELEBRATION") as CSSProperties}>
        <a className="skip" href="#main">
          {t(locale, "marketing.launchSkip")}
        </a>
        <SiteHeader
          product="events"
          productLabel={t(locale, "marketing.launchProductEvents")}
          homeHref={home}
          navLabel={t(locale, "marketing.launchNavLabel")}
          menuLabel={t(locale, "marketing.launchMenu")}
          navItems={[
            services,
            estimator,
            {
              label: t(locale, "marketing.launchVenuesNavShort"),
              href: localePath(locale, "/#venues"),
            },
          ]}
          crossLink={{
            label: t(locale, "marketing.launchInvitationsNavShort"),
            href: invitationUrl,
            index: 1,
          }}
          cta={enquiry}
        />
        {children}
        <SiteFooter
          product="events"
          productLabel={t(locale, "marketing.launchProductEvents")}
          homeHref={home}
          tagline={t(locale, "marketing.launchLocation")}
          columns={[
            {
              title: t(locale, "marketing.launchFooterExplore"),
              links: [
                {
                  label: t(locale, "marketing.launchOccasionsNav"),
                  href: localePath(locale, "/#occasions"),
                },
                services,
                estimator,
                {
                  label: t(locale, "marketing.launchVenuesNav"),
                  href: localePath(locale, "/#venues"),
                },
                enquiry,
              ],
            },
          ]}
          crossLinks={{
            title: t(locale, "marketing.launchFooterSites"),
            links: [
              { label: t(locale, "marketing.launchFooterEventsSite"), href: home },
              {
                label: t(locale, "marketing.launchFooterInvitationsSite"),
                href: invitationUrl,
                external: true,
              },
            ],
          }}
          contact={{
            title: t(locale, "marketing.launchFooterContact"),
            email: contact.email,
            phone: contact.phone,
          }}
          legalLabel={t(locale, "marketing.launchFooterLegal")}
          legalLinks={[
            { label: t(locale, "marketing.launchPrivacy"), href: localePath(locale, "/privacy") },
            { label: t(locale, "marketing.launchTerms"), href: localePath(locale, "/terms") },
            {
              label: t(locale, "marketing.launchAccessibility"),
              href: localePath(locale, "/accessibility"),
            },
          ]}
          acknowledgement={t(locale, "legal.acknowledgementOfCountry")}
          byline={t(locale, "common.byAppilico")}
        />
      </body>
    </html>
  );
}
