import { notFound } from "next/navigation";
import { getCeremonyPages } from "@managevent/i18n";
import { ButtonLink, Card, PageHero, Section, SectionHead } from "@managevent/ui/brand";
import { CeremonyCard, ModeMain, modeProps } from "../../../components/ceremony-kit";
import { ArchCard, Breadcrumbs, CtaBand } from "../../../components/page-kit";
import { groupCeremonies, loadCeremonies } from "../../../lib/content";
import { localePath, pageMetadata, routes } from "../../../lib/site";
import "../../ceremony-pages.css";

export function generateMetadata() {
  const copy = getCeremonyPages("en").hub;
  return pageMetadata("en", copy.metaTitle, routes.ceremonies, {
    description: copy.metaDescription,
  });
}

export default async function CeremoniesHub({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  const pages = getCeremonyPages(locale);
  const copy = pages.hub;
  const groups = groupCeremonies(loadCeremonies());

  return (
    <ModeMain mode="CELEBRATION">
      <Breadcrumbs
        locale={locale}
        trail={[{ name: pages.shared.ceremonies, path: routes.ceremonies }]}
      />
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
        actions={
          <>
            <ButtonLink label={copy.primaryCta} href={localePath(locale, routes.contact)} />
            <ButtonLink
              variant="secondary"
              label={pages.shared.estimator}
              href={localePath(locale, routes.estimator)}
            />
          </>
        }
        aside={<ArchCard title={copy.asideTitle} lines={copy.asidePoints} />}
      />

      {groups.map(({ group, ceremonies }, index) => {
        const groupCopy = copy.groups[group];
        const memorial = group === "memorials";
        return (
          <Section
            key={group}
            id={group}
            band={index % 2 === 1}
            {...(memorial ? modeProps("MEMORIAL") : {})}
            className={memorial ? "cp-main" : undefined}
          >
            <div className="sp-family">
              <div>
                <SectionHead title={groupCopy.title} lead={groupCopy.lead} />
                {memorial ? (
                  <a className="sp-more" href={localePath(locale, routes.memorials)}>
                    {copy.groups.memorials.link}
                  </a>
                ) : null}
              </div>
              <div className="sp-family-cards">
                {ceremonies.map((ceremony) => (
                  <CeremonyCard key={ceremony.slug} locale={locale} ceremony={ceremony} />
                ))}
              </div>
            </div>
          </Section>
        );
      })}

      <Section>
        <SectionHead title={copy.sameTitle} />
        <div className="grid grid-3 cp-notes">
          {copy.same.map((point) => (
            <Card key={point.title} variant="rule">
              <h3>{point.title}</h3>
              <p>{point.body}</p>
            </Card>
          ))}
        </div>
        <p className="sp-links">
          <a className="sp-more" href={localePath(locale, routes.venues)}>
            {copy.settingsLink}
          </a>
        </p>
      </Section>

      <CtaBand title={copy.otherTitle} body={copy.otherBody}>
        <ButtonLink
          variant="inverse"
          label={copy.otherCta}
          href={localePath(locale, routes.contact)}
        />
      </CtaBand>
    </ModeMain>
  );
}
