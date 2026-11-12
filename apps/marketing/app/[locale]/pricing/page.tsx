import { notFound } from "next/navigation";
import { getSitePages } from "@managevent/i18n";
import { ButtonLink, Card, PageHero, Section, SectionHead } from "@managevent/ui/brand";
import { ArchCard, Breadcrumbs, EnquiryCta } from "../../../components/page-kit";
import { PlanTable } from "../../../components/plan-table";
import { invitationLinks, localePath, pageMetadata, routes } from "../../../lib/site";

export async function generateMetadata() {
  const copy = getSitePages("en").pricing;
  return pageMetadata("en", copy.metaTitle, routes.pricing, { description: copy.metaDescription });
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const site = getSitePages(locale);
  const copy = site.pricing;
  const shared = site.shared;
  const href = (path: string) => localePath(locale, path);

  return (
    <main id="main">
      <Breadcrumbs locale={locale} trail={[{ name: site.nav.pricing, path: routes.pricing }]} />
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
        actions={
          <>
            <ButtonLink label={shared.talkToUs} href={href(routes.contact)} />
            <ButtonLink
              variant="secondary"
              label={shared.openEstimator}
              href={href(routes.estimator)}
            />
          </>
        }
        aside={<ArchCard title={copy.heroCardTitle} lines={copy.heroCardItems} />}
      />

      <Section id="invitations">
        <SectionHead
          eyebrow={copy.invitationsEyebrow}
          title={copy.invitationsTitle}
          lead={copy.invitationsLead}
        />
        <PlanTable locale={locale} />
        <div className="page-hero-actions">
          <ButtonLink label={shared.createInvitation} href={invitationLinks.templates} external />
          <ButtonLink
            variant="ghost"
            label={copy.invitationsLink}
            href={href(`${routes.invitations}#plans`)}
          />
        </div>
      </Section>

      <Section band id="events">
        <SectionHead eyebrow={copy.agencyEyebrow} title={copy.agencyTitle} lead={copy.agencyLead} />
        <h3>{copy.driversTitle}</h3>
        <div className="grid grid-3">
          {copy.drivers.map((driver) => (
            <Card key={driver.title} as="article" variant="quiet" className="sp-card">
              <h4 className="card-title">{driver.title}</h4>
              <p className="card-body">{driver.body}</p>
            </Card>
          ))}
        </div>
        <Card variant="rule" className="sp-after">
          <h3>{copy.estimatorTitle}</h3>
          <p>{copy.estimatorBody}</p>
          <ButtonLink
            variant="secondary"
            label={shared.openEstimator}
            href={href(routes.estimator)}
          />
        </Card>
      </Section>

      <Section id="payments">
        <SectionHead eyebrow={copy.paymentsEyebrow} title={copy.paymentsTitle} />
        <div className="grid grid-3">
          {copy.payments.map((item) => (
            <Card key={item.title} as="article" variant="rule" className="sp-card">
              <h3 className="card-title">{item.title}</h3>
              <p className="card-body">{item.body}</p>
            </Card>
          ))}
        </div>
        <p className="notice sp-after">
          {copy.websiteNote}{" "}
          <a className="link" href={href(routes.terms)}>
            {copy.termsLink}
          </a>
        </p>
      </Section>

      <EnquiryCta locale={locale} secondary={{ label: shared.readFaq, href: href(routes.faq) }} />
    </main>
  );
}
