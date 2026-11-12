import { notFound } from "next/navigation";
import { t } from "@managevent/i18n";
import {
  loadCeremonies,
  loadPackages,
  loadPerthCity,
  loadPerthVenues,
  loadRoutes,
} from "../../../lib/content";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalBusinessJsonLd,
} from "../../../lib/seo-schema";
import { localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata(
    "en",
    "Event Planner & Ceremony Management Perth WA (0 to 100)",
    "/perth",
    {
      description:
        "Managevent is Perth's full-service 0-to-100 event management, ceremony styling, catering coordination, equipment hire and digital invitation specialist across Swan Valley, Kings Park, Fremantle and all Perth suburbs.",
      keywords: [
        "Perth event planner",
        "event management Perth",
        "Perth wedding planner",
        "birthday party packages Perth",
        "wake catering Perth",
        "memorial services Perth",
        "community hall hire styling Perth",
      ],
    },
  );
}

const PERTH_HUB_FAQS = [
  {
    question: "Which areas of metropolitan Perth and Western Australia does Managevent cover?",
    answer:
      "We operate across the entire Perth metropolitan area and Swan Valley, including Perth CBD, West Perth, Subiaco, Nedlands, Crawley, Fremantle, Cottesloe, Scarborough, Stirling, Joondalup, Wanneroo, Swan Valley, Guildford, Midland, Victoria Park, South Perth, Melville, Canning and Rockingham.",
  },
  {
    question: "Do you handle local council permits for Kings Park, Matilda Bay and Perth community halls?",
    answer:
      "Yes. Our Perth team prepares site maps, public liability certificates and run-sheets for Botanic Gardens and Parks Authority reserves as well as suburban council halls across Joondalup, Canning, Melville and Stirling.",
  },
  {
    question: "Can we book both our digital invitations and full on-the-day catering & styling through Managevent Perth?",
    answer:
      "Yes. Managevent is the only Perth event specialist with a built-in digital invitation and RSVP-to-catering bridge — automatically translating guest responses and dietary requirements into your caterer's meal order and equipment hire manifest.",
  },
];

export default async function PerthHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const city = loadPerthCity();
  const ceremonies = loadCeremonies();
  const venues = loadPerthVenues();
  const packages = loadPackages();
  const aliases = loadRoutes().aliases;

  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Perth Events Hub", path: "/perth" },
  ]);
  const localBusinessSchema = buildLocalBusinessJsonLd(city.areasServed);
  const faqSchema = buildFaqPageJsonLd(PERTH_HUB_FAQS);

  return (
    <main id="main" className="wrap section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <nav aria-label="Breadcrumb" className="breadcrumb-nav">
        <a href={localePath(locale)}>Home</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Perth, WA</span>
      </nav>

      <div className="detail-hero-panel">
        <p className="kicker">Perth, Western Australia · AWST (Australia/Perth)</p>
        <h1>Perth Ceremony, Celebration & Event Management — From 0 to 100</h1>
        <p className="section-lead">{city.localIntro?.en}</p>
        <div className="hero-actions">
          <a className="button" href={localePath(locale, "/#estimator")}>
            Open Perth Instant Cost Estimator →
          </a>
          <a className="button button-secondary" href={localePath(locale, "/#enquire")}>
            Request a Perth Coordinator Call →
          </a>
        </div>
      </div>

      <section className="detail-sub-section">
        <h2>Popular Perth Event Searches & Direct Guides</h2>
        <p className="section-lead">
          Jump straight to our most requested Perth event packages and ceremony guides:
        </p>
        <div className="related-links-row">
          {aliases.map((alias) => (
            <a
              key={alias.path}
              className="button button-secondary button-small"
              href={localePath(locale, alias.path)}
            >
              {alias.path.replace("/perth/", "Perth ").replace(/-/g, " ")} →
            </a>
          ))}
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>All 17 Ceremonies & Celebrations We Deliver in Perth</h2>
        <div className="venues-grid">
          {ceremonies.map((ceremony) => (
            <article key={ceremony.slug} className="venue-card">
              <div>
                <div className="venue-card-meta">
                  <span>{ceremony.family}</span>
                  <span>Perth Metro</span>
                </div>
                <h3>
                  <a href={localePath(locale, `/perth/${ceremony.slug}`)}>
                    {ceremony.name.en} in Perth
                  </a>
                </h3>
                <p className="venue-cap">{ceremony.summary.en}</p>
              </div>
              <div className="venue-card-actions">
                <a className="venue-ask" href={localePath(locale, `/perth/${ceremony.slug}`)}>
                  Perth {ceremony.name.en} guide →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>Curated Perth Packages (AUD incl. GST)</h2>
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
                  From ${Math.round(pkg.fromPriceIncGstCents / 100).toLocaleString("en-AU")} AUD (
                  {t(locale, "common.inclGst")})
                </p>
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
        <h2>Perth Venues, Parks & Council Halls We Style</h2>
        <div className="venues-grid">
          {venues.map((venue) => (
            <article key={venue.slug} className="venue-card">
              <div>
                <div className="venue-card-meta">
                  <span>{venue.area}</span>
                  <span>{venue.type.replace(/_/g, " ")}</span>
                </div>
                <h3>
                  <a href={localePath(locale, `/venues/${venue.slug}`)}>{venue.name.en}</a>
                </h3>
                {venue.notes?.en && <p className="venue-cap">{venue.notes.en}</p>}
              </div>
              <div className="venue-card-actions">
                <a className="venue-ask" href={localePath(locale, `/venues/${venue.slug}`)}>
                  Venue guide & capacities →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>Perth Suburbs & Regions Served</h2>
        <div className="venue-tags">
          {city.areasServed.map((area) => (
            <span key={area} className="venue-tag">
              {area}, WA
            </span>
          ))}
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>Perth Event Planning FAQs</h2>
        <div className="faq-grid">
          {PERTH_HUB_FAQS.map((faq) => (
            <article key={faq.question} className="faq-card">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
