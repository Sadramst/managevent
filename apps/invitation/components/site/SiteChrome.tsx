import type { ReactNode } from "react";
import { getInvitationShell, t } from "@managevent/i18n";
import { SiteFooter, SiteHeader } from "@managevent/ui/brand";
import { routes, wwwLinks } from "@/lib/urls";
import { CurrentNav } from "./CurrentNav";

export interface SiteChromeProps {
  /** Whether a host is signed in (from `getMeOptional()`). Changes the header actions only. */
  signedIn: boolean;
  /** The page. Each page renders its own `<main id="main">`. */
  children: ReactNode;
}

/**
 * The public chrome of invitation.managevent.com.au: the same header and footer as
 * www.managevent.com.au (`@managevent/ui/brand`), with this product's navigation.
 *
 * Used by the `(site)` route group: home, templates, pricing, unsubscribe and the sign-in
 * pages. The Host Studio has its own chrome (`StudioShell`) and guest pages have none.
 */
export function SiteChrome({ signedIn, children }: SiteChromeProps) {
  const copy = getInvitationShell("en");
  const productLabel = t("en", "marketing.launchProductInvitations");

  const templates = { label: copy.header.templates, href: routes.templates };
  const pricing = { label: copy.header.pricing, href: routes.pricing };
  const howItWorks = { label: copy.header.howItWorks, href: wwwLinks.invitations, external: true };
  const contactUs = { label: copy.footer.contactUs, href: wwwLinks.contact, external: true };

  return (
    <>
      <a className="skip" href="#main">
        {t("en", "marketing.launchSkip")}
      </a>
      <SiteHeader
        product="invitations"
        productLabel={productLabel}
        homeHref={routes.home}
        navLabel={t("en", "marketing.launchNavLabel")}
        menuLabel={t("en", "marketing.launchMenu")}
        navItems={[templates, pricing, howItWorks]}
        crossLink={{ label: copy.header.eventsSite, href: wwwLinks.home }}
        // A signed-out visitor starts by creating an account; `next` brings them to the wizard.
        cta={{
          label: copy.header.create,
          href: signedIn
            ? routes.studioNew
            : `${routes.signUp}?next=${encodeURIComponent(routes.studioNew)}`,
        }}
        secondaryCta={
          signedIn
            ? { label: copy.header.myEvents, href: routes.studio }
            : { label: copy.header.signIn, href: routes.signIn }
        }
      />
      <CurrentNav />
      {children}
      <SiteFooter
        product="invitations"
        productLabel={productLabel}
        homeHref={routes.home}
        tagline={copy.footer.tagline}
        columns={[
          {
            title: copy.footer.productTitle,
            links: [{ label: copy.footer.home, href: routes.home }, templates, pricing, howItWorks],
          },
          {
            title: copy.footer.helpTitle,
            links: [
              contactUs,
              signedIn
                ? { label: copy.header.myEvents, href: routes.studio }
                : { label: copy.header.signIn, href: routes.signIn },
            ],
          },
        ]}
        crossLinks={{
          title: copy.footer.eventsTitle,
          links: [
            { label: copy.footer.eventsHome, href: wwwLinks.home, external: true },
            { label: copy.footer.eventsInvitations, href: wwwLinks.invitations, external: true },
          ],
        }}
        legalLabel={t("en", "marketing.launchFooterLegal")}
        legalLinks={[
          { label: t("en", "marketing.launchPrivacy"), href: wwwLinks.privacy, external: true },
          { label: t("en", "marketing.launchTerms"), href: wwwLinks.terms, external: true },
          {
            label: t("en", "marketing.launchAccessibility"),
            href: wwwLinks.accessibility,
            external: true,
          },
        ]}
        acknowledgement={t("en", "legal.acknowledgementOfCountry")}
        byline={t("en", "common.byAppilico")}
        bylineHref="https://www.appilico.com.au/"
      />
    </>
  );
}
