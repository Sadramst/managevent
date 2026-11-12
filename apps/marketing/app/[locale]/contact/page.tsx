import { notFound } from "next/navigation";
import { getExperienceMode, getSitePages, t } from "@managevent/i18n";
import { ButtonLink, Card, PageHero } from "@managevent/ui/brand";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { EnquiryForm } from "../../../components/enquiry-form";
import { Breadcrumbs, JsonLd } from "../../../components/page-kit";
import { loadCeremonies, loadPerthVenues } from "../../../lib/content";
import { contact, invitationLinks, localePath, pageMetadata, routes } from "../../../lib/site";
import { organizationJsonLd } from "../../../lib/structured-data";

export async function generateMetadata() {
  const copy = getSitePages("en").contact;
  return pageMetadata("en", copy.metaTitle, routes.contact, { description: copy.metaDescription });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const site = getSitePages(locale);
  const copy = site.contact;
  const shared = site.shared;
  // Every ceremony and setting page links here with ?ceremony= or ?venue=, so the form
  // knows all of them.
  const ceremonyOptions = loadCeremonies().map((ceremony) => ({
    slug: ceremony.slug,
    label: ceremony.name.en,
  }));
  const settings = loadPerthVenues().map((venue) => ({
    slug: venue.slug,
    name: { en: venue.name.en },
  }));
  const memorialMode = getExperienceMode(routes.memorials);

  return (
    <main id="main">
      <Breadcrumbs locale={locale} trail={[{ name: site.nav.contact, path: routes.contact }]} />
      <JsonLd data={organizationJsonLd(site.home.metaDescription)} />
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
        actions={
          <>
            <ButtonLink label={shared.sendEnquiry} href="#enquiry" />
            {contact.phone ? (
              <a className="button button-secondary" href={`tel:${contact.phone}`}>
                {t(locale, "marketing.launchContactPhoneLabel")} <bdi>{contact.phone}</bdi>
              </a>
            ) : null}
          </>
        }
      />

      <section id="enquiry" className="wrap section enquiry">
        <div className="sp-aside-stack">
          <Card>
            <h2 className="card-title">{copy.detailsTitle}</h2>
            <dl className="sp-contact-list">
              <div>
                <dt>{t(locale, "marketing.launchContactEmailLabel")}</dt>
                <dd>
                  <a href={`mailto:${contact.email}`}>
                    <bdi>{contact.email}</bdi>
                  </a>
                </dd>
              </div>
              {contact.phone ? (
                <div>
                  <dt>{t(locale, "marketing.launchContactPhoneLabel")}</dt>
                  <dd>
                    <a href={`tel:${contact.phone}`}>
                      <bdi>{contact.phone}</bdi>
                    </a>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>{copy.areaLabel}</dt>
                <dd>{copy.areaValue}</dd>
              </div>
              <div>
                <dt>{copy.serviceAreaLabel}</dt>
                <dd>{copy.serviceAreaValue}</dd>
              </div>
            </dl>
          </Card>

          <Card variant="rule">
            <h2 className="card-title">{copy.nextTitle}</h2>
            <ol className="prose">
              {copy.next.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <a className="sp-more" href={localePath(locale, routes.howItWorks)}>
              {shared.seeHowItWorks}
            </a>
          </Card>

          <Card
            className="sp-memorial"
            data-experience-mode={memorialMode.toLowerCase()}
            style={getCssVariablesForMode(memorialMode) as CSSProperties}
          >
            <h2 className="card-title">{copy.memorialTitle}</h2>
            <p className="card-body">{copy.memorialBody}</p>
            <a className="sp-more" href={localePath(locale, routes.memorials)}>
              {site.nav.memorials}
            </a>
          </Card>

          <Card variant="quiet">
            <h2 className="card-title">{copy.invitationTitle}</h2>
            <p className="card-body">{copy.invitationBody}</p>
            <a className="sp-more" href={invitationLinks.templates} rel="noopener">
              {shared.createInvitation}
            </a>
          </Card>
        </div>

        <div className="enquiry-form-card">
          <p className="kicker">{copy.formEyebrow}</p>
          <h2>{t(locale, "marketing.launchFormTitle")}</h2>
          <p>{t(locale, "marketing.launchFormIntro")}</p>
          <EnquiryForm locale={locale} ceremonies={ceremonyOptions} venues={settings} />
        </div>
      </section>
    </main>
  );
}
