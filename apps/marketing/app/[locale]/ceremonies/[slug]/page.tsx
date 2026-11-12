import { notFound } from "next/navigation";
import { getExperienceMode, t } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { EnquiryForm } from "../../../../components/enquiry-form";
import {
  loadCeremonies,
  loadCeremonyBySlug,
  loadPackages,
  loadPerthVenues,
} from "../../../../lib/content";
import {
  buildBreadcrumbJsonLd,
  buildCeremonyServiceJsonLd,
  buildFaqPageJsonLd,
} from "../../../../lib/seo-schema";
import { localePath, pageMetadata } from "../../../../lib/site";

export function generateStaticParams() {
  return loadCeremonies().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "en") notFound();
  const ceremony = loadCeremonyBySlug(slug);
  if (!ceremony) notFound();

  const title = ceremony.seo?.title?.en ?? `${ceremony.name.en} Planning, Styling & Hire`;
  const description = ceremony.seo?.description?.en ?? ceremony.summary.en;

  return pageMetadata("en", title, `/ceremonies/${ceremony.slug}`, {
    description,
  });
}

export default async function CeremonyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "en") notFound();
  const ceremony = loadCeremonyBySlug(slug);
  if (!ceremony) notFound();

  const mode = getExperienceMode(ceremony);
  const allCeremonies = loadCeremonies();
  const packages = loadPackages().filter((p) => p.ceremonySlugs.includes(ceremony.slug));
  const venues = loadPerthVenues().filter((v) => v.suitableFor.includes(ceremony.slug));
  const related = (ceremony.relatedSlugs ?? [])
    .map((relSlug) => allCeremonies.find((c) => c.slug === relSlug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const schemas: unknown[] = [
    buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Ceremonies", path: "/ceremonies" },
      { name: ceremony.name.en, path: `/ceremonies/${ceremony.slug}` },
    ]),
    buildCeremonyServiceJsonLd({
      name: ceremony.name.en,
      description: ceremony.summary.en,
      path: `/ceremonies/${ceremony.slug}`,
      includes: ceremony.includes,
    }),
  ];

  if (ceremony.faq && ceremony.faq.length > 0) {
    schemas.push(
      buildFaqPageJsonLd(ceremony.faq.map((f) => ({ question: f.q.en, answer: f.a.en }))),
    );
  }

  return (
    <main
      id="main"
      style={
        mode === "MEMORIAL" ? (getCssVariablesForMode("MEMORIAL") as CSSProperties) : undefined
      }
      data-experience-mode={mode.toLowerCase()}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <div className="wrap section">
        <nav aria-label="Breadcrumb" className="breadcrumb-nav">
          <a href={localePath(locale)}>Home</a>
          <span aria-hidden="true">/</span>
          <a href={localePath(locale, "/ceremonies")}>Ceremonies</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{ceremony.name.en}</span>
        </nav>

        <div className="detail-hero-panel">
          <p className="kicker">
            {mode === "MEMORIAL"
              ? "Memorial Mode · Calm, Dignified Coordination in Perth"
              : `${ceremony.family} · 0-to-100 Event Production in Perth`}
          </p>
          <h1>{ceremony.name.en}</h1>
          <p className="section-lead">{ceremony.summary.en}</p>
          <div className="hero-actions">
            <a className="button" href="#enquiry">
              {mode === "MEMORIAL"
                ? t(locale, "common.talkToUs")
                : t(locale, "marketing.launchEnquire")}
            </a>
            <a
              className="button button-secondary"
              href={localePath(locale, `/perth/${ceremony.slug}`)}
            >
              View {ceremony.name.en} in Perth Guide →
            </a>
          </div>
        </div>

        {ceremony.culturalNotes && (
          <section className="cultural-notes-panel" aria-labelledby="cultural-notes-heading">
            <h2 id="cultural-notes-heading">Cultural & Hospitality Care</h2>
            <p>{ceremony.culturalNotes.en}</p>
          </section>
        )}

        {/* What We Handle */}
        <section className="detail-sub-section" aria-labelledby="includes-heading">
          <h2 id="includes-heading">{t(locale, "marketing.seoWhatWeHandle")}</h2>
          <p className="section-lead">
            Every element below can be included in your custom Perth proposal or combined through
            our RSVP-to-fulfilment logistics bridge.
          </p>
          <div className="includes-grid">
            {ceremony.includes.map((inc) => (
              <div key={inc} className="include-chip">
                <strong>{inc.replace(/-/g, " ").toUpperCase()}</strong>
                <span>Coordinated in-house & with verified WA partners</span>
              </div>
            ))}
          </div>
        </section>

        {/* Typical Run-Sheet Timeline */}
        {ceremony.timelineTemplate && ceremony.timelineTemplate.length > 0 && (
          <section className="detail-sub-section" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading">{t(locale, "marketing.seoTypicalTimeline")}</h2>
            <ol className="timeline-list">
              {ceremony.timelineTemplate.map((step) => {
                const sign = step.offsetMinutes >= 0 ? "+" : "";
                return (
                  <li key={`${step.offsetMinutes}-${step.label.en}`} className="timeline-item">
                    <span className="timeline-offset" dir="ltr">
                      T{sign}
                      {step.offsetMinutes} min
                    </span>
                    <strong>{step.label.en}</strong>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Matching Packages */}
        {packages.length > 0 && (
          <section className="detail-sub-section" aria-labelledby="packages-heading">
            <h2 id="packages-heading">{t(locale, "marketing.seoMatchingPackages")}</h2>
            <div className="venues-grid">
              {packages.map((pkg) => (
                <article key={pkg.slug} className="venue-card">
                  <div>
                    <div className="venue-card-meta">
                      <span>{pkg.tier ?? "CUSTOM"} TIER</span>
                      <span dir="ltr">
                        {pkg.guestMin}–{pkg.guestMax} guests
                      </span>
                    </div>
                    <h3>
                      <a href={localePath(locale, `/packages/${pkg.slug}`)}>{pkg.name.en}</a>
                    </h3>
                    <p className="venue-cap">
                      {pkg.fromPriceIncGstCents > 0
                        ? `From $${Math.round(pkg.fromPriceIncGstCents / 100).toLocaleString("en-AU")} AUD (${t(locale, "common.inclGst")})`
                        : t(locale, "marketing.seoPriceOnRequest")}
                    </p>
                    <ul className="pkg-inclusions-list">
                      {pkg.inclusions.map((inc) => (
                        <li key={inc.label.en}>{inc.label.en}</li>
                      ))}
                    </ul>
                  </div>
                  <a className="venue-ask" href={localePath(locale, `/packages/${pkg.slug}`)}>
                    View package inclusions →
                  </a>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Suggested Perth Venues */}
        {venues.length > 0 && (
          <section className="detail-sub-section" aria-labelledby="venues-heading">
            <h2 id="venues-heading">{t(locale, "marketing.seoSuitableVenues")}</h2>
            <div className="venues-grid">
              {venues.map((venue) => (
                <article key={venue.slug} className="venue-card">
                  <div>
                    <div className="venue-card-meta">
                      <span>{venue.area}</span>
                      <span className="venue-type">{venue.type.replace("_", " ")}</span>
                    </div>
                    <h3>
                      <a href={localePath(locale, `/venues/${venue.slug}`)}>{venue.name.en}</a>
                    </h3>
                    {venue.notes && <p className="venue-cap">{venue.notes.en}</p>}
                  </div>
                  <a className="venue-ask" href={localePath(locale, `/venues/${venue.slug}`)}>
                    Inspect venue guidelines →
                  </a>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Ceremony FAQ */}
        {ceremony.faq && ceremony.faq.length > 0 && (
          <section className="detail-sub-section" aria-labelledby="faq-heading">
            <h2 id="faq-heading">{t(locale, "marketing.seoFaqHeading")}</h2>
            <div className="faq-grid">
              {ceremony.faq.map((item) => (
                <article key={item.q.en} className="faq-card">
                  <h3>{item.q.en}</h3>
                  <p>{item.a.en}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Related Ceremonies */}
        {related.length > 0 && (
          <section className="detail-sub-section" aria-labelledby="related-heading">
            <h2 id="related-heading">{t(locale, "marketing.seoRelatedCeremonies")}</h2>
            <div className="related-links-row">
              {related.map((rel) => (
                <a
                  key={rel.slug}
                  className="button button-secondary"
                  href={localePath(locale, `/ceremonies/${rel.slug}`)}
                >
                  {rel.name.en}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Enquiry Section */}
        <section id="enquiry" className="detail-sub-section enquiry">
          <div className="enquiry-sidebar">
            <p className="kicker">{t(locale, "marketing.launchLocation")}</p>
            <h2>
              {mode === "MEMORIAL"
                ? t(locale, "marketing.memorialSupportPromise")
                : `Start planning your ${ceremony.name.en.toLowerCase()}`}
            </h2>
            <p>{t(locale, "marketing.launchFormIntro")}</p>
          </div>
          <div className="enquiry-form-card">
            <EnquiryForm
              locale={locale}
              venues={venues.map((v) => ({ slug: v.slug, name: v.name }))}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
