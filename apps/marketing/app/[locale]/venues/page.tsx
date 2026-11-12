import { Fragment } from "react";
import { notFound } from "next/navigation";
import { fillCopy, getCeremonyPages } from "@managevent/i18n";
import { ButtonLink, Card, PageHero, Section, SectionHead } from "@managevent/ui/brand";
import { ModeMain, ceremonyPath } from "../../../components/ceremony-kit";
import { ArchCard, Breadcrumbs, CtaBand } from "../../../components/page-kit";
import { findCeremony, loadCeremonies, loadPerthVenues } from "../../../lib/content";
import { localePath, pageMetadata, routes } from "../../../lib/site";
import "../../ceremony-pages.css";

export function generateMetadata() {
  const copy = getCeremonyPages("en").venues;
  return pageMetadata("en", copy.metaTitle, routes.venues, { description: copy.metaDescription });
}

export default async function Venues({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  const pages = getCeremonyPages(locale);
  const copy = pages.venues;
  const ceremonies = loadCeremonies();
  const settings = loadPerthVenues();
  const areas = [...new Set(settings.map((setting) => setting.area))].slice(0, 6);

  return (
    <ModeMain mode="CELEBRATION">
      <Breadcrumbs locale={locale} trail={[{ name: pages.shared.venues, path: routes.venues }]} />
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
        actions={
          <>
            <ButtonLink label={copy.primaryCta} href={localePath(locale, routes.contact)} />
            <ButtonLink
              variant="secondary"
              label={copy.secondaryCta}
              href={localePath(locale, routes.ceremonies)}
            />
          </>
        }
        aside={<ArchCard title={pages.shared.location} lines={areas} />}
      />

      <Section>
        <div className="alert">
          <p className="alert-title">{copy.honestyTitle}</p>
          <p>{copy.honestyBody}</p>
        </div>
        <SectionHead className="sp-after" eyebrow={copy.listEyebrow} title={copy.listTitle} />
        <div className="grid grid-3">
          {settings.map((setting) => {
            const suits = setting.suitableFor
              .map((slug) => findCeremony(slug, ceremonies))
              .filter((ceremony) => ceremony !== undefined);
            return (
              <Card key={setting.slug} as="article" id={setting.slug} className="cp-setting">
                <ul className="pills">
                  <li className="pill">{copy.type[setting.type]}</li>
                  {setting.indoorOutdoor ? (
                    <li className="pill">{copy.indoorOutdoor[setting.indoorOutdoor]}</li>
                  ) : null}
                </ul>
                <p className="cp-setting-meta">{setting.area}</p>
                <h3>{setting.name.en}</h3>
                {setting.notes ? <p className="cp-setting-body">{setting.notes.en}</p> : null}
                {setting.rules?.permitRequired ? (
                  <p className="cp-setting-permit">
                    <strong>{copy.permitBadge}</strong>
                    {setting.rules.permitNotes ? <span>{setting.rules.permitNotes.en}</span> : null}
                  </p>
                ) : null}
                {suits.length > 0 ? (
                  <p className="cp-suits">
                    {copy.suitsLabel}:{" "}
                    {suits.map((ceremony, index) => (
                      <Fragment key={ceremony.slug}>
                        {index > 0 ? ", " : null}
                        <a href={localePath(locale, ceremonyPath(ceremony.slug))}>
                          {ceremony.name.en}
                        </a>
                      </Fragment>
                    ))}
                  </p>
                ) : null}
                <a
                  className="cp-setting-ask"
                  href={`${localePath(locale, routes.contact)}?venue=${encodeURIComponent(setting.slug)}`}
                  aria-label={fillCopy(copy.askLabel, { name: setting.name.en })}
                >
                  {copy.ask}
                </a>
              </Card>
            );
          })}
          <Card as="article" className="sp-fill-card">
            <h3>{copy.otherTitle}</h3>
            <p>{copy.otherBody}</p>
            <ButtonLink
              variant="inverse"
              label={copy.otherCta}
              href={localePath(locale, routes.contact)}
            />
          </Card>
        </div>
      </Section>

      <Section band>
        <SectionHead eyebrow={copy.guideEyebrow} title={copy.guideTitle} />
        <div className="grid grid-3 cp-notes">
          {copy.guide.map((item) => (
            <Card key={item.title} variant="quiet">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <CtaBand title={copy.closeTitle} body={copy.closeBody}>
        <ButtonLink
          variant="inverse"
          label={copy.primaryCta}
          href={localePath(locale, routes.contact)}
        />
        <ButtonLink
          variant="outline-inverse"
          label={copy.secondaryCta}
          href={localePath(locale, routes.ceremonies)}
        />
      </CtaBand>
    </ModeMain>
  );
}
