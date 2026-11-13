import Image from "next/image";
import { notFound } from "next/navigation";
import { fillCopy, getExperienceMode, getSitePages, t } from "@managevent/i18n";
import { ButtonLink, Card, Section, SectionHead } from "@managevent/ui/brand";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { EnquiryForm } from "../../components/enquiry-form";
import { EventEstimator } from "../../components/event-estimator";
import { JsonLd } from "../../components/page-kit";
import { loadCeremonies, loadPerthVenues } from "../../lib/content";
import { planCopyParams } from "../../lib/plans";
import { perthSettings } from "../../lib/settings";
import { getContact } from "../../lib/contact";
import { invitationLinks, localePath, pageMetadata, routes } from "../../lib/site";
import { organizationJsonLd } from "../../lib/structured-data";

export async function generateMetadata() {
  const copy = getSitePages("en").home;
  return pageMetadata("en", copy.metaTitle, "", {
    description: copy.metaDescription,
    absoluteTitle: true,
  });
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const contact = await getContact();
  const { locale } = await params;
  if (locale !== "en") notFound();
  // Validates the ceremony catalogue at build time; a broken content file fails the build.
  const ceremonies = loadCeremonies();

  const site = getSitePages(locale);
  const copy = site.home;
  const shared = site.shared;
  const plan = planCopyParams();
  const settings = perthSettings(locale, loadPerthVenues()).slice(0, 6);
  const ceremonyOptions = ceremonies.map((ceremony) => ({
    slug: ceremony.slug,
    label: ceremony.name.en,
  }));
  const href = (path: string) => localePath(locale, path);

  return (
    <main id="main">
      <JsonLd data={organizationJsonLd(copy.metaDescription, contact)} />

      <section className="hero">
        <Image
          src="/hero.webp"
          alt={t(locale, "marketing.launchImageAlt")}
          fill
          preload
          fetchPriority="high"
          sizes="100vw"
        />
        <div className="hero-shade" />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="hero-badge">{copy.heroBadge}</p>
            <h1>{t(locale, "marketing.launchTitle")}</h1>
            <p className="hero-lead">{copy.heroLead}</p>
            <div className="hero-actions">
              <a className="button hero-button" href="#enquiry">
                {copy.heroPrimary}
              </a>
              <a className="button hero-button-outline" href={href(routes.howItWorks)}>
                {copy.heroSecondary}
              </a>
            </div>
          </div>

          <div className="hero-arch-card">
            <div className="hero-arch-inner">
              <p className="hero-arch-kicker">{copy.heroCardTitle}</p>
              <ul className="sp-hero-list">
                {copy.heroCardItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Section id="occasions">
        <div className="sp-head-row">
          <SectionHead
            eyebrow={copy.occasionsEyebrow}
            title={copy.occasionsTitle}
            lead={copy.occasionsLead}
          />
          <a className="sp-more" href={href(routes.ceremonies)}>
            {copy.occasionsLink}
          </a>
        </div>
        <div className="grid grid-4">
          {copy.families.map((family) => {
            const mode = getExperienceMode(family.href);
            const memorial = mode === "MEMORIAL";
            return (
              <Card
                key={family.key}
                as="article"
                variant="accent"
                className="sp-card sp-occasion"
                data-experience-mode={mode.toLowerCase()}
                style={memorial ? (getCssVariablesForMode("MEMORIAL") as CSSProperties) : undefined}
              >
                <h3 className="card-title">{family.title}</h3>
                <p className="card-body">{family.body}</p>
                <a className="sp-more" href={href(family.href)}>
                  {family.link}
                </a>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section band id="services">
        <div className="sp-head-row">
          <SectionHead
            eyebrow={copy.servicesEyebrow}
            title={copy.servicesTitle}
            lead={copy.servicesLead}
          />
          <a className="sp-more" href={href(routes.services)}>
            {copy.servicesLink}
          </a>
        </div>
        <div className="grid grid-3">
          {site.services.items.map((service, index) => (
            <Card key={service.id} as="article" variant="quiet" className="sp-card">
              <span className="sp-num" aria-hidden="true" dir="ltr">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="card-title">
                <a href={href(`${routes.services}#${service.id}`)}>{service.title}</a>
              </h3>
              <p className="card-body">{service.summary}</p>
            </Card>
          ))}
        </div>
      </Section>

      <section id="invitations" className="surface-dark sp-dark">
        <div className="wrap section sp-dark-grid">
          <div>
            <SectionHead
              eyebrow={copy.invitationsEyebrow}
              title={copy.invitationsTitle}
              lead={fillCopy(copy.invitationsLead, plan)}
            />
            <div className="page-hero-actions">
              <ButtonLink
                variant="inverse"
                label={shared.createInvitation}
                href={invitationLinks.templates}
                external
              />
              <ButtonLink
                variant="outline-inverse"
                label={shared.seeInvitations}
                href={href(routes.invitations)}
              />
            </div>
          </div>
          <div>
            <ol className="sp-steps">
              {copy.invitationsPoints.map((point) => (
                <li key={point.title}>
                  <h3>{point.title}</h3>
                  <p>{point.body}</p>
                </li>
              ))}
            </ol>
            <p className="sp-dark-note">{fillCopy(copy.invitationsNote, plan)}</p>
          </div>
        </div>
      </section>

      <Section id="estimator">
        <div className="sp-head-row">
          <SectionHead
            eyebrow={copy.estimatorEyebrow}
            title={copy.estimatorTitle}
            lead={copy.estimatorLead}
          />
          <a className="sp-more" href={href(routes.pricing)}>
            {copy.estimatorLink}
          </a>
        </div>
        <EventEstimator
          locale={locale}
          labels={{
            badge: copy.estimatorBadge,
            memorialBadge: copy.estimatorMemorialBadge,
            guestsUnit: copy.estimatorGuestsUnit,
            logisticsTitle: copy.estimatorLogisticsTitle,
            disclaimer: copy.estimatorDisclaimer,
          }}
        />
      </Section>

      <Section band id="venues">
        <div className="sp-head-row">
          <SectionHead
            eyebrow={copy.settingsEyebrow}
            title={copy.settingsTitle}
            lead={copy.settingsLead}
          />
          <a className="sp-more" href={href(routes.venues)}>
            {copy.settingsLink}
          </a>
        </div>
        <div className="grid grid-3">
          {settings.map((setting) => (
            <Card key={setting.slug} as="article" variant="quiet" className="sp-card">
              <p className="sp-card-meta">
                <span>{setting.area}</span>
                <span>{setting.kind}</span>
              </p>
              <h3 className="card-title">{setting.name}</h3>
              <p className="card-body">{setting.body}</p>
              <a
                className="sp-more venue-ask"
                href={`${href(routes.home)}?venue=${encodeURIComponent(setting.slug)}#enquiry`}
              >
                {copy.settingsAsk}
                <span className="sr-only">: {setting.name}</span>
              </a>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="process">
        <SectionHead eyebrow={copy.processEyebrow} title={copy.processTitle} />
        <ol className="sp-steps">
          {copy.processSteps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="sp-links">
          <a className="sp-more" href={href(routes.howItWorks)}>
            {copy.processLink}
          </a>
          <a className="sp-more" href={href(routes.faq)}>
            {copy.faqLink}
          </a>
        </p>
      </Section>

      <section id="enquiry" className="sp-enquiry-band">
        <div className="wrap section enquiry">
          <div className="enquiry-sidebar">
            <p className="kicker">{copy.enquiryEyebrow}</p>
            <h2>{t(locale, "marketing.launchFormTitle")}</h2>
            <p>{t(locale, "marketing.launchFormIntro")}</p>
            <div className="enquiry-contact-card">
              <strong>{t(locale, "marketing.launchContactDeskTitle")}</strong>
              <p>
                {t(locale, "marketing.launchContactEmailLabel")}:{" "}
                <a href={`mailto:${contact.email}`}>
                  <bdi>{contact.email}</bdi>
                </a>
              </p>
              {contact.phone && (
                <p>
                  {t(locale, "marketing.launchContactPhoneLabel")}:{" "}
                  <a href={`tel:${contact.phone}`}>
                    <bdi>{contact.phone}</bdi>
                  </a>
                </p>
              )}
            </div>
          </div>
          <div className="enquiry-form-card">
            <EnquiryForm
              locale={locale}
              ceremonies={ceremonyOptions}
              venues={settings.map((setting) => ({
                slug: setting.slug,
                name: { en: setting.name },
              }))}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
