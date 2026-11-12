import { notFound } from "next/navigation";
import { loadPerthCity } from "../../../lib/content";
import { buildBreadcrumbJsonLd } from "../../../lib/seo-schema";
import { contact, localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata(
    "en",
    "About Managevent Perth — 0-to-100 Ceremony & Event Specialists",
    "/about",
    {
      description:
        "Learn about Managevent (an Appilico product in Perth, Western Australia): combining local event planning, styling, catering and equipment hire with modern digital RSVP technology.",
    },
  );
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const perth = loadPerthCity();
  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "About Managevent", path: "/about" },
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
        <span aria-current="page">About</span>
      </nav>

      <div className="detail-hero-panel">
        <p className="kicker">Perth, Western Australia · An Appilico Product</p>
        <h1>High-touch Perth hospitality meets connected event technology</h1>
        <p className="section-lead">
          Managevent was founded in Perth, Western Australia to solve the biggest frustration in
          event planning: the disconnect between your digital guest list and the physical reality of
          catering, styling, seating and equipment hire on the day.
        </p>
      </div>

      <section className="detail-sub-section">
        <h2>Our four guiding commitments</h2>
        <div className="includes-grid">
          <div className="include-chip">
            <strong>1. Single Point of Accountability (0 to 100)</strong>
            <span>
              From Kings Park permits and Swan Valley winery timelines to council hall pack-downs,
              one Perth team coordinates every supplier and run-sheet milestone.
            </span>
          </div>
          <div className="include-chip">
            <strong>2. Respectful Dual-Mode Design</strong>
            <span>
              Life holds both joyful celebrations and solemn farewells. Our platform and crew
              operate in Celebration Mode for weddings and milestones, and switch to calm, dignified
              Memorial Mode for wakes and celebrations of life.
            </span>
          </div>
          <div className="include-chip">
            <strong>3. Australian Consumer Law & Privacy First</strong>
            <span>
              All pricing is shown in AUD inclusive of 10% GST. Guest dietary and allergy notes are
              protected with AES-256-GCM encryption and automatically purged 30 days after your
              event under the Australian Privacy Principles.
            </span>
          </div>
          <div className="include-chip">
            <strong>4. Local Perth Expertise</strong>
            <span>
              We know local council noise rules, park reserve booking conditions, WA RSA liquor
              licensing requirements and multicultural dietary expectations across metropolitan
              Perth.
            </span>
          </div>
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>Metropolitan Perth Areas We Serve</h2>
        <p className="section-lead">{perth.localIntro?.en}</p>
        <div className="venue-tags">
          {perth.areasServed.map((area) => (
            <span key={area} className="venue-tag">
              {area}, WA
            </span>
          ))}
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>Acknowledgement of Country</h2>
        <p>
          Managevent acknowledges the Whadjuk Nyoongar people as the Traditional Custodians of the
          lands and waters of Boorloo (Perth) and surrounds where we gather, celebrate and remember.
          We pay our respects to Elders past and present.
        </p>
        <p>
          Direct enquiries:{" "}
          <a href={`mailto:${contact.email}`}>
            <bdi>{contact.email}</bdi>
          </a>
        </p>
      </section>
    </main>
  );
}
