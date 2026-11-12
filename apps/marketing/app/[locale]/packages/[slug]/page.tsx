import { notFound } from "next/navigation";
import { getExperienceMode, t } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { EnquiryForm } from "../../../../components/enquiry-form";
import {
  loadCeremonies,
  loadPackageBySlug,
  loadPackages,
  loadPerthVenues,
} from "../../../../lib/content";
import { buildBreadcrumbJsonLd } from "../../../../lib/seo-schema";
import { localePath, pageMetadata } from "../../../../lib/site";

export function generateStaticParams() {
  return loadPackages().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "en") notFound();
  const pkg = loadPackageBySlug(slug);
  if (!pkg) notFound();

  return pageMetadata("en", `${pkg.name.en} Package`, `/packages/${pkg.slug}`, {
    description: `${pkg.name.en} (${pkg.tier ?? "ESSENTIAL"} tier) for ${pkg.guestMin}–${pkg.guestMax} guests in Perth, WA. Includes ${pkg.inclusions.map((i) => i.label.en).join(", ")}.`,
  });
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "en") notFound();
  const pkg = loadPackageBySlug(slug);
  if (!pkg) notFound();

  const isMemorial = pkg.ceremonySlugs.some((cSlug) => getExperienceMode(cSlug) === "MEMORIAL");
  const mode = isMemorial ? "MEMORIAL" : "CELEBRATION";
  const ceremonies = loadCeremonies().filter((c) => pkg.ceremonySlugs.includes(c.slug));
  const venues = loadPerthVenues().filter((v) =>
    v.suitableFor.some((s) => pkg.ceremonySlugs.includes(s)),
  );

  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Packages", path: "/packages" },
    { name: pkg.name.en, path: `/packages/${pkg.slug}` },
  ]);

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="wrap section">
        <nav aria-label="Breadcrumb" className="breadcrumb-nav">
          <a href={localePath(locale)}>Home</a>
          <span aria-hidden="true">/</span>
          <a href={localePath(locale, "/packages")}>Packages</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{pkg.name.en}</span>
        </nav>

        <div className="detail-hero-panel">
          <p className="kicker">
            {pkg.tier ?? "ESSENTIAL"} TIER · {pkg.guestMin} to {pkg.guestMax} Guests · Perth WA
          </p>
          <h1>{pkg.name.en}</h1>
          <p className="section-lead">
            {pkg.fromPriceIncGstCents > 0
              ? `From $${Math.round(pkg.fromPriceIncGstCents / 100).toLocaleString("en-AU")} AUD (${t(locale, "common.inclGst")})`
              : t(locale, "marketing.seoPriceOnRequest")}
          </p>
          <div className="hero-actions">
            <a className="button" href="#enquiry">
              {mode === "MEMORIAL" ? t(locale, "common.talkToUs") : "Request a tailored proposal"}
            </a>
            <a className="button button-secondary" href={localePath(locale, "/#estimator")}>
              Calculate Guest Estimate →
            </a>
          </div>
        </div>

        <section className="detail-sub-section" aria-labelledby="inclusions-heading">
          <h2 id="inclusions-heading">Package Inclusions</h2>
          <div className="services-grid">
            {pkg.inclusions.map((inc) => (
              <article key={inc.label.en} className="service-card">
                <span className="kicker">{inc.category.toUpperCase()}</span>
                <h3>{inc.label.en}</h3>
                <p>
                  {inc.qtyRule === "per-guest"
                    ? "Automatically scaled to your confirmed RSVP headcount via the Managevent Logistics Bridge."
                    : "Coordinated end to end by your dedicated Perth event producer."}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="detail-sub-section" aria-labelledby="payment-schedule-heading">
          <h2 id="payment-schedule-heading">Milestone Payment Schedule & Consumer Law Clarity</h2>
          <p className="section-lead">
            All Managevent proposals and ATO tax invoices are issued in Australian dollars (AUD)
            inclusive of 10% GST. Nothing in our terms excludes your statutory rights under the
            Australian Consumer Law.
          </p>
          <div className="services-grid">
            <article className="service-card">
              <h3>1. Booking Deposit ({pkg.depositRule?.percent ?? 25}%)</h3>
              <p>
                Secures your event date, coordinator and core Perth styling/hire inventory (minimum{" "}
                <span dir="ltr">
                  ${Math.round((pkg.depositRule?.minCents ?? 50000) / 100).toLocaleString("en-AU")}{" "}
                  AUD
                </span>
                ).
              </p>
            </article>
            <article className="service-card">
              <h3>2. Planning Milestone (50%)</h3>
              <p>
                Due 8 weeks prior to the event as supplier run-sheets, floorplans and catering menus
                are locked in.
              </p>
            </article>
            <article className="service-card">
              <h3>3. Final Balance (T-7 Days)</h3>
              <p>
                Adjusted to your confirmed guest RSVPs at T-14 days and settled 7 days prior to
                event delivery.
              </p>
            </article>
          </div>
        </section>

        {ceremonies.length > 0 && (
          <section className="detail-sub-section" aria-labelledby="suited-ceremonies-heading">
            <h2 id="suited-ceremonies-heading">Suited Ceremonies</h2>
            <div className="related-links-row">
              {ceremonies.map((c) => (
                <a
                  key={c.slug}
                  className="button button-secondary"
                  href={localePath(locale, `/ceremonies/${c.slug}`)}
                >
                  {c.name.en}
                </a>
              ))}
            </div>
          </section>
        )}

        <section id="enquiry" className="detail-sub-section enquiry">
          <div className="enquiry-sidebar">
            <p className="kicker">{t(locale, "marketing.launchLocation")}</p>
            <h2>Enquire about {pkg.name.en}</h2>
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
