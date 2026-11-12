import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  fillCopy,
  getExperienceMode,
  getInvitationPublic,
  getInvitationShell,
} from "@managevent/i18n";
import { ButtonLink, PageHero, Section, SectionHead } from "@managevent/ui/brand";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import { INVITATION_TEMPLATES } from "@managevent/validators";
import { CtaBand, JsonLd } from "@/components/public/kit";
import { TemplateCard } from "@/components/public/TemplateCard";
import { Notice } from "@/components/ui";
import { loadDemos } from "@/lib/public/demos";
import { itemListJsonLd } from "@/lib/public/json-ld";
import { createInvitationHref } from "@/lib/public/links";
import { planCopyParams } from "@/lib/public/plans";
import { getMeOptional } from "@/lib/session";
import { absoluteUrl, routes } from "@/lib/urls";

const copy = getInvitationPublic("en");
const shell = getInvitationShell("en");

/** Templates is one of the two indexable pages. */
export const metadata: Metadata = {
  title: copy.templates.metaTitle,
  description: copy.templates.metaDescription,
  alternates: { canonical: absoluteUrl(routes.templates) },
  openGraph: {
    type: "website",
    siteName: shell.meta.siteName,
    title: copy.templates.metaTitle,
    description: copy.templates.metaDescription,
    url: absoluteUrl(routes.templates),
    locale: "en_AU",
  },
};

export default async function TemplatesPage() {
  const [me, demos] = await Promise.all([getMeOptional(), loadDemos()]);
  const signedIn = me.user !== null;
  const page = copy.templates;
  const plan = planCopyParams();

  // The catalogue is static (`INVITATION_TEMPLATES`); the API adds one live sample per template.
  const demoFor = (slug: string) => demos.items.find((demo) => demo.templateSlug === slug);
  const isMemorial = (template: (typeof INVITATION_TEMPLATES)[number]) =>
    getExperienceMode({ experienceMode: template.mode }) === "MEMORIAL";
  const celebration = INVITATION_TEMPLATES.filter((template) => !isMemorial(template));
  const memorial = INVITATION_TEMPLATES.filter(isMemorial);
  const memorialMode = getExperienceMode("memorial-service");

  return (
    <main id="main" tabIndex={-1}>
      <JsonLd
        data={itemListJsonLd(
          page.metaTitle,
          INVITATION_TEMPLATES.map((template) => {
            const { name, summary } = copy.templateNames[template.slug];
            return { name, description: summary };
          }),
        )}
      />

      <PageHero eyebrow={page.eyebrow} title={page.title} lead={page.lead} />

      <Section id="celebration">
        <SectionHead
          eyebrow={page.celebrationEyebrow}
          title={page.celebrationTitle}
          lead={fillCopy(page.celebrationLead, plan)}
        />
        {demos.available ? null : (
          <Notice className="pub-notice-gap">{page.samplesUnavailable}</Notice>
        )}
        <ul className="pub-templates pub-templates-2">
          {celebration.map((template) => (
            <li key={template.slug}>
              <TemplateCard
                template={template}
                demo={demoFor(template.slug)}
                signedIn={signedIn}
                copy={copy}
              />
            </li>
          ))}
        </ul>
      </Section>

      <section
        id="memorial"
        className="pub-memorial"
        data-experience-mode={memorialMode.toLowerCase()}
        style={getCssVariablesForMode(memorialMode) as CSSProperties}
      >
        <div className="wrap section">
          <SectionHead
            eyebrow={page.memorialEyebrow}
            title={page.memorialTitle}
            lead={page.memorialLead}
          />
          <ul className="pub-templates pub-templates-2">
            {memorial.map((template) => (
              <li key={template.slug}>
                <TemplateCard
                  template={template}
                  demo={demoFor(template.slug)}
                  signedIn={signedIn}
                  copy={copy}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand title={page.ctaTitle} body={page.ctaBody}>
        <ButtonLink
          variant="inverse"
          label={signedIn ? copy.shared.createAnother : copy.shared.create}
          href={createInvitationHref(signedIn)}
        />
        <ButtonLink
          variant="outline-inverse"
          label={copy.shared.seePricing}
          href={routes.pricing}
        />
      </CtaBand>
    </main>
  );
}
