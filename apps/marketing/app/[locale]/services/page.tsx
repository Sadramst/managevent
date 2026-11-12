import { notFound } from "next/navigation";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/seo-schema";
import { localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata(
    "en",
    "0-to-100 Event Services: Planning, Styling, Catering & Hire Perth",
    "/services",
    {
      description:
        "Discover Managevent's 6 core event service pillars in Perth, WA: Venue Sourcing & Permits, Bespoke Styling & Florals, Catering & RSA Bar, Marquee/Furniture/AV Hire, Entertainment & Photography, and Digital Invitations.",
    },
  );
}

const SERVICE_PILLARS = [
  {
    num: "01",
    slug: "planning-venues",
    title: "Venue Sourcing, Council Permits & Run-Sheet Production",
    summary:
      "We shortlist and inspect Swan Valley wineries, Kings Park and Matilda Bay foreshore reserves, Fremantle heritage spaces, local council community halls (Joondalup, Canning, Melville, Stirling) and private home sites.",
    deliverables: [
      "Botanic Gardens & local council reserve permit applications",
      "Scaled CAD floorplans, wet-weather marquee backups & bump-in schedules",
      "Public liability insurance compliance ($20M cover) & vendor coordination",
      "Dedicated on-the-day Lead Event Coordinator & pack-down crew",
    ],
  },
  {
    num: "02",
    slug: "styling-florals",
    title: "Bespoke Ceremony Styling, Arches, Florals & Table Design",
    summary:
      "Our Perth styling studio transforms blank halls, outdoor lawns and function rooms with architectural arches, fresh seasonal florals, custom signage, drapery, plinths and tablescapes.",
    deliverables: [
      "Custom wedding & engagement arches, chuppahs, mandaps & cultural stages",
      "Fresh seasonal floral arrangements, bridal bouquets & buttonholes",
      "Balloon garlands, custom neon signage & milestone photo backdrops",
      "Linen napery, charger plates, menus, place cards & candlelit centrepieces",
    ],
  },
  {
    num: "03",
    slug: "catering-bar",
    title: "Catering, Grazing Stations, Halal Menus & RSA Bar Staffing",
    summary:
      "Every guest RSVP feeds directly into our catering logistics engine — ensuring accurate meal counts, individual dietary/allergy separation and compliant WA beverage service.",
    deliverables: [
      "Artisan grazing tables, roaming canapés, banquet feasting & plated dining",
      "Certified Halal, vegetarian, vegan, gluten-free, dairy-free & nut-free protocols",
      "Morning/afternoon tea & savoury finger-food service for wakes and memorials",
      "WA RSA-certified bartenders, mobile bar hire, glassware & ice logistics",
    ],
  },
  {
    num: "04",
    slug: "hire-av",
    title: "Marquee, Furniture, Tableware, Audio-Visual & Lighting Hire",
    summary:
      "One consolidated equipment order delivered, installed and collected by our crew — sized automatically from your confirmed guest count.",
    deliverables: [
      "Clear-span backyard marquees, flooring, festoon lighting & outdoor heaters",
      "Banquet tables, bentwood/Tiffany/americana chairs, cocktail high-bars & lounges",
      "Battery-powered ceremony PA systems (for Kings Park & foreshore reserves)",
      "Wireless microphones, tribute projection screens, stage lighting & dancefloors",
    ],
  },
  {
    num: "05",
    slug: "cakes-photo-entertainment",
    title: "Custom Cakes, Photography, Videography & Live Entertainment",
    summary:
      "Vetted Perth creative specialists briefed on your run-sheet, cultural traditions and family portrait list before event day.",
    deliverables: [
      "Custom celebration cakes, dessert towers & cultural sweet tables",
      "Documentary & editorial event photography, drone & highlight videography",
      "Acoustic ceremony musicians, string quartets, MCs & reception DJs",
      "WWC-checked children's entertainers, face painting & lawn games",
    ],
  },
  {
    num: "06",
    slug: "invitations-bridge",
    title: "Digital Invitations & RSVP-to-Catering Logistics Bridge",
    summary:
      "Hosted on invitation.managevent.com.au, our digital invitation studio turns guest responses into live catering, seating and equipment numbers.",
    deliverables: [
      "Household-aware RSVPs (+1s, children, multi-stage ceremony/reception attendance)",
      "Field-level AES-256-GCM encrypted dietary & allergy notes with 30-day auto-purge",
      "QR check-in passes, Apple/Google ICS calendar files & directions maps",
      "Live caterer & hire fulfilment sheet exported straight to your Perth event crew",
    ],
  },
];

const SERVICES_FAQS = [
  {
    question: "Can I book a single service, or do I have to book a full 0-to-100 package?",
    answer:
      "Managevent specialises in integrated multi-service events where planning, styling, hire and catering work together under one point of contact. However, you can select Essential, Signature or Luxe tiers in our Instant Cost Estimator to dial up or down the exact services you need.",
  },
  {
    question: "How does Managevent handle dietary allergies and Halal catering in Perth?",
    answer:
      "When guests RSVP via your digital invitation link, they log specific dietary and allergy requirements for each member of their household. Those requirements are encrypted at rest, summarised into your kitchen production sheet, and clearly labelled at the buffet or table on event day.",
  },
  {
    question: "Do you supply battery-powered sound systems for Perth parks without mains power?",
    answer:
      "Yes. For outdoor ceremonies at Kings Park, Matilda Bay, Cottesloe and local foreshore reserves where generators are restricted, we supply professional battery-powered PA systems and wireless lapel/handheld microphones.",
  },
];

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "0-to-100 Services", path: "/services" },
  ]);
  const faqSchema = buildFaqPageJsonLd(SERVICES_FAQS);

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
        <span aria-current="page">Services</span>
      </nav>

      <div className="section-head">
        <p className="kicker">Perth & Western Australia · Single Point of Accountability</p>
        <h1>0-to-100 Event Services: Every detail under one roof</h1>
        <p className="section-lead">
          Instead of juggling ten separate Perth suppliers, deposits and delivery windows,
          Managevent coordinates your venue, styling, florals, catering, equipment hire,
          entertainment and digital invitations as one cohesive production.
        </p>
      </div>

      <div className="services-grid">
        {SERVICE_PILLARS.map((pillar) => (
          <article key={pillar.slug} className="service-card">
            <span className="service-num">{pillar.num}</span>
            <h2>{pillar.title}</h2>
            <p>{pillar.summary}</p>
            <ul className="pkg-inclusions-list">
              {pillar.deliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section className="detail-sub-section">
        <h2>Frequently asked questions about our Perth event services</h2>
        <div className="faq-grid">
          {SERVICES_FAQS.map((faq) => (
            <article key={faq.question} className="faq-card">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="section-cta-row">
        <a className="button" href={localePath(locale, "/packages")}>
          Browse Curated Packages →
        </a>
        <a className="button button-secondary" href={localePath(locale, "/#estimator")}>
          Open Instant Cost Estimator →
        </a>
      </div>
    </main>
  );
}
