import type { Metadata } from "next";
import { fillCopy, getInvitationPublic, getInvitationShell } from "@managevent/i18n";
import { ButtonLink, PageHero, Section, SectionHead } from "@managevent/ui/brand";
import { ArchCard, CtaBand, Faq } from "@/components/public/kit";
import { PlanCards, PlanTable } from "@/components/public/Plans";
import { buttonClass, Notice } from "@/components/ui";
import { privateMetadata } from "@/lib/metadata";
import { createInvitationHref } from "@/lib/public/links";
import { planCopyParams, type PlanColumn } from "@/lib/public/plans";
import { getMeOptional } from "@/lib/session";
import { routes, wwwLinks } from "@/lib/urls";

const copy = getInvitationPublic("en");
const shell = getInvitationShell("en");

export const metadata: Metadata = privateMetadata(
  copy.pricing.metaTitle,
  copy.pricing.metaDescription,
);

export default async function PricingPage() {
  const me = await getMeOptional();
  const signedIn = me.user !== null;
  const { stripeCheckout, emailInvitations } = me.capabilities;
  const page = copy.pricing;
  const plan = planCopyParams();
  const fill = (text: string) => fillCopy(text, plan);
  const createHref = createInvitationHref(signedIn);
  const createLabel = signedIn ? copy.shared.createAnother : page.startFree;

  // What a visitor can do about each plan. Premium is bought from inside an event, so its card
  // explains that rather than offering a button that cannot work from here.
  const action = (key: PlanColumn) => {
    if (key === "free" || key === "premium") {
      return (
        <a
          className={buttonClass({ variant: key === "premium" ? "primary" : "secondary" })}
          href={createHref}
        >
          {createLabel}
        </a>
      );
    }
    if (key === "memorial") {
      return (
        <a
          className={buttonClass({ variant: "secondary" })}
          href={createInvitationHref(signedIn, "memorial-calm")}
        >
          {page.startMemorial}
        </a>
      );
    }
    return (
      <a className={buttonClass({ variant: "secondary" })} href={wwwLinks.contact} rel="noopener">
        {page.talkToUs}
      </a>
    );
  };

  return (
    <main id="main" tabIndex={-1}>
      <PageHero
        eyebrow={page.eyebrow}
        title={page.title}
        lead={fill(page.lead)}
        actions={
          <>
            <ButtonLink label={createLabel} href={createHref} size="large" />
            <ButtonLink
              variant="secondary"
              label={copy.shared.browseTemplates}
              href={routes.templates}
              size="large"
            />
          </>
        }
        aside={<ArchCard title={page.heroCardTitle} lines={page.heroCardLines.map(fill)} />}
      />

      <Section id="plans">
        <SectionHead title={page.plansTitle} lead={page.plansLead} />
        <PlanCards copy={copy} detailed action={action} level={3} />
        <p className="notice pub-after">{page.premiumHow}</p>
        {stripeCheckout ? null : (
          <Notice className="pub-after">
            <p>
              {shell.capabilities.stripeCheckoutOff}{" "}
              <a className="link" href={wwwLinks.contact} rel="noopener">
                {shell.capabilities.contactUs}
              </a>
            </p>
          </Notice>
        )}
      </Section>

      <Section band id="compare">
        <SectionHead title={page.compareTitle} />
        <PlanTable copy={copy} />
        {emailInvitations ? null : <p className="notice">{page.remindersNote}</p>}
      </Section>

      <Section size="narrow" id="questions">
        <SectionHead title={page.faqTitle} />
        <Faq items={page.faq} />
      </Section>

      <CtaBand title={page.ctaTitle} body={page.ctaBody}>
        <ButtonLink variant="inverse" label={createLabel} href={createHref} />
        <ButtonLink
          variant="outline-inverse"
          label={copy.shared.browseTemplates}
          href={routes.templates}
        />
      </CtaBand>
    </main>
  );
}
