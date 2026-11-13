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
import { HeroPreviewSwitcher } from "@/components/public/HeroPreviewSwitcher";
import { InvitationPreview } from "@/components/public/InvitationPreview";
import { CheckList, CtaBand, Faq, FeatureList, JsonLd, Steps } from "@/components/public/kit";
import { PlanCards } from "@/components/public/Plans";
import { Notice } from "@/components/ui";
import { loadDemos } from "@/lib/public/demos";
import { faqJsonLd, serviceJsonLd } from "@/lib/public/json-ld";
import { createInvitationHref, samplePath } from "@/lib/public/links";
import { planCopyParams, premiumPriceDecimal } from "@/lib/public/plans";
import { getMeOptional } from "@/lib/session";
import { absoluteUrl, marketingUrl, routes, wwwUrl } from "@/lib/urls";

const copy = getInvitationPublic("en");
const shell = getInvitationShell("en");

/** Home is one of the two indexable pages. Its share image is the site-wide one. */
export const metadata: Metadata = {
  title: copy.home.metaTitle,
  description: copy.home.metaDescription,
  alternates: { canonical: absoluteUrl(routes.home) },
  openGraph: {
    type: "website",
    siteName: shell.meta.siteName,
    title: copy.home.metaTitle,
    description: copy.home.metaDescription,
    url: absoluteUrl(routes.home),
    locale: "en_AU",
  },
};

export default async function HomePage() {
  const [me, demos] = await Promise.all([getMeOptional(), loadDemos()]);
  const signedIn = me.user !== null;
  const home = copy.home;
  const shared = copy.shared;
  const plan = planCopyParams();
  const fill = (text: string) => fillCopy(text, plan);

  // The hero shows the first celebration sample; the memorial band links to a memorial one.
  const modeOf = (demo: (typeof demos.items)[number]) =>
    getExperienceMode({ experienceMode: demo.experienceMode });
  const heroDemo = demos.items.find((demo) => modeOf(demo) === "CELEBRATION");
  const memorialDemo = demos.items.find((demo) => modeOf(demo) === "MEMORIAL");
  // The memorial band previews Memorial Mode, so its palette comes from the shared helper.
  const memorialMode = getExperienceMode("memorial-service");
  const faq = home.faq.map((item) => ({ question: item.question, answer: fill(item.answer) }));

  const createHref = createInvitationHref(signedIn);

  return (
    <main id="main" tabIndex={-1}>
      <JsonLd
        data={[
          serviceJsonLd({
            name: shell.meta.siteName,
            description: home.metaDescription,
            url: absoluteUrl(routes.home),
            serviceType: home.eyebrow,
            providerName: copy.shared.brandName,
            providerUrl: marketingUrl,
            freeName: copy.pricing.plans.free.name,
            premiumName: copy.pricing.plans.premium.name,
            premiumPrice: premiumPriceDecimal(),
          }),
          faqJsonLd(faq),
        ]}
      />

      <PageHero
        className="pub-home-hero"
        eyebrow={home.eyebrow}
        title={home.title}
        lead={signedIn ? home.signedInLead : fill(home.lead)}
        actions={
          signedIn ? (
            <>
              <ButtonLink label={shared.myEvents} href={routes.studio} size="large" />
              <ButtonLink
                variant="secondary"
                label={shared.createAnother}
                href={createHref}
                size="large"
              />
            </>
          ) : (
            <>
              <ButtonLink label={shared.create} href={createHref} size="large" />
              <ButtonLink
                variant="secondary"
                label={shared.browseTemplates}
                href={routes.templates}
                size="large"
              />
            </>
          )
        }
        aside={
          <div className="pub-hero-preview">
            <HeroPreviewSwitcher
              initialThemeId={heroDemo?.themeId ?? "royal-ivory"}
              hosts={heroDemo?.hosts ?? home.previewFallbackHosts}
              headline={heroDemo?.headline ?? home.previewFallbackHeadline}
              title={heroDemo?.title ?? home.previewFallbackTitle}
            />
            {heroDemo ? (
              <div className="pub-hero-preview-foot">
                <p>{home.previewCaption}</p>
                <a className="pub-more" href={samplePath(heroDemo)}>
                  {home.previewOpen}
                </a>
              </div>
            ) : null}
          </div>
        }
      />

      <Section id="how">
        <SectionHead eyebrow={home.stepsEyebrow} title={home.stepsTitle} />
        <Steps items={home.steps} columns={4} />
      </Section>

      <Section band id="features">
        <SectionHead eyebrow={home.featuresEyebrow} title={home.featuresTitle} />
        <FeatureList items={home.features} />
      </Section>

      <Section id="samples">
        <div className="pub-head-row">
          <SectionHead
            eyebrow={home.samplesEyebrow}
            title={home.samplesTitle}
            lead={home.samplesLead}
          />
          <a className="pub-more" href={routes.templates}>
            {home.samplesAll}
          </a>
        </div>
        {demos.items.length > 0 ? (
          <ul className="pub-templates">
            {demos.items.map((demo) => {
              const name = copy.templateNames[demo.templateSlug].name;
              const memorial = modeOf(demo) === "MEMORIAL";
              return (
                <li
                  key={demo.eventSlug}
                  data-experience-mode={memorial ? "memorial" : undefined}
                  style={
                    memorial ? (getCssVariablesForMode(modeOf(demo)) as CSSProperties) : undefined
                  }
                >
                  {/* A plain link: prefetching would spend the sample link's rate limit. */}
                  <a
                    className="pub-sample"
                    href={samplePath(demo)}
                    aria-label={fillCopy(shared.viewSampleFor, { name })}
                  >
                    <InvitationPreview
                      themeId={demo.themeId}
                      hosts={demo.hosts}
                      headline={demo.headline}
                      title={demo.title}
                    />
                    <span className="pub-sample-body">
                      <span className="pub-sample-name">{name}</span>
                      <span className="pub-sample-open">{shared.viewSample}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <Notice>{home.samplesUnavailable}</Notice>
        )}
      </Section>

      <Section band id="bridge">
        <SectionHead eyebrow={home.bridgeEyebrow} title={home.bridgeTitle} lead={home.bridgeLead} />
        <Steps items={home.bridgeSteps} />
        <p className="notice pub-after">{home.bridgeNote}</p>
        <p className="pub-links">
          <a className="pub-more" href={wwwUrl("/services")} rel="noopener">
            {home.bridgeLink}
          </a>
        </p>
      </Section>

      <section
        id="memorial-mode"
        className="pub-memorial"
        data-experience-mode={memorialMode.toLowerCase()}
        style={getCssVariablesForMode(memorialMode) as CSSProperties}
      >
        <div className="wrap section split">
          <SectionHead eyebrow={home.memorialEyebrow} title={home.memorialTitle} />
          <div>
            <p>{home.memorialBody}</p>
            <CheckList items={home.memorialPoints} />
            <p className="pub-links">
              {memorialDemo ? (
                <a className="pub-more" href={samplePath(memorialDemo)}>
                  {home.memorialSample}
                </a>
              ) : null}
              <a className="pub-more" href={`${routes.templates}#memorial`}>
                {home.memorialTemplates}
              </a>
            </p>
          </div>
        </div>
      </section>

      <Section id="plans">
        <div className="pub-head-row">
          <SectionHead eyebrow={home.plansEyebrow} title={home.plansTitle} lead={home.plansLead} />
          <a className="pub-more" href={routes.pricing}>
            {shared.seePricing}
          </a>
        </div>
        <PlanCards copy={copy} />
      </Section>

      <Section band size="narrow" id="questions">
        <SectionHead eyebrow={home.faqEyebrow} title={home.faqTitle} />
        <Faq items={faq} />
      </Section>

      <CtaBand
        title={signedIn ? home.ctaTitleSignedIn : home.ctaTitle}
        body={signedIn ? home.ctaBodySignedIn : home.ctaBody}
      >
        {signedIn ? (
          <>
            <ButtonLink variant="inverse" label={shared.myEvents} href={routes.studio} />
            <ButtonLink variant="outline-inverse" label={shared.createAnother} href={createHref} />
          </>
        ) : (
          <>
            <ButtonLink variant="inverse" label={shared.create} href={createHref} />
            <ButtonLink
              variant="outline-inverse"
              label={shared.browseTemplates}
              href={routes.templates}
            />
          </>
        )}
      </CtaBand>
    </main>
  );
}
