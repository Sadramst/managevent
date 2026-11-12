import { notFound } from "next/navigation";
import { getExperienceMode, getSitePages } from "@managevent/i18n";
import { ButtonLink, Card, PageHero, Section, SectionHead } from "@managevent/ui/brand";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { ArchCard, Breadcrumbs, EnquiryCta } from "../../../components/page-kit";
import { localePath, pageMetadata, routes } from "../../../lib/site";

export async function generateMetadata() {
  const copy = getSitePages("en").howItWorks;
  return pageMetadata("en", copy.metaTitle, routes.howItWorks, {
    description: copy.metaDescription,
  });
}

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const site = getSitePages(locale);
  const copy = site.howItWorks;
  const shared = site.shared;
  const href = (path: string) => localePath(locale, path);
  const memorialMode = getExperienceMode(routes.memorials);

  return (
    <main id="main">
      <Breadcrumbs
        locale={locale}
        trail={[{ name: site.nav.howItWorks, path: routes.howItWorks }]}
      />
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
        actions={
          <>
            <ButtonLink label={shared.talkToUs} href={href(routes.contact)} />
            <ButtonLink
              variant="secondary"
              label={shared.seeServices}
              href={href(routes.services)}
            />
          </>
        }
        aside={<ArchCard title={copy.heroCardTitle} lines={copy.heroCardItems} ordered />}
      />

      <Section id="process">
        <SectionHead title={copy.stepsTitle} />
        <ol className="sp-steps">
          {copy.steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section band id="timeline">
        <SectionHead title={copy.timelineTitle} lead={copy.timelineLead} />
        <ol className="sp-timeline">
          {copy.timeline.map((item) => (
            <li key={item.when}>
              <span className="sp-timeline-when">{item.when}</span>
              <p>{item.what}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="short-notice">
        <Card
          variant="sheet"
          data-experience-mode={memorialMode.toLowerCase()}
          style={getCssVariablesForMode(memorialMode) as CSSProperties}
          className="sp-memorial"
        >
          <h2>{copy.memorialTitle}</h2>
          <p>{copy.memorialBody}</p>
          <a className="sp-more" href={href(routes.memorials)}>
            {copy.memorialLink}
          </a>
        </Card>
      </Section>

      <EnquiryCta
        locale={locale}
        secondary={{ label: shared.seePricing, href: href(routes.pricing) }}
      />
    </main>
  );
}
