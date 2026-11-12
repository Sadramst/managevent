import { notFound } from "next/navigation";
import { t } from "@managevent/i18n";
import { loadCeremonies, loadPerthVenues, loadVenueBySlug } from "../../../../lib/content";
import { buildBreadcrumbJsonLd, buildVenuePlaceJsonLd } from "../../../../lib/seo-schema";
import { localePath, pageMetadata } from "../../../../lib/site";

export function generateStaticParams() {
  return loadPerthVenues().map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "en") notFound();
  const venue = loadVenueBySlug(slug);
  if (!venue) notFound();

  return pageMetadata("en", `${venue.name.en} (${venue.area}) — Event Styling & Hire`, `/venues/${venue.slug}`, {
    description:
      venue.notes?.en ??
      `Plan, style and coordinate your ceremony or celebration at ${venue.name.en} in ${venue.area}, Perth WA with Managevent.`,
  });
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (locale !== "en") notFound();
  const venue = loadVenueBySlug(slug);
  if (!venue) notFound();

  const allCeremonies = loadCeremonies();
  const suitableCeremonies = allCeremonies.filter((c) => venue.suitableFor.includes(c.slug));

  const maxCapacity = Math.max(
    venue.capacity?.banquet ?? 0,
    venue.capacity?.cocktail ?? 0,
    venue.capacity?.rounds ?? 0,
    venue.capacity?.theatre ?? 0,
  );

  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Perth Venues", path: "/venues" },
    { name: venue.name.en, path: `/venues/${venue.slug}` },
  ]);

  const placeSchema = buildVenuePlaceJsonLd({
    name: venue.name.en,
    description:
      venue.notes?.en ??
      `Event setting in ${venue.area}, Perth WA coordinated by Managevent.`,
    area: venue.area,
    path: `/venues/${venue.slug}`,
    ...(venue.geo ? { lat: venue.geo.lat, lng: venue.geo.lng } : {}),
    ...(maxCapacity > 0 ? { maxCapacity } : {}),
    ...(typeof venue.accessible === "boolean" ? { accessible: venue.accessible } : {}),
  });

  return (
    <main id="main" className="wrap section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />

      <nav aria-label="Breadcrumb" className="breadcrumb-nav">
        <a href={localePath(locale)}>Home</a>
        <span aria-hidden="true">/</span>
        <a href={localePath(locale, "/venues")}>Venues</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{venue.name.en}</span>
      </nav>

      <div className="detail-hero-panel">
        <p className="kicker">
          {venue.area}, Western Australia · {venue.type.replace(/_/g, " ")}
        </p>
        <h1>{venue.name.en}</h1>
        <p className="section-lead">
          {venue.notes?.en ??
            `Full 0-to-100 event styling, furniture hire, catering and on-the-day coordination for ${venue.name.en} in ${venue.area}.`}
        </p>
        {venue.partnerStatus === "placeholder" && (
          <p className="venue-note">
            Note: Representative Perth venue category profile. Managevent works as your independent
            event planner and stylist across council reserves, halls, private estates and function
            centres in {venue.area}.
          </p>
        )}
        <div className="hero-actions">
          <a
            className="button"
            href={`${localePath(locale)}?venue=${encodeURIComponent(venue.slug)}#enquire`}
          >
            Enquire About This Venue Setting →
          </a>
          <a className="button button-secondary" href={localePath(locale, "/#estimator")}>
            Calculate Event Budget →
          </a>
        </div>
      </div>

      <section className="detail-sub-section">
        <h2>Capacity, layout & site specifications</h2>
        <div className="includes-grid">
          {venue.capacity?.banquet && (
            <div className="include-chip">
              <strong>Banquet Capacity: {venue.capacity.banquet} guests</strong>
              <span>Seated dining with full table styling, linen and catering service.</span>
            </div>
          )}
          {venue.capacity?.cocktail && (
            <div className="include-chip">
              <strong>Cocktail Capacity: {venue.capacity.cocktail} guests</strong>
              <span>Standing soirée with grazing stations, bar service and lounge pods.</span>
            </div>
          )}
          {venue.capacity?.rounds && (
            <div className="include-chip">
              <strong>Round Tables: {venue.capacity.rounds} guests</strong>
              <span>Banquet rounds with centrepieces and clear dancefloor sightlines.</span>
            </div>
          )}
          {venue.capacity?.theatre && (
            <div className="include-chip">
              <strong>Ceremony / Theatre: {venue.capacity.theatre} guests</strong>
              <span>Structured ceremony seating with aisle runner, arch and acoustic PA.</span>
            </div>
          )}
          <div className="include-chip">
            <strong>Setting: {venue.indoorOutdoor ?? "FLEXIBLE"}</strong>
            <span>
              {venue.accessible
                ? "Step-free / wheelchair-accessible guest entry available."
                : "Site access assessed during pre-event site inspection."}
            </span>
          </div>
          {venue.rules && (
            <div className="include-chip">
              <strong>Permits, Curfew & Rules</strong>
              <span>
                {venue.rules.curfew ? `Curfew: ${venue.rules.curfew}. ` : ""}
                {venue.rules.byo ? "BYO beverage options supported with RSA bar crew. " : ""}
                {venue.rules.permitRequired ? "Council or park authority booking required. " : ""}
                {venue.rules.permitNotes?.en ?? venue.rules.noiseNotes?.en ?? "Standard WA venue rules apply."}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>Ceremonies & celebrations suited to {venue.name.en}</h2>
        <div className="venues-grid">
          {suitableCeremonies.map((ceremony) => (
            <article key={ceremony.slug} className="venue-card">
              <div>
                <div className="venue-card-meta">
                  <span>{ceremony.family}</span>
                  <span> Perth 0-to-100</span>
                </div>
                <h3>
                  <a href={localePath(locale, `/ceremonies/${ceremony.slug}`)}>
                    {ceremony.name.en}
                  </a>
                </h3>
                <p className="venue-cap">{ceremony.summary.en}</p>
              </div>
              <div className="venue-card-actions">
                <a className="venue-ask" href={localePath(locale, `/ceremonies/${ceremony.slug}`)}>
                  {t(locale, "marketing.seoViewDetails")} →
                </a>
                <a className="venue-ask" href={localePath(locale, `/perth/${ceremony.slug}`)}>
                  Perth {ceremony.name.en} →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
