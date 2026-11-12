import { notFound } from "next/navigation";
import { loadCeremonies } from "../../../lib/content";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, type FaqEntry } from "../../../lib/seo-schema";
import { localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata(
    "en",
    "Frequently Asked Questions — Perth Event Planning, Catering & Invitations",
    "/faq",
    {
      description:
        "Answers to common questions about Managevent's 0-to-100 event planning in Perth, WA: pricing in AUD incl. GST, Kings Park & council hall permits, Halal/allergy catering, and digital invitations.",
    },
  );
}

const CORE_FAQS: FaqEntry[] = [
  {
    question: "What does '0 to 100 event management' mean in Perth?",
    answer:
      "It means Managevent takes care of every layer of your ceremony or celebration under one accountable Perth team: venue sourcing and council permits, custom styling and florals, furniture/marquee/AV hire, catering and RSA bar staffing, photography, digital invitations, live RSVP dietary tracking, on-the-day coordination and full pack-down.",
  },
  {
    question: "Are all Managevent prices shown in AUD inclusive of GST?",
    answer:
      "Yes. In compliance with Australian Consumer Law (ACL), every package price and Instant Cost Estimator range on our website is displayed in Australian dollars (AUD) inclusive of 10% GST, with clear milestone payment schedules and no hidden surcharges.",
  },
  {
    question: "How does the Digital Invitation to Catering Bridge work?",
    answer:
      "When your guests RSVP on invitation.managevent.com.au, they confirm attendance for each member of their household, select children's seats, and note any dietary or allergy requirements. Our system automatically calculates exact meal counts, dietary plates, table rounds and glassware quantities for our Perth catering and hire crew.",
  },
  {
    question: "Can you transform a local Perth council community hall into an elegant reception venue?",
    answer:
      "Yes — community hall transformations across the City of Joondalup, City of Canning, City of Melville, Stirling and Fremantle are one of our most popular services. We install freestanding drapery, arch backdrops, banquet linen, warm ambient lighting and full catering, then leave the hall spotless so your council bond is returned in full.",
  },
  {
    question: "How do you protect guest privacy and dietary health data?",
    answer:
      "We comply with the Australian Privacy Principles (APPs) under the Privacy Act 1988 (Cth). Private invitation links carry strict noindex/nofollow headers, and guest dietary or allergy notes are encrypted at rest with AES-256-GCM and automatically purged 30 days after your event.",
  },
  {
    question: "What is Memorial Mode for Celebrations of Life and Wakes?",
    answer:
      "When you plan a Celebration of Life, Wake or Memorial Service with Managevent, our website and digital invitation suite automatically switch into Memorial Mode — using a calm, dignified palette, zero promotional upsells, and a complimentary digital condolence book while we coordinate hospitality alongside your licensed WA funeral director.",
  },
];

export default async function FaqHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const ceremonies = loadCeremonies();
  const ceremonyFaqs: Array<FaqEntry & { ceremonyName: string; ceremonySlug: string }> =
    ceremonies.flatMap((c) =>
      (c.faq ?? []).slice(0, 2).map((item) => ({
        question: item.q.en,
        answer: item.a.en,
        ceremonyName: c.name.en,
        ceremonySlug: c.slug,
      })),
    );

  const allSchemaFaqs: FaqEntry[] = [...CORE_FAQS, ...ceremonyFaqs.slice(0, 14)];

  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "FAQ", path: "/faq" },
  ]);
  const faqSchema = buildFaqPageJsonLd(allSchemaFaqs);

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
        <span aria-current="page">FAQ</span>
      </nav>

      <div className="section-head">
        <p className="kicker">Perth & Western Australia · Transparent Answers</p>
        <h1>Frequently Asked Questions</h1>
        <p className="section-lead">
          Everything you need to know about planning a wedding, milestone birthday, cultural
          ceremony, corporate gala or celebration of life in Perth with Managevent.
        </p>
      </div>

      <section className="detail-sub-section">
        <h2>General Planning, Pricing & Privacy Questions</h2>
        <div className="faq-grid">
          {CORE_FAQS.map((faq) => (
            <article key={faq.question} className="faq-card">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="detail-sub-section">
        <h2>Ceremony-Specific Questions (Perth, WA)</h2>
        <div className="faq-grid">
          {ceremonyFaqs.map((faq) => (
            <article key={`${faq.ceremonySlug}-${faq.question}`} className="faq-card">
              <p className="kicker">
                <a href={localePath(locale, `/ceremonies/${faq.ceremonySlug}`)}>
                  {faq.ceremonyName}
                </a>
              </p>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="section-cta-row">
        <a className="button" href={localePath(locale, "/#enquire")}>
          Ask a Question About Your Date →
        </a>
        <a className="button button-secondary" href={localePath(locale, "/#estimator")}>
          Try the Instant Cost Estimator →
        </a>
      </div>
    </main>
  );
}
