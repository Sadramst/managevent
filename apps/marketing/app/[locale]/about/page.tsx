import { notFound } from "next/navigation";
import { getSitePages } from "@managevent/i18n";
import { ButtonLink, Card, PageHero, Section, SectionHead } from "@managevent/ui/brand";
import { ArchCard, Breadcrumbs, EnquiryCta } from "../../../components/page-kit";
import { localePath, pageMetadata, routes } from "../../../lib/site";

export async function generateMetadata() {
  const copy = getSitePages("en").about;
  return pageMetadata("en", copy.metaTitle, routes.about, { description: copy.metaDescription });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const site = getSitePages(locale);
  const copy = site.about;
  const shared = site.shared;
  const href = (path: string) => localePath(locale, path);

  return (
    <main id="main">
      <Breadcrumbs locale={locale} trail={[{ name: site.nav.about, path: routes.about }]} />
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
        aside={<ArchCard title={copy.heroCardTitle} lines={copy.heroCardLines} />}
      />

      <Section id="story">
        <div className="split">
          <h2>{copy.storyTitle}</h2>
          <div className="prose">
            {copy.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section band id="values">
        <SectionHead eyebrow={copy.valuesEyebrow} title={copy.valuesTitle} />
        <div className="grid grid-4">
          {copy.values.map((value) => (
            <Card key={value.title} as="article" variant="quiet" className="sp-card">
              <h3 className="card-title">{value.title}</h3>
              <p className="card-body">{value.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="privacy">
        <div className="split">
          <SectionHead eyebrow={copy.dataEyebrow} title={copy.dataTitle} />
          <div className="prose">
            {copy.dataBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <a className="sp-more" href={href(routes.privacy)}>
              {copy.dataLink}
            </a>
          </div>
        </div>
      </Section>

      <Section band id="accessibility">
        <div className="split">
          <SectionHead eyebrow={copy.accessEyebrow} title={copy.accessTitle} />
          <div className="prose">
            <p>{copy.accessBody}</p>
            <a className="sp-more" href={href(routes.accessibility)}>
              {copy.accessLink}
            </a>
          </div>
        </div>
      </Section>

      <Section id="company">
        <div className="grid grid-2">
          <Card variant="rule">
            <h2 className="card-title">{copy.appilicoTitle}</h2>
            <p className="card-body">{copy.appilicoBody}</p>
          </Card>
          <Card variant="rule">
            <h2 className="card-title">{copy.scopeTitle}</h2>
            <p className="card-body">{copy.scopeBody}</p>
          </Card>
        </div>
      </Section>

      <EnquiryCta
        locale={locale}
        secondary={{ label: shared.seeHowItWorks, href: href(routes.howItWorks) }}
      />
    </main>
  );
}
