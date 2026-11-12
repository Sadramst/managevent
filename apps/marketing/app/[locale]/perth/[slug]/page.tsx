import { notFound } from "next/navigation";
import { getExperienceMode, t } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import {
  evaluateLocalSeoGuard,
  loadCeremonies,
  loadPackages,
  loadPerthCity,
  loadPerthVenues,
  loadRoutes,
  resolvePerthCeremonyOrAlias,
} from "../../../../lib/content";
import {
  buildBreadcrumbJsonLd,
  buildCeremonyServiceJsonLd,
  buildFaqPageJsonLd,
} from "../../../../lib/seo-schema";
import { invitationUrl, localePath, pageMetadata } from "../../../../lib/site";

export function generateStaticParams() {
  const ceremonySlugs = loadCeremonies().map((c) => ({ slug: c.slug }));
  const aliasSlugs = loadRoutes()
    .aliases.filter((a) => a.path.startsWith("/perth/"))
    .map((a) => ({ slug: a.path.replace(/^\/perth\//, "") }));
  return [...ceremonySlugs, ...aliasSlugs];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "en") notFound();

  const resolved = resolvePerthCeremonyOrAlias(slug);
  if (!resolved || !resolved.ceremony) notFound();

  const { ceremony, canonicalPath } = resolved;
  const guard = evaluateLocalSeoGuard(slug);

  const seoTitle =
    ceremony.seo?.title?.en ?? `${ceremony.name.en} in Perth, WA — 0-to-100 Planning & Styling`;
  const seoDescription =
    ceremony.seo?.description?.en ??
    `${ceremony.summary.en} Planned, styled and coordinated across Perth, Western Australia by Managevent.`;

  return pageMetadata("en", seoTitle, `/perth/${slug}`, {
    description: seoDescription,
    canonicalPath,
    noindex: !guard.passes,
  });
}

export default async function PerthCeremonyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "en") notFound();

  const resolved = resolvePerthCeremonyOrAlias(slug);
  if (!resolved || !resolved.ceremony) notFound();

  const { ceremony, canonicalPath, isAlias, packageFilterSlugs } = resolved;
  const city = loadPerthCity();
  const mode =
    ceremony.experienceMode === "MEMORIAL" ? "MEMORIAL" : getExperienceMode(ceremony.slug);
  const isMemorial = mode === "MEMORIAL";

  const filterSlugs = packageFilterSlugs ?? [ceremony.slug];
  const suitableVenues = loadPerthVenues().filter((v) =>
    v.suitableFor.some((s) => filterSlugs.includes(s) || s === ceremony.slug),
  );
  const matchingPackages = loadPackages().filter((p) =>
    p.ceremonySlugs.some((s) => filterSlugs.includes(s) || s === ceremony.slug),
  );
  const faqs = ceremony.faq ?? [];

  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Perth", path: "/perth" },
    { name: `${ceremony.name.en} in Perth`, path: canonicalPath },
  ]);

  const serviceSchema = buildCeremonyServiceJsonLd({
    name: `${ceremony.name.en} in Perth`,
    description: ceremony.summary.en,
    path: canonicalPath,
    city: "Perth, Western Australia",
    includes: ceremony.includes,
  });

  const faqSchema =
    faqs.length > 0
      ? buildFaqPageJsonLd(
          faqs.map((item) => ({
            question: item.q.en,
            answer: item.a.en,
          })),
        )
      : null;

  return (
    <main
      id="main"
      className="wrap section"
      style={isMemorial ? (getCssVariablesForMode("MEMORIAL") as CSSProperties) : undefined}
      data-experience-mode={isMemorial ? "memorial" : "celebration"}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <nav aria-label="Breadcrumb" className="breadcrumb-nav">
        <a href={localePath(locale)}>Home</a>
        <span aria-hidden="true">/</span>
        <a href={localePath(locale, "/perth")}>Perth</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{ceremony.name.en}</span>
      </nav>

      <div className="detail-hero-panel">
        <p className="kicker">
          Perth, Western Australia ·{" "}
          {isMemorial ? "Respectful Memorial Mode" : "0-to-100 Full-Service Production"}
          {isAlias ? ` · Commercial Guide (${slug.replace(/-/g, " ")})` : ""}
        </p>
        <h1>
          {ceremony.name.en} in {city.name.en}, WA
        </h1>
        <p className="section-lead">{ceremony.summary.en}</p>
        <p>
          Managevent plans, styles, hires and coordinates {ceremony.name.en.toLowerCase()} across
          metropolitan Perth — including {city.areasServed.slice(0, 10).join(", ")} and surrounding
          Western Australian suburbs. Every package is quoted in Australian dollars (AUD) inclusive
          of 10% GST under Australian Consumer Law, with our live RSVP-to-catering logistics bridge
          sizing tables, dietary meals, RSA bar staffing and equipment hire automatically.
        </p>

        {ceremony.culturalNotes?.en && (
          <div className="cultural-notes-panel">
            <strong>
              {isMemorial ? "Working Alongside Your WA Funeral Director" : "Cultural & Local Care"}
            </strong>
            <p>{ceremony.culturalNotes.en}</p>
          </div>
        )}

        <div className="hero-actions">
          <a
            className="button"
            href={`${localePath(locale)}?ceremony=${encodeURIComponent(ceremony.slug)}#enquire`}
          >
            {isMemorial
              ? "Request Gentle Perth Coordination Support →"
              : `Enquire About Perth ${ceremony.name.en} →`}
          </a>
          {!isMemorial && (
            <a className="button button-secondary" href={localePath(locale, "/#estimator")}>
              Calculate Perth Cost Estimate →
            </a>
          )}
          <a className="button button-secondary" href={invitationUrl}>
            {isMemorial
              ? "Create Complimentary Memorial Notice →"
              : "Preview Digital Invitations →"}
          </a>
        </div>
      </div>

      {/* Local Block 1: What We Coordinate in Perth */}
      <section className="detail-sub-section">
        <h2>What our Perth team delivers for {ceremony.name.en}</h2>
        <div className="includes-grid">
          {ceremony.includes.map((inc) => (
            <div key={inc} className="include-chip">
              <strong>Perth {inc.replace(/-/g, " ")}</strong>
              <span>
                Coordinated end-to-end by our local WA crew and sized directly from your confirmed
                guest RSVP count.
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Local Block 2: Perth Packages & Price Note */}
      <section className="detail-sub-section">
        <h2>Perth {ceremony.name.en} Packages & Pricing (AUD incl. GST)</h2>
        {matchingPackages.length > 0 ? (
          <div className="venues-grid">
            {matchingPackages.map((pkg) => (
              <article key={pkg.slug} className="venue-card">
                <div>
                  <div className="venue-card-meta">
                    <span>{pkg.tier ?? "ESSENTIAL"} TIER</span>
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
                    {pkg.inclusions.map((item) => (
                      <li key={item.label.en}>{item.label.en}</li>
                    ))}
                  </ul>
                </div>
                <div className="venue-card-actions">
                  <a className="venue-ask" href={localePath(locale, `/packages/${pkg.slug}`)}>
                    View full package breakdown →
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="section-lead">
            We build tailored AUD (incl. GST) proposals for {ceremony.name.en.toLowerCase()} from 30
            to 350+ guests across Essential, Signature and Luxe tiers. Use our{" "}
            <a href={localePath(locale, "/#estimator")}>Instant Cost Estimator</a> for an immediate
            ballpark range.
          </p>
        )}
      </section>

      {/* Local Block 3: Suitable Perth Venues */}
      {suitableVenues.length > 0 && (
        <section className="detail-sub-section">
          <h2>Recommended Perth Venues & Settings for {ceremony.name.en}</h2>
          <p className="venue-note">{t(locale, "marketing.seoPlaceholderPartnerBadge")}</p>
          <div className="venues-grid">
            {suitableVenues.map((venue) => (
              <article key={venue.slug} className="venue-card">
                <div>
                  <div className="venue-card-meta">
                    <span>{venue.area}</span>
                    <span className="venue-type">{venue.type.replace(/_/g, " ")}</span>
                  </div>
                  <h3>
                    <a href={localePath(locale, `/venues/${venue.slug}`)}>{venue.name.en}</a>
                  </h3>
                  {venue.notes?.en && <p className="venue-cap">{venue.notes.en}</p>}
                </div>
                <div className="venue-card-actions">
                  <a className="venue-ask" href={localePath(locale, `/venues/${venue.slug}`)}>
                    {t(locale, "marketing.seoViewDetails")} →
                  </a>
                  <a
                    className="venue-ask"
                    href={`${localePath(locale)}?venue=${encodeURIComponent(venue.slug)}&ceremony=${encodeURIComponent(ceremony.slug)}#enquire`}
                  >
                    {t(locale, "marketing.launchVenueAsk")} →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Run-sheet Timeline */}
      {ceremony.timelineTemplate && ceremony.timelineTemplate.length > 0 && (
        <section className="detail-sub-section">
          <h2>Sample Perth On-the-Day Run-Sheet</h2>
          <ol className="timeline-list">
            {ceremony.timelineTemplate.map((step) => (
              <li key={step.offsetMinutes} className="timeline-item">
                <span className="timeline-offset" dir="ltr">
                  {step.offsetMinutes < 0
                    ? `${Math.abs(step.offsetMinutes)}m prior`
                    : step.offsetMinutes === 0
                      ? "Start (0m)"
                      : `+${step.offsetMinutes}m`}
                </span>
                <span>{step.label.en}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Local Block 4: Local Perth FAQs */}
      {faqs.length > 0 && (
        <section className="detail-sub-section">
          <h2>Perth {ceremony.name.en} — Frequently Asked Questions</h2>
          <div className="faq-grid">
            {faqs.map((faq) => (
              <article key={faq.q.en} className="faq-card">
                <h3>{faq.q.en}</h3>
                <p>{faq.a.en}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Local Block 5: Areas Served in Perth */}
      <section className="detail-sub-section">
        <h2>Perth Suburbs & Corridors We Serve for {ceremony.name.en}</h2>
        <div className="venue-tags">
          {city.areasServed.map((area) => (
            <span key={area} className="venue-tag">
              {area}, WA
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
