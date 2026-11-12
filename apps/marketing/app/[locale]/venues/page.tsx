import { notFound } from "next/navigation";
import { t } from "@managevent/i18n";
import { loadPerthVenues } from "../../../lib/content";
import { buildBreadcrumbJsonLd } from "../../../lib/seo-schema";
import { localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata("en", "Perth Event Venues, Council Halls & Outdoor Reserves", "/venues", {
    description:
      "Explore Perth event venues, Swan Valley wineries, Kings Park & Matilda Bay foreshore ceremony settings, Fremantle heritage spaces, council community halls, and private home marquee setups.",
  });
}

export default async function VenuesHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const venues = loadPerthVenues();
  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Perth Venues", path: "/venues" },
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
        <span aria-current="page">Venues</span>
      </nav>

      <div className="section-head">
        <p className="kicker">Perth & Western Australia · Venue Sourcing & Styling</p>
        <h1>Perth event venues, parks & community halls</h1>
        <p className="section-lead">
          From Swan Valley vineyard estates and Kings Park foreshore lawns to Fremantle heritage
          warehouses, local council halls (Joondalup, Canning, Melville) and luxury backyard
          marquees at your own home — Managevent coordinates venue permits, floorplans, styling,
          catering and pack-down across metropolitan Perth.
        </p>
      </div>

      <p className="venue-note">{t(locale, "marketing.seoPlaceholderPartnerBadge")}</p>

      <div className="venues-grid">
        {venues.map((venue) => {
          const maxCap = Math.max(
            venue.capacity?.banquet ?? 0,
            venue.capacity?.cocktail ?? 0,
            venue.capacity?.rounds ?? 0,
            venue.capacity?.theatre ?? 0,
          );
          return (
            <article key={venue.slug} className="venue-card">
              <div>
                <div className="venue-card-meta">
                  <span>{venue.area}</span>
                  <span className="venue-type">{venue.type.replace(/_/g, " ")}</span>
                </div>
                <h2>
                  <a href={localePath(locale, `/venues/${venue.slug}`)}>{venue.name.en}</a>
                </h2>
                <p className="venue-cap">
                  {maxCap > 0 ? `Up to ${maxCap} guests` : "Flexible capacity"} ·{" "}
                  {venue.indoorOutdoor ?? "INDOOR / OUTDOOR"}
                  {venue.accessible ? " · Wheelchair accessible" : ""}
                </p>
                {venue.notes?.en && <p className="venue-cap">{venue.notes.en}</p>}
                <div className="venue-tags">
                  {venue.suitableFor.slice(0, 5).map((ceremonySlug) => (
                    <span key={ceremonySlug} className="venue-tag">
                      {ceremonySlug.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
              <div className="venue-card-actions">
                <a className="venue-ask" href={localePath(locale, `/venues/${venue.slug}`)}>
                  {t(locale, "marketing.seoViewDetails")} →
                </a>
                <a
                  className="venue-ask"
                  href={`${localePath(locale)}?venue=${encodeURIComponent(venue.slug)}#enquire`}
                >
                  {t(locale, "marketing.launchVenueAsk")} →
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <div className="section-cta-row">
        <a className="button" href={localePath(locale, "/perth")}>
          Explore Perth Local Event Guide →
        </a>
        <a className="button button-secondary" href={localePath(locale, "/#estimator")}>
          Estimate Cost for Your Venue →
        </a>
      </div>
    </main>
  );
}
