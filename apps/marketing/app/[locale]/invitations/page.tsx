import { notFound } from "next/navigation";
import { invitationUrl, localePath, pageMetadata } from "../../../lib/site";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/seo-schema";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata(
    "en",
    "Digital Event Invitations & Live RSVP-to-Catering Bridge",
    "/invitations",
    {
      description:
        "Create bespoke digital invitations for weddings, milestone birthdays, cultural ceremonies and memorials in Perth. Live household RSVPs, encrypted dietary tracking and automatic catering sizing.",
    },
  );
}

const INVITATION_FAQS = [
  {
    question: "How much does a Managevent digital invitation cost?",
    answer:
      "You can start with our Free tier (up to 40 guests), upgrade to the Premium Event Pass for $69 AUD (incl. GST) per event with unlimited guests and dietary-to-catering sync, or receive the Premium Pass included automatically when you book a full Managevent Perth package. All Memorial & Celebration of Life invitations are 100% complimentary.",
  },
  {
    question: "Are guest RSVP links indexed by Google?",
    answer:
      "Never. Every private guest invitation link (/i/[slug]) is protected by cryptographically random 128-bit tokens and strict X-Robots-Tag: noindex, nofollow, noarchive headers so your event details remain private.",
  },
  {
    question: "How are guest dietary and allergy details protected?",
    answer:
      "Dietary and health-related requirements are collected with explicit guest consent under the Australian Privacy Act 1988, encrypted at rest using AES-256-GCM, used solely to brief your catering team, and automatically purged 30 days after your event.",
  },
];

export default async function InvitationsProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Digital Invitations", path: "/invitations" },
  ]);
  const faqSchema = buildFaqPageJsonLd(INVITATION_FAQS);

  return (
    <main id="main" className="wrap section">
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
        <span aria-current="page">Digital Invitations</span>
      </nav>

      <div className="detail-hero-panel">
        <p className="kicker">invitation.managevent.com.au · Connected Event Technology</p>
        <h1>Digital invitations that size your catering & hire automatically</h1>
        <p className="section-lead">
          Most digital invitations stop at a spreadsheet. Managevent invitations connect every
          household RSVP, child seat and dietary preference directly to your Perth catering menu,
          table layout and equipment hire schedule.
        </p>
        <div className="hero-actions">
          <a className="button" href={invitationUrl}>
            Open Digital Invitation Studio →
          </a>
          <a className="button button-secondary" href={`${invitationUrl}/templates`}>
            Preview Invitation Templates →
          </a>
        </div>
      </div>

      <section className="detail-sub-section">
        <h2>Transparent Australian Pricing (AUD incl. GST)</h2>
        <div className="venues-grid">
          <article className="venue-card">
            <div>
              <div className="venue-card-meta">
                <span>STARTER TIER</span>
                <span>Up to 40 guests</span>
              </div>
              <h3>Free Invitation</h3>
              <p className="venue-cap">$0 AUD · Ideal for intimate dinners & small gatherings</p>
              <ul className="pkg-inclusions-list">
                <li>Curated English-AU invitation templates</li>
                <li>Shareable link for WhatsApp, SMS & email</li>
                <li>Basic RSVP headcount tracking</li>
                <li>ICS calendar download & venue map link</li>
              </ul>
            </div>
            <div className="venue-card-actions">
              <a className="venue-ask" href={invitationUrl}>
                Start Free →
              </a>
            </div>
          </article>

          <article className="venue-card">
            <div>
              <div className="venue-card-meta">
                <span>MOST POPULAR</span>
                <span>Unlimited guests</span>
              </div>
              <h3>Premium Event Pass</h3>
              <p className="venue-cap">
                $69 AUD (incl. GST) one-off per event · Included free with any Perth event booking
              </p>
              <ul className="pkg-inclusions-list">
                <li>Multi-stage timeline (e.g. Ceremony + Reception)</li>
                <li>Household RSVPs, +1 rules & child seat counts</li>
                <li>Encrypted dietary & allergy matrix for caterers</li>
                <li>QR check-in passes, photo gallery & CSV export</li>
              </ul>
            </div>
            <div className="venue-card-actions">
              <a className="venue-ask" href={invitationUrl}>
                Launch Premium Studio →
              </a>
            </div>
          </article>

          <article className="venue-card" data-experience-mode="memorial">
            <div>
              <div className="venue-card-meta">
                <span>MEMORIAL MODE</span>
                <span>Unlimited guests</span>
              </div>
              <h3>Memorial & Celebration of Life Pass</h3>
              <p className="venue-cap">
                Complimentary ($0 AUD) · Dignified support for Perth families
              </p>
              <ul className="pkg-inclusions-list">
                <li>Calm, respectful Memorial Mode typography & palette</li>
                <li>Service order, chapel/park map & livestream link</li>
                <li>Digital condolence & memory book for family keepsake</li>
                <li>Zero commercial upsells, timers or promotional prompts</li>
              </ul>
            </div>
            <div className="venue-card-actions">
              <a className="venue-ask" href={localePath(locale, "/memorials")}>
                Learn About Memorial Mode →
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>Digital Invitation FAQs</h2>
        <div className="faq-grid">
          {INVITATION_FAQS.map((faq) => (
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
