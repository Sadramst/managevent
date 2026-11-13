import { notFound, permanentRedirect } from "next/navigation";
import { fillCopy, getCeremonyPages } from "@managevent/i18n";
import { ButtonLink, Card, Eyebrow, PageHero, Section, SectionHead } from "@managevent/ui/brand";
import {
  CeremonyCard,
  FaqList,
  ModeMain,
  ceremonyEnquiryPath,
  ceremonyPath,
} from "../../../../components/ceremony-kit";
import { ArchCard, Breadcrumbs, CheckList, CtaBand, JsonLd } from "../../../../components/page-kit";
import {
  CEREMONY_SLUG_ALIASES,
  ceremonyMode,
  findCeremony,
  formatTimelineOffset,
  loadCeremonies,
  loadPerthVenues,
  relatedCeremonies,
  settingsForCeremony,
} from "../../../../lib/content";
import { planCopyParams } from "../../../../lib/plans";
import { getContact } from "../../../../lib/contact";
import { invitationLinks, localePath, pageMetadata, routes } from "../../../../lib/site";
import { faqJsonLd, serviceJsonLd } from "../../../../lib/structured-data";
import "../../../ceremony-pages.css";

type Params = Promise<{ locale: string; slug: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  const slugs = [...loadCeremonies().map((ceremony) => ceremony.slug)];
  for (const alias of Object.keys(CEREMONY_SLUG_ALIASES)) {
    if (!slugs.includes(alias)) slugs.push(alias);
  }
  return slugs.map((slug) => ({ locale: "en", slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const ceremony = findCeremony(CEREMONY_SLUG_ALIASES[slug] ?? slug);
  if (!ceremony) return {};
  const copy = getCeremonyPages("en").detail;
  const title = ceremony.seo?.title?.en ?? `${ceremony.name.en} ${copy.metaTitleSuffix}`;
  return pageMetadata("en", title, ceremonyPath(ceremony.slug), {
    description: ceremony.seo?.description?.en ?? ceremony.summary.en,
    suffix: "Managevent",
  });
}

export default async function CeremonyDetail({ params }: { params: Params }) {
  const contact = await getContact();
  const { locale, slug } = await params;
  if (locale !== "en") notFound();

  const ceremonies = loadCeremonies();
  const canonicalSlug = CEREMONY_SLUG_ALIASES[slug];
  if (canonicalSlug && findCeremony(canonicalSlug, ceremonies)) {
    permanentRedirect(localePath(locale, ceremonyPath(canonicalSlug)));
  }
  const ceremony = findCeremony(slug, ceremonies);
  if (!ceremony) notFound();

  const pages = getCeremonyPages(locale);
  const copy = pages.detail;
  const mode = ceremonyMode(ceremony);
  const memorial = mode === "MEMORIAL";
  const path = ceremonyPath(ceremony.slug);
  const enquiryHref = localePath(locale, ceremonyEnquiryPath(ceremony.slug));
  const plan = planCopyParams();

  const settings = settingsForCeremony(ceremony.slug, loadPerthVenues());
  const settingAreas = [...new Set(settings.map((venue) => venue.area))].slice(0, 3);
  const related = relatedCeremonies(ceremony, ceremonies);
  const faq = (ceremony.faq ?? []).map((item) => ({ question: item.q.en, answer: item.a.en }));
  const timeline = ceremony.timelineTemplate ?? [];
  const localNotes = ceremony.localNotes ?? [];
  const handles = (ceremony.handles ?? []).map((item) => item.en);

  const glance = [
    ...(settingAreas.length > 0 ? [`${copy.asideSettings}: ${settingAreas.join(", ")}`] : []),
    `${copy.asideInvitation}: ${
      memorial
        ? copy.asideInvitationMemorial
        : fillCopy(copy.asideInvitationValue, { guests: plan.guests })
    }`,
    `${copy.asideQuote}: ${memorial ? copy.asideQuoteMemorial : copy.asideQuoteValue}`,
  ];

  const phoneLink = contact.phone ? (
    <ButtonLink
      variant="secondary"
      label={fillCopy(pages.shared.callUs, { phone: contact.phone })}
      href={`tel:${contact.phone}`}
    />
  ) : null;

  return (
    <ModeMain mode={mode}>
      <Breadcrumbs
        locale={locale}
        trail={[
          { name: pages.shared.ceremonies, path: routes.ceremonies },
          { name: ceremony.name.en, path },
        ]}
      />
      <JsonLd
        data={serviceJsonLd({
          name: ceremony.name.en,
          description: ceremony.seo?.description?.en ?? ceremony.summary.en,
          path,
        })}
      />
      {faq.length > 0 ? <JsonLd data={faqJsonLd(faq)} /> : null}

      <PageHero
        eyebrow={copy.familyEyebrow[ceremony.family]}
        title={ceremony.name.en}
        lead={ceremony.summary.en}
        actions={
          memorial ? (
            <>
              <ButtonLink label={copy.enquireCtaMemorial} href={enquiryHref} />
              {phoneLink}
            </>
          ) : (
            <>
              <ButtonLink label={copy.enquireCta} href={enquiryHref} />
              <ButtonLink
                variant="secondary"
                label={pages.shared.seeTemplates}
                href={invitationLinks.templates}
                external
              />
            </>
          )
        }
        aside={<ArchCard title={copy.asideLabel} lines={glance} />}
      />

      <Section>
        <div className="split">
          <div className="cp-prose">
            {ceremony.audience ? (
              <>
                <h2>{copy.audienceTitle}</h2>
                <p>{ceremony.audience.en}</p>
              </>
            ) : null}
            {ceremony.guestGuidance ? (
              <>
                <h3>{memorial ? copy.guestTitleMemorial : copy.guestTitle}</h3>
                <p>{ceremony.guestGuidance.en}</p>
              </>
            ) : null}
          </div>
          {handles.length > 0 ? (
            <Card variant="sheet">
              <Eyebrow>{copy.handlesEyebrow}</Eyebrow>
              <h2>{memorial ? copy.handlesTitleMemorial : copy.handlesTitle}</h2>
              <CheckList items={handles} />
              <p className="cp-note">{memorial ? copy.handlesNoteMemorial : copy.handlesNote}</p>
            </Card>
          ) : null}
        </div>
      </Section>

      {ceremony.culturalNotes ? (
        <Section band>
          <div className="sp-family">
            <SectionHead eyebrow={copy.culturalEyebrow} title={copy.culturalTitle} />
            <p className="section-lead">{ceremony.culturalNotes.en}</p>
          </div>
        </Section>
      ) : null}

      {timeline.length > 0 ? (
        <Section band={!ceremony.culturalNotes}>
          <SectionHead
            eyebrow={copy.timelineEyebrow}
            title={copy.timelineTitle}
            lead={memorial ? copy.timelineLeadMemorial : copy.timelineLead}
          />
          <ol className="sp-timeline cp-timeline">
            {timeline.map((step) => (
              <li key={step.offsetMinutes}>
                <span className="sp-timeline-when">
                  {formatTimelineOffset(step.offsetMinutes, copy)}
                </span>
                <div>
                  <h3>{step.label.en}</h3>
                  {step.detail ? <p>{step.detail.en}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {localNotes.length > 0 ? (
        <Section>
          <SectionHead
            eyebrow={copy.localEyebrow}
            title={memorial ? copy.localTitleMemorial : copy.localTitle}
          />
          <div className="grid grid-2 cp-notes">
            {localNotes.map((note) => (
              <Card key={note.title.en} variant="rule">
                <h3>{note.title.en}</h3>
                <p>{note.body.en}</p>
              </Card>
            ))}
          </div>
          {settings.length > 0 ? (
            <div className="sp-after">
              <h3>{copy.settingsTitle}</h3>
              <p className="muted">{copy.settingsLead}</p>
              <ul className="pills">
                {settings.map((venue) => (
                  <li key={venue.slug} className="pill">
                    {venue.name.en}
                  </li>
                ))}
              </ul>
              <p className="sp-links">
                <a className="sp-more" href={localePath(locale, routes.venues)}>
                  {copy.settingsLink}
                </a>
              </p>
            </div>
          ) : null}
        </Section>
      ) : null}

      {ceremony.invitationNotes ? (
        <Section band>
          <div className="cp-invite">
            <div>
              <Eyebrow>{copy.invitesEyebrow}</Eyebrow>
              <h2>{memorial ? copy.invitesTitleMemorial : copy.invitesTitle}</h2>
              <p>{ceremony.invitationNotes.en}</p>
              <p className="cp-invite-plan">
                {memorial ? copy.invitesPlanMemorial : fillCopy(copy.invitesPlan, plan)}
              </p>
              <div className="page-hero-actions">
                <ButtonLink
                  variant={memorial ? "secondary" : "primary"}
                  label={memorial ? pages.shared.seeMemorialTemplates : pages.shared.seeTemplates}
                  href={invitationLinks.templates}
                  external
                />
              </div>
            </div>
            <div className="cp-invite-side">
              <CheckList items={memorial ? copy.invitesFeaturesMemorial : copy.invitesFeatures} />
            </div>
          </div>
        </Section>
      ) : null}

      {faq.length > 0 ? (
        <Section>
          <div className="sp-family">
            <SectionHead
              eyebrow={copy.faqEyebrow}
              title={memorial ? copy.faqTitleMemorial : copy.faqTitle}
            />
            <FaqList items={faq} />
          </div>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section band>
          <div className="sp-head-row">
            <SectionHead title={memorial ? copy.relatedTitleMemorial : copy.relatedTitle} />
            <a
              className="sp-more"
              href={localePath(locale, memorial ? routes.memorials : routes.ceremonies)}
            >
              {memorial ? pages.hub.groups.memorials.link : copy.allCeremonies}
            </a>
          </div>
          <div className="grid grid-3">
            {related.map((item) => (
              <CeremonyCard key={item.slug} locale={locale} ceremony={item} />
            ))}
          </div>
        </Section>
      ) : null}

      <CtaBand
        title={memorial ? copy.closeTitleMemorial : copy.closeTitle}
        body={memorial ? copy.closeBodyMemorial : copy.closeBody}
      >
        <ButtonLink
          variant="inverse"
          label={memorial ? copy.enquireCtaMemorial : copy.enquireCta}
          href={enquiryHref}
        />
        {memorial ? (
          contact.phone ? (
            <ButtonLink
              variant="outline-inverse"
              label={fillCopy(pages.shared.callUs, { phone: contact.phone })}
              href={`tel:${contact.phone}`}
            />
          ) : null
        ) : (
          <ButtonLink
            variant="outline-inverse"
            label={pages.shared.estimator}
            href={localePath(locale, routes.estimator)}
          />
        )}
      </CtaBand>
    </ModeMain>
  );
}
