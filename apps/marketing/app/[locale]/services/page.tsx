import { notFound } from "next/navigation";
import { getSitePages } from "@managevent/i18n";
import { ButtonLink, Card, PageHero, Section } from "@managevent/ui/brand";
import { ArchCard, Breadcrumbs, CheckList, EnquiryCta, JsonLd } from "../../../components/page-kit";
import { localePath, pageMetadata, routes } from "../../../lib/site";
import { serviceJsonLd } from "../../../lib/structured-data";

export async function generateMetadata() {
  const copy = getSitePages("en").services;
  return pageMetadata("en", copy.metaTitle, routes.services, {
    description: copy.metaDescription,
  });
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const site = getSitePages(locale);
  const copy = site.services;
  const shared = site.shared;
  const href = (path: string) => localePath(locale, path);

  return (
    <main id="main">
      <Breadcrumbs locale={locale} trail={[{ name: site.nav.services, path: routes.services }]} />
      <JsonLd
        data={copy.items.map((item) =>
          serviceJsonLd({
            name: item.title,
            description: item.summary,
            path: `${routes.services}#${item.id}`,
          }),
        )}
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
              label={shared.seeHowItWorks}
              href={href(routes.howItWorks)}
            />
          </>
        }
        aside={
          <ArchCard
            title={copy.heroCardTitle}
            lines={copy.items.map((item) => item.title)}
            ordered
          />
        }
      />

      <Section tight>
        <nav aria-label={copy.jumpLabel}>
          <ul className="sp-jump">
            {copy.items.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      </Section>

      <Section>
        {copy.items.map((item, index) => (
          <article key={item.id} id={item.id} className="sp-service split">
            <div>
              <span className="sp-num" aria-hidden="true" dir="ltr">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2>{item.title}</h2>
              <p className="lead">{item.summary}</p>
            </div>
            <div>
              <h3>{copy.includesLabel}</h3>
              <CheckList items={item.includes} columns={2} />
              <p className="sp-delivered">
                <strong>{copy.deliveredBy}:</strong> {item.deliveredBy}
              </p>
              {item.id === "invitations" ? (
                <a className="sp-more" href={href(routes.invitations)}>
                  {shared.seeInvitations}
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </Section>

      <Section band>
        <div className="grid grid-2">
          <Card variant="quiet">
            <h2 className="card-title">{copy.bridgeTitle}</h2>
            <p className="card-body">{copy.bridgeBody}</p>
            <a className="sp-more" href={href(`${routes.invitations}#bridge`)}>
              {shared.seeInvitations}
            </a>
          </Card>
          <Card variant="quiet">
            <h2 className="card-title">{site.nav.pricing}</h2>
            <p className="card-body">{copy.quoteNote}</p>
            <a className="sp-more" href={href(routes.pricing)}>
              {shared.seePricing}
            </a>
          </Card>
        </div>
      </Section>

      <EnquiryCta
        locale={locale}
        secondary={{ label: site.nav.ceremonies, href: href(routes.ceremonies) }}
      />
    </main>
  );
}
