import { notFound } from "next/navigation";
import { loadPackages } from "../../../lib/content";
import { buildBreadcrumbJsonLd } from "../../../lib/seo-schema";
import { localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata(
    "en",
    "Perth Event Pricing, Packages & Transparent GST Guide",
    "/pricing",
    {
      description:
        "Transparent Perth event planning and styling pricing in AUD inclusive of 10% GST. Compare Essential, Signature and Luxe tiers, digital invitation pricing ($0 / $69 AUD) and deposit rules.",
    },
  );
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const packages = loadPackages();
  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Pricing", path: "/pricing" },
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
        <span aria-current="page">Pricing</span>
      </nav>

      <div className="section-head">
        <p className="kicker">Australian Consumer Law Compliant · AUD Inclusive of 10% GST</p>
        <h1>Transparent Perth event & invitation pricing</h1>
        <p className="section-lead">
          No drip pricing, no unexpected weekend surcharges, and no vague supplier markups. Every
          Managevent estimate and package is quoted in Australian dollars (AUD) inclusive of GST.
        </p>
      </div>

      <section className="detail-sub-section">
        <h2>1. Full-Service Perth Event Tiers (0 to 100)</h2>
        <div className="venues-grid">
          <article className="venue-card">
            <div>
              <div className="venue-card-meta">
                <span>ESSENTIAL TIER</span>
                <span>40–150 guests</span>
              </div>
              <h3>Essential Coordination & Styling</h3>
              <p className="venue-cap">From ~$95 AUD per guest (incl. GST)</p>
              <ul className="pkg-inclusions-list">
                <li>Dedicated Perth event coordinator & run-sheet</li>
                <li>Signature arch backdrop, welcome signage & table styling</li>
                <li>Artisan grazing station or finger-food catering</li>
                <li>Digital invitation suite with dietary tracking included</li>
                <li>Full crew bump-in and post-event pack-down</li>
              </ul>
            </div>
            <div className="venue-card-actions">
              <a className="venue-ask" href={localePath(locale, "/#estimator")}>
                Model Essential Tier in Estimator →
              </a>
            </div>
          </article>

          <article className="venue-card">
            <div>
              <div className="venue-card-meta">
                <span>SIGNATURE TIER</span>
                <span>50–250 guests</span>
              </div>
              <h3>Signature 0-to-100 Production</h3>
              <p className="venue-cap">From ~$155 AUD per guest (incl. GST)</p>
              <ul className="pkg-inclusions-list">
                <li>Everything in Essential plus full banquet or cocktail menu</li>
                <li>Fresh seasonal florals, napery, furniture & lighting hire</li>
                <li>WA RSA-certified bar staff & glassware logistics</li>
                <li>Professional PA audio, wireless mics & DJ/acoustic music</li>
                <li>Premium Digital Invitation Pass ($69 value) included</li>
              </ul>
            </div>
            <div className="venue-card-actions">
              <a className="venue-ask" href={localePath(locale, "/#estimator")}>
                Model Signature Tier in Estimator →
              </a>
            </div>
          </article>

          <article className="venue-card">
            <div>
              <div className="venue-card-meta">
                <span>LUXE TIER</span>
                <span>60–400 guests</span>
              </div>
              <h3>Luxe Bespoke Estate & Ballroom</h3>
              <p className="venue-cap">From ~$230 AUD per guest (incl. GST)</p>
              <ul className="pkg-inclusions-list">
                <li>Custom architectural installations, ceiling drapery & florals</li>
                <li>Multi-course plated dining or luxury feasting stations</li>
                <li>Clear-span marquee or full ballroom AV production</li>
                <li>Photography, highlight videography & live musicians</li>
                <li>White-glove concierge guest & household RSVP management</li>
              </ul>
            </div>
            <div className="venue-card-actions">
              <a className="venue-ask" href={localePath(locale, "/#estimator")}>
                Model Luxe Tier in Estimator →
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>2. Curated Perth Package Starting Prices</h2>
        <div className="venues-grid">
          {packages.map((pkg) => (
            <article key={pkg.slug} className="venue-card">
              <div>
                <div className="venue-card-meta">
                  <span>{pkg.tier ?? "PACKAGE"}</span>
                  <span dir="ltr">
                    {pkg.guestMin}–{pkg.guestMax} guests
                  </span>
                </div>
                <h3>
                  <a href={localePath(locale, `/packages/${pkg.slug}`)}>{pkg.name.en}</a>
                </h3>
                <p className="venue-cap">
                  From ${Math.round(pkg.fromPriceIncGstCents / 100).toLocaleString("en-AU")} AUD
                  (incl. GST)
                </p>
                {pkg.depositRule?.percent && (
                  <p className="venue-cap">
                    Standard booking deposit: {pkg.depositRule.percent}% to lock date & crew.
                  </p>
                )}
              </div>
              <div className="venue-card-actions">
                <a className="venue-ask" href={localePath(locale, `/packages/${pkg.slug}`)}>
                  View package breakdown →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>3. Milestone Payment Schedule & Consumer Guarantees</h2>
        <div className="includes-grid">
          <div className="include-chip">
            <strong>20%–25% Booking Deposit</strong>
            <span>Secures your Perth date, Lead Event Coordinator, styling inventory and venue permit preparation.</span>
          </div>
          <div className="include-chip">
            <strong>50% Progress Milestone (30 Days Prior)</strong>
            <span>Confirms catering menu, floral orders, marquee/furniture hire and audio-visual production schedule.</span>
          </div>
          <div className="include-chip">
            <strong>Final Balance (14 Days Prior)</strong>
            <span>Reconciled against your locked RSVP headcount and dietary matrix from your digital invitation suite.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
