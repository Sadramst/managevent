import { notFound } from "next/navigation";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { loadCeremonies, loadPackages } from "../../../lib/content";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/seo-schema";
import { contact, invitationUrl, localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata(
    "en",
    "Memorials, Wakes & Celebrations of Life Perth (Memorial Mode)",
    "/memorials",
    {
      description:
        "Calm, dignified coordination for Celebrations of Life, funeral wakes and memorial gatherings across Perth, WA. Catering, acoustic AV, tribute displays and complimentary memorial invitations.",
    },
  );
}

const MEMORIAL_FAQS = [
  {
    question: "How quickly can Managevent coordinate a wake or celebration of life in Perth?",
    answer:
      "We prioritise memorial enquiries and can arrange wake catering, tea and coffee stations, seating, floral tributes and audio-visual screens within 48 to 72 hours across metropolitan Perth.",
  },
  {
    question: "Does Managevent replace our funeral director?",
    answer:
      "No. Managevent coordinates the hospitality, venue styling, catering, audio-visual tributes and guest logistics for your wake, memorial or celebration of life — working seamlessly alongside your chosen licensed WA funeral director.",
  },
  {
    question: "Is the digital memorial invitation and condolence book really complimentary?",
    answer:
      "Yes. Our Memorial Mode digital notice, RSVP tracker, location map and moderated condolence book are provided free of charge to support grieving families, with zero commercial upsells.",
  },
];

export default async function MemorialsHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const solemnCeremonies = loadCeremonies().filter((c) => c.family === "SOLEMN");
  const memorialPackages = loadPackages().filter((p) =>
    p.ceremonySlugs.some((slug) =>
      ["celebration-of-life", "memorial-service", "wake", "funeral-coordination"].includes(slug),
    ),
  );

  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Memorials & Wakes", path: "/memorials" },
  ]);
  const faqSchema = buildFaqPageJsonLd(MEMORIAL_FAQS);

  return (
    <main
      id="main"
      className="wrap section"
      style={getCssVariablesForMode("MEMORIAL") as CSSProperties}
      data-experience-mode="memorial"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <nav aria-label="Breadcrumb" className="breadcrumb-nav">
        <a href={localePath(locale)}>Home</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Memorials & Celebrations of Life</span>
      </nav>

      <div className="detail-hero-panel">
        <p className="kicker">Perth & Western Australia · Respectful Memorial Mode</p>
        <h1>Dignified support for Celebrations of Life, Wakes & Memorial Gatherings</h1>
        <p className="section-lead">
          When gathering family and friends to honour a loved one, you should not have to worry
          about urns of hot water, sandwich platters, microphone drop-outs or seating layouts. Our
          Perth team quietly manages every practical detail at a garden reserve, community hall,
          function room or private family home.
        </p>
        <div className="cultural-notes-panel">
          <strong>Working Alongside Your Funeral Director</strong>
          <p>
            Managevent coordinates memorial gatherings, wake hospitality, styling, audio-visual
            tributes and family logistics alongside your chosen licensed WA funeral director. We do
            not perform regulated mortuary or statutory funeral-director services.
          </p>
        </div>
        <div className="hero-actions">
          <a
            className="button"
            href={`${localePath(locale)}?ceremony=celebration-of-life#enquire`}
          >
            Request Gentle Coordination Support →
          </a>
          <a className="button button-secondary" href={invitationUrl}>
            Create Complimentary Memorial Notice →
          </a>
        </div>
      </div>

      <section className="detail-sub-section">
        <h2>Memorial & Wake Coordination Services in Perth</h2>
        <div className="venues-grid">
          {solemnCeremonies.map((ceremony) => (
            <article key={ceremony.slug} className="venue-card" data-experience-mode="memorial">
              <div>
                <div className="venue-card-meta">
                  <span>MEMORIAL MODE</span>
                  <span>Perth Metro</span>
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
                  View {ceremony.name.en} details →
                </a>
                <a className="venue-ask" href={localePath(locale, `/perth/${ceremony.slug}`)}>
                  Perth local guide →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {memorialPackages.length > 0 && (
        <section className="detail-sub-section">
          <h2>Transparent Memorial Gathering Packages</h2>
          <div className="venues-grid">
            {memorialPackages.map((pkg) => (
              <article key={pkg.slug} className="venue-card" data-experience-mode="memorial">
                <div>
                  <div className="venue-card-meta">
                    <span>{pkg.tier ?? "ESSENTIAL"}</span>
                    <span dir="ltr">
                      {pkg.guestMin}–{pkg.guestMax} guests
                    </span>
                  </div>
                  <h3>
                    <a href={localePath(locale, `/packages/${pkg.slug}`)}>{pkg.name.en}</a>
                  </h3>
                  <p className="venue-cap">
                    From $
                    {Math.round(pkg.fromPriceIncGstCents / 100).toLocaleString("en-AU")} AUD (incl.
                    GST)
                  </p>
                  <ul className="pkg-inclusions-list">
                    {pkg.inclusions.map((inc) => (
                      <li key={inc.label.en}>{inc.label.en}</li>
                    ))}
                  </ul>
                </div>
                <div className="venue-card-actions">
                  <a className="venue-ask" href={localePath(locale, `/packages/${pkg.slug}`)}>
                    View full package inclusions →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="detail-sub-section">
        <h2>Frequently asked questions for families</h2>
        <div className="faq-grid">
          {MEMORIAL_FAQS.map((faq) => (
            <article key={faq.question} className="faq-card">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
        <p className="venue-note">
          Need urgent short-notice assistance for a Perth wake or memorial service? Email{" "}
          <a href={`mailto:${contact.email}`}>
            <bdi>{contact.email}</bdi>
          </a>{" "}
          and mark your subject line &ldquo;Urgent Memorial Support&rdquo; for priority same-day
          response.
        </p>
      </section>
    </main>
  );
}
