import { notFound } from "next/navigation";
import { fillCopy, getCeremonyPages, getExperienceMode } from "@managevent/i18n";
import { ButtonLink, Card, Eyebrow, PageHero, Section, SectionHead } from "@managevent/ui/brand";
import {
  CeremonyCard,
  FaqList,
  ModeMain,
  ceremonyEnquiryPath,
} from "../../../components/ceremony-kit";
import { Breadcrumbs, CheckList, CtaBand, JsonLd } from "../../../components/page-kit";
import { ceremonyMode, loadCeremonies } from "../../../lib/content";
import { getContact } from "../../../lib/contact";
import { invitationLinks, localePath, pageMetadata, routes } from "../../../lib/site";
import { faqJsonLd, serviceJsonLd } from "../../../lib/structured-data";
import "../../ceremony-pages.css";

/** The ceremony the memorial enquiry buttons prefill on the contact form. */
const ENQUIRY_CEREMONY = "memorial-service";

export function generateMetadata() {
  const copy = getCeremonyPages("en").memorials;
  return pageMetadata("en", copy.metaTitle, routes.memorials, {
    description: copy.metaDescription,
  });
}

export default async function Memorials({ params }: { params: Promise<{ locale: string }> }) {
  const contact = await getContact();
  const { locale } = await params;
  if (locale !== "en") notFound();
  const pages = getCeremonyPages(locale);
  const copy = pages.memorials;
  const mode = getExperienceMode(routes.memorials);
  const gatherings = loadCeremonies().filter((ceremony) => ceremonyMode(ceremony) === "MEMORIAL");
  const enquiryHref = localePath(locale, ceremonyEnquiryPath(ENQUIRY_CEREMONY));
  const callLabel = contact.phone ? fillCopy(pages.shared.callUs, { phone: contact.phone }) : "";

  return (
    <ModeMain mode={mode}>
      <Breadcrumbs
        locale={locale}
        trail={[{ name: pages.shared.memorials, path: routes.memorials }]}
      />
      <JsonLd
        data={serviceJsonLd({
          name: copy.metaTitle,
          description: copy.metaDescription,
          path: routes.memorials,
        })}
      />
      <JsonLd data={faqJsonLd(copy.faq)} />

      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
        actions={
          <>
            <ButtonLink label={pages.shared.talkToUs} href={enquiryHref} />
            {contact.phone ? (
              <ButtonLink variant="secondary" label={callLabel} href={`tel:${contact.phone}`} />
            ) : null}
          </>
        }
        aside={
          <div className="arch-frame cp-reach">
            <h2>{copy.asideTitle}</h2>
            <p>{copy.asideBody}</p>
            {contact.phone ? (
              <a href={`tel:${contact.phone}`}>
                <bdi>{callLabel}</bdi>
              </a>
            ) : null}
            <a href={`mailto:${contact.email}`}>
              <bdi>{fillCopy(pages.shared.emailUs, { email: contact.email })}</bdi>
            </a>
          </div>
        }
      />

      <Section>
        <SectionHead eyebrow={copy.arrangeEyebrow} title={copy.arrangeTitle} />
        <div className="grid grid-3 cp-notes">
          {copy.arrange.map((item) => (
            <Card key={item.title} variant="rule">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section band>
        <SectionHead eyebrow={copy.scopeEyebrow} title={copy.scopeTitle} />
        <div className="grid grid-2 cp-scope">
          <Card variant="quiet">
            <h3>{copy.scopeDoTitle}</h3>
            <CheckList items={copy.scopeDo} />
          </Card>
          <Card variant="quiet">
            <h3>{copy.scopeDontTitle}</h3>
            <ul className="cp-plain-list">
              {copy.scopeDont.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="cp-note">{copy.scopeNote}</p>
          </Card>
        </div>
      </Section>

      {gatherings.length > 0 ? (
        <Section>
          <SectionHead eyebrow={copy.kindsEyebrow} title={copy.kindsTitle} lead={copy.kindsLead} />
          <div className="grid grid-3">
            {gatherings.map((ceremony) => (
              <CeremonyCard key={ceremony.slug} locale={locale} ceremony={ceremony} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section band>
        <div className="cp-invite">
          <div>
            <Eyebrow>{copy.inviteEyebrow}</Eyebrow>
            <h2>{copy.inviteTitle}</h2>
            <p>{copy.inviteBody}</p>
            <div className="page-hero-actions">
              <ButtonLink
                variant="secondary"
                label={pages.shared.seeMemorialTemplates}
                href={invitationLinks.templates}
                external
              />
            </div>
          </div>
          <div className="cp-invite-side">
            <CheckList items={copy.invitePoints} />
          </div>
        </div>
      </Section>

      <Section>
        <div className="sp-family">
          <SectionHead eyebrow={copy.customEyebrow} title={copy.customTitle} />
          <p className="section-lead">{copy.customBody}</p>
        </div>
      </Section>

      <Section band>
        <SectionHead eyebrow={copy.stepsEyebrow} title={copy.stepsTitle} />
        <ol className="sp-steps">
          {copy.steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="sp-family">
          <SectionHead title={copy.faqTitle} />
          <FaqList items={copy.faq} />
        </div>
      </Section>

      <CtaBand title={copy.closeTitle} body={copy.closeBody}>
        <ButtonLink variant="inverse" label={pages.shared.talkToUs} href={enquiryHref} />
        {contact.phone ? (
          <ButtonLink variant="outline-inverse" label={callLabel} href={`tel:${contact.phone}`} />
        ) : null}
      </CtaBand>
    </ModeMain>
  );
}
