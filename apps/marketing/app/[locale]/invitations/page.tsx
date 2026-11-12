import { notFound } from "next/navigation";
import { fillCopy, getExperienceMode, getSitePages } from "@managevent/i18n";
import { ButtonLink, PageHero, Section, SectionHead } from "@managevent/ui/brand";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { ArchCard, Breadcrumbs, CheckList, CtaBand, JsonLd } from "../../../components/page-kit";
import { PlanTable } from "../../../components/plan-table";
import { planCopyParams } from "../../../lib/plans";
import { invitationLinks, localePath, pageMetadata, routes } from "../../../lib/site";
import { serviceJsonLd } from "../../../lib/structured-data";

export async function generateMetadata() {
  const copy = getSitePages("en").invitations;
  return pageMetadata("en", copy.metaTitle, routes.invitations, {
    description: copy.metaDescription,
  });
}

export default async function InvitationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const site = getSitePages(locale);
  const copy = site.invitations;
  const shared = site.shared;
  const plan = planCopyParams();
  // The memorial section previews Memorial Mode, so it takes its palette from the shared helper.
  const memorialMode = getExperienceMode("memorial");

  return (
    <main id="main">
      <Breadcrumbs
        locale={locale}
        trail={[{ name: site.nav.invitations, path: routes.invitations }]}
      />
      <JsonLd
        data={serviceJsonLd({
          name: copy.eyebrow,
          description: copy.metaDescription,
          path: routes.invitations,
        })}
      />
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={fillCopy(copy.lead, plan)}
        actions={
          <>
            <ButtonLink label={shared.browseTemplates} href={invitationLinks.templates} external />
            <ButtonLink
              variant="secondary"
              label={shared.createInvitation}
              href={invitationLinks.create}
              external
            />
          </>
        }
        aside={<ArchCard title={copy.heroCardTitle} lines={copy.heroCardLines} />}
      />

      <Section id="how">
        <SectionHead eyebrow={copy.stepsEyebrow} title={copy.stepsTitle} />
        <ol className="sp-steps sp-steps-4">
          {copy.steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section band id="features">
        <SectionHead eyebrow={copy.featuresEyebrow} title={copy.featuresTitle} />
        <ul className="sp-features">
          {copy.features.map((feature) => (
            <li key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="bridge">
        <SectionHead eyebrow={copy.bridgeEyebrow} title={copy.bridgeTitle} lead={copy.bridgeLead} />
        <ol className="sp-steps">
          {copy.bridgeSteps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="notice sp-after">{copy.bridgeNote}</p>
        <p className="sp-links">
          <a className="sp-more" href={localePath(locale, routes.services)}>
            {shared.seeServices}
          </a>
        </p>
      </Section>

      <section
        id="memorial-mode"
        className="sp-memorial"
        data-experience-mode={memorialMode.toLowerCase()}
        style={getCssVariablesForMode(memorialMode) as CSSProperties}
      >
        <div className="wrap section split">
          <SectionHead eyebrow={copy.memorialEyebrow} title={copy.memorialTitle} />
          <div>
            <p>{copy.memorialBody}</p>
            <CheckList items={copy.memorialPoints} />
            <p className="sp-after">
              <a className="sp-more" href={localePath(locale, routes.memorials)}>
                {copy.memorialLink}
              </a>
            </p>
          </div>
        </div>
      </section>

      <Section id="plans">
        <SectionHead eyebrow={copy.plansEyebrow} title={copy.plansTitle} lead={copy.plansLead} />
        <PlanTable locale={locale} detailed />
      </Section>

      <CtaBand title={copy.ctaTitle} body={copy.ctaBody}>
        <ButtonLink
          variant="inverse"
          label={shared.browseTemplates}
          href={invitationLinks.templates}
          external
        />
        <ButtonLink
          variant="outline-inverse"
          label={shared.createInvitation}
          href={invitationLinks.create}
          external
        />
      </CtaBand>
    </main>
  );
}
