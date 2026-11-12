import { getSitePages, t } from "@managevent/i18n";
import { ButtonLink, PageHero } from "@managevent/ui/brand";
import { ArchCard } from "../../components/page-kit";
import { localePath, routes } from "../../lib/site";

/**
 * The branded 404 page. It renders inside the locale layout, so the header and footer stay.
 * The `<title>` is rendered here because a not-found page takes no metadata from the route
 * that threw; React hoists it into the document head.
 */
export default function NotFound() {
  const locale = "en";
  const site = getSitePages(locale);
  const copy = site.notFound;
  const href = (path: string) => localePath(locale, path);
  const links = [
    { label: site.nav.ceremonies, href: href(routes.ceremonies) },
    { label: site.nav.services, href: href(routes.services) },
    { label: site.nav.invitations, href: href(routes.invitations) },
    { label: site.nav.pricing, href: href(routes.pricing) },
    { label: site.nav.faq, href: href(routes.faq) },
  ];

  return (
    <main id="main">
      <title>{`${copy.metaTitle} | Managevent Perth`}</title>
      <meta name="description" content={copy.body} />
      <PageHero
        className="sp-not-found"
        eyebrow={copy.eyebrow}
        title={t(locale, "marketing.launchNotFound")}
        lead={copy.body}
        actions={
          <>
            <ButtonLink label={copy.home} href={href(routes.home)} />
            <ButtonLink
              variant="secondary"
              label={site.shared.talkToUs}
              href={href(routes.contact)}
            />
          </>
        }
        aside={
          <nav aria-label={copy.linksLabel}>
            <ArchCard
              title={copy.linksLabel}
              lines={links.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            />
          </nav>
        }
      />
    </main>
  );
}
