import { notFound } from "next/navigation";
import { buildBreadcrumbJsonLd } from "../../../lib/seo-schema";
import { invitationUrl, localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata(
    "en",
    "How Managevent Works — 0-to-100 Event Planning Process in Perth",
    "/how-it-works",
    {
      description:
        "See how Managevent plans, styles and delivers your Perth event in 5 clear steps: Instant Cost Estimate, Venue & Package Lock-In, Digital Invitations, Live Catering Sync, and On-the-Day Delivery.",
    },
  );
}

const PROCESS_STEPS = [
  {
    step: "Step 01",
    title: "Instant Cost Estimate & Perth Consultation",
    detail:
      "Start with our interactive 0-to-100 Cost Estimator or browse our curated Perth packages. Within one business day, your dedicated Perth coordinator confirms date availability, venue options (winery, foreshore park, heritage hall, council facility or backyard marquee) and a transparent AUD incl. GST proposal.",
  },
  {
    step: "Step 02",
    title: "Venue Permits, Floorplan & Styling Design",
    detail:
      "Once your booking deposit is confirmed, we handle park or council hall permit documentation, design your scaled banquet or cocktail floorplan, and lock in your colour palette, ceremony arch, florals, custom signage and menu selections.",
  },
  {
    step: "Step 03",
    title: "Launch Your Digital Invitation Suite",
    detail:
      "Your bespoke digital invitation goes live on invitation.managevent.com.au (included with your Perth event booking, or available standalone). Share via WhatsApp, SMS or email with household RSVPs, multi-stage ceremony/reception schedules and encrypted dietary fields.",
  },
  {
    step: "Step 04",
    title: "Automatic RSVP-to-Catering & Hire Sizing",
    detail:
      "Fourteen days before event day, your live RSVP dashboard locks final headcounts. Our fulfilment bridge automatically sizes your round tables, chairs, linen, glassware, RSA bar staffing and labelled dietary/allergy meals — eliminating manual spreadsheet errors.",
  },
  {
    step: "Step 05",
    title: "On-the-Day Setup, Coordination & Full Pack-Down",
    detail:
      "Our Perth crew arrives first for bump-in, builds the arches and tablescapes, briefs the caterers and MC, manages the run-sheet so you can be present with your guests, and completes the entire pack-down and cleaning at the end of the event.",
  },
];

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "How It Works", path: "/how-it-works" },
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
        <span aria-current="page">How It Works</span>
      </nav>

      <div className="section-head">
        <p className="kicker">Perth & Western Australia · Stress-Free Execution</p>
        <h1>How 0-to-100 event management works</h1>
        <p className="section-lead">
          We built Managevent to replace fragmented supplier quotes and chaotic spreadsheets with a
          single, calm workflow from your first budget estimate to the final pack-down truck.
        </p>
      </div>

      <ol className="timeline-list">
        {PROCESS_STEPS.map((item) => (
          <li key={item.step} className="timeline-item">
            <span className="timeline-offset">{item.step}</span>
            <div>
              <h2>{item.title}</h2>
              <p>{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="section-cta-row">
        <a className="button" href={localePath(locale, "/#estimator")}>
          Step 1: Calculate Your Event Estimate →
        </a>
        <a className="button button-secondary" href={invitationUrl}>
          Explore Digital Invitation Studio →
        </a>
      </div>
    </main>
  );
}
