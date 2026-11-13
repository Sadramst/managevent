import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getDir, getSitePages, t } from "@managevent/i18n";
import { SiteFooter, SiteHeader } from "@managevent/ui/brand";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { Metadata } from "next";
import { CurrentNav } from "../../components/current-nav";
import { getContact } from "../../lib/contact";
import { invitationLinks, localePath, routes, siteUrl } from "../../lib/site";
import "../globals.css";
import "../site-pages.css";

/** Resolves relative Open Graph and canonical URLs for every page under this layout. */
export const metadata: Metadata = { metadataBase: new URL(siteUrl) };

/**
 * Memorial Mode for the whole page. A page opts in by rendering its `<main>` in Memorial Mode
 * (through `getExperienceMode()`, see `ModeMain`); this rule then gives the header and footer
 * the same palette, so no celebration colour frames a memorial page. The values come from the
 * shared tokens, and the layout stays static because the rule is plain CSS. Celebration is the
 * `:root` default in the token stylesheet.
 */
const memorialPageCss = `body:has(> main[data-experience-mode="memorial"]){${Object.entries(
  getCssVariablesForMode("MEMORIAL"),
)
  .map(([name, value]) => `${name}:${value}`)
  .join(";")}}`;

/**
 * Pages are prerendered and refreshed at most every minute, so the contact details staff edit in
 * the console reach every page without a redeploy (`lib/contact.ts`). This must stay a literal:
 * Next reads it at build time. Keep it equal to `CONTACT_REVALIDATE_SECONDS`.
 */
export const revalidate = 60;

/** English is the only enabled locale, so every page under it can be prerendered. */
export function generateStaticParams() {
  return [{ locale: "en" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const contact = await getContact();
  const { locale } = await params;
  if (locale !== "en") notFound();

  const nav = getSitePages(locale).nav;
  const link = (label: string, path: string) => ({ label, href: localePath(locale, path) });
  const home = localePath(locale);

  const ceremonies = link(nav.ceremonies, routes.ceremonies);
  const services = link(nav.services, routes.services);
  const invitations = link(nav.invitations, routes.invitations);
  const pricing = link(nav.pricing, routes.pricing);
  const about = link(nav.about, routes.about);
  const talkToUs = link(t(locale, "common.talkToUs"), routes.contact);

  return (
    <html lang={locale === "en" ? "en-AU" : locale} dir={getDir(locale)}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: memorialPageCss }} />
      </head>
      <body>
        <a className="skip" href="#main">
          {t(locale, "marketing.launchSkip")}
        </a>
        <SiteHeader
          product="events"
          productLabel={t(locale, "marketing.launchProductEvents")}
          homeHref={home}
          navLabel={t(locale, "marketing.launchNavLabel")}
          menuLabel={t(locale, "marketing.launchMenu")}
          navItems={[ceremonies, services, invitations, pricing, about]}
          cta={talkToUs}
        />
        <CurrentNav />
        {children}
        <SiteFooter
          product="events"
          productLabel={t(locale, "marketing.launchProductEvents")}
          homeHref={home}
          tagline={nav.footerTagline}
          columns={[
            {
              title: nav.footerPlan,
              links: [
                ceremonies,
                services,
                link(nav.venues, routes.venues),
                link(nav.memorials, routes.memorials),
                link(nav.howItWorks, routes.howItWorks),
                pricing,
              ],
            },
            {
              title: nav.footerCompany,
              links: [
                about,
                invitations,
                link(nav.faq, routes.faq),
                link(nav.contact, routes.contact),
              ],
            },
          ]}
          crossLinks={{
            title: t(locale, "marketing.launchInvitationsNav"),
            links: [
              { label: nav.invitationSite, href: invitationLinks.home, external: true },
              { label: nav.invitationTemplates, href: invitationLinks.templates, external: true },
            ],
          }}
          contact={{
            title: t(locale, "marketing.launchFooterContact"),
            email: contact.email,
            phone: contact.phone,
          }}
          legalLabel={t(locale, "marketing.launchFooterLegal")}
          legalLinks={[
            link(t(locale, "marketing.launchPrivacy"), routes.privacy),
            link(t(locale, "marketing.launchTerms"), routes.terms),
            link(t(locale, "marketing.launchAccessibility"), routes.accessibility),
          ]}
          acknowledgement={t(locale, "legal.acknowledgementOfCountry")}
          byline={t(locale, "common.byAppilico")}
          bylineHref="https://www.appilico.com.au/"
        />
      </body>
    </html>
  );
}
