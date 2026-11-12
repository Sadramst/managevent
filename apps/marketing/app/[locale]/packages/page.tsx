import { notFound } from "next/navigation";
import { getExperienceMode, t } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { loadPackages } from "../../../lib/content";
import { buildBreadcrumbJsonLd } from "../../../lib/seo-schema";
import { localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata("en", "Event & Ceremony Packages Catalogue", "/packages", {
    description:
      "Compare Managevent 0-to-100 ceremony and event packages in Perth, WA. Weddings, engagements, milestone birthdays, corporate galas, council hall transformations and memorials.",
  });
}

export default async function PackagesHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const packages = loadPackages();
  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Packages", path: "/packages" },
  ]);

  return (
    <main id="main" className="wrap section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <nav aria-label="Breadcrumb" className="breadcrumb-nav">
        <a href={localePath(locale)}>Home</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Packages</span>
      </nav>

      <div className="section-head">
        <p className="kicker">Transparent Australian Consumer Law Pricing (AUD incl. GST)</p>
        <h1>Perth event & ceremony packages</h1>
        <p className="section-lead">
          Each package combines dedicated Perth coordination, styling, hire, catering management and
          our digital RSVP-to-fulfilment bridge. Customise any package for your guest count or use
          our Instant Cost Estimator.
        </p>
      </div>

      <div className="venues-grid">
        {packages.map((pkg) => {
          const isMemorial = pkg.ceremonySlugs.some(
            (slug) => getExperienceMode(slug) === "MEMORIAL",
          );
          return (
            <article
              key={pkg.slug}
              className="venue-card"
              style={isMemorial ? (getCssVariablesForMode("MEMORIAL") as CSSProperties) : undefined}
              data-experience-mode={isMemorial ? "memorial" : "celebration"}
            >
              <div>
                <div className="venue-card-meta">
                  <span>{pkg.tier ?? "ESSENTIAL"} TIER</span>
                  <span dir="ltr">
                    {pkg.guestMin}–{pkg.guestMax} guests
                  </span>
                </div>
                <h2>
                  <a href={localePath(locale, `/packages/${pkg.slug}`)}>{pkg.name.en}</a>
                </h2>
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
                <div className="venue-tags">
                  {pkg.ceremonySlugs.map((slug) => (
                    <span key={slug} className="venue-tag">
                      {slug.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
              <div className="venue-card-actions">
                <a className="venue-ask" href={localePath(locale, `/packages/${pkg.slug}`)}>
                  View package details & deposit schedule →
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <div className="section-cta-row">
        <a className="button" href={localePath(locale, "/#estimator")}>
          Open Instant Cost Estimator →
        </a>
        <a className="button button-secondary" href={localePath(locale, "/pricing")}>
          Read Pricing, Deposit & GST Rules →
        </a>
      </div>
    </main>
  );
}
