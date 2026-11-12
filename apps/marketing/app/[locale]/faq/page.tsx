import { notFound } from "next/navigation";
import { fillCopy, getSitePages } from "@managevent/i18n";
import { ButtonLink, PageHero, Section } from "@managevent/ui/brand";
import { FaqList } from "../../../components/ceremony-kit";
import { Breadcrumbs, CtaBand, JsonLd } from "../../../components/page-kit";
import { planCopyParams } from "../../../lib/plans";
import { localePath, pageMetadata, routes } from "../../../lib/site";
import { faqJsonLd } from "../../../lib/structured-data";

export async function generateMetadata() {
  const copy = getSitePages("en").faq;
  return pageMetadata("en", copy.metaTitle, routes.faq, { description: copy.metaDescription });
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const site = getSitePages(locale);
  const copy = site.faq;
  const shared = site.shared;
  const plan = planCopyParams();
  const href = (path: string) => localePath(locale, path);
  const groups = copy.groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      question: fillCopy(item.q, plan),
      answer: fillCopy(item.a, plan),
    })),
  }));

  return (
    <main id="main">
      <Breadcrumbs locale={locale} trail={[{ name: site.nav.faq, path: routes.faq }]} />
      <JsonLd data={faqJsonLd(groups.flatMap((group) => group.items))} />
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        lead={copy.lead}
        actions={
          <ul className="sp-jump">
            {groups.map((group) => (
              <li key={group.id}>
                <a href={`#${group.id}`}>{group.title}</a>
              </li>
            ))}
          </ul>
        }
      />

      <Section>
        {groups.map((group, groupIndex) => (
          <section key={group.id} id={group.id} className="sp-family sp-faq-group">
            <h2>{group.title}</h2>
            <FaqList items={group.items} openFirst={groupIndex === 0} />
          </section>
        ))}
      </Section>

      <CtaBand title={copy.ctaTitle} body={copy.ctaBody}>
        <ButtonLink variant="inverse" label={shared.talkToUs} href={href(routes.contact)} />
        <ButtonLink
          variant="outline-inverse"
          label={shared.seeHowItWorks}
          href={href(routes.howItWorks)}
        />
      </CtaBand>
    </main>
  );
}
