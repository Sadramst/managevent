import { notFound } from "next/navigation";
import { t } from "@managevent/i18n";
import { Suspense } from "react";
import { EnquiryForm } from "../../../components/enquiry-form";
import { loadPerthCity } from "../../../lib/content";
import { buildBreadcrumbJsonLd } from "../../../lib/seo-schema";
import { contact, localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata(
    "en",
    "Contact Managevent Perth — Enquire About Your Ceremony or Event",
    "/contact",
    {
      description:
        "Contact Managevent in Perth, Western Australia to request a 0-to-100 event proposal, check date availability, or arrange urgent support for a celebration of life or wake.",
    },
  );
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const perth = loadPerthCity();
  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
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
        <span aria-current="page">Contact</span>
      </nav>

      <div className="enquiry">
        <div>
          <p className="kicker">{t(locale, "marketing.launchLocation")}</p>
          <h1>{t(locale, "marketing.launchFormTitle")}</h1>
          <p>{t(locale, "marketing.launchFormIntro")}</p>
          <div className="enquiry-contact-card">
            <strong>Direct Perth Coordination Desk</strong>
            <p>
              Email:{" "}
              <a href={`mailto:${contact.email}`}>
                <bdi>{contact.email}</bdi>
              </a>
            </p>
            {contact.phone && (
              <p>
                Phone:{" "}
                <a href={`tel:${contact.phone}`}>
                  <bdi>{contact.phone}</bdi>
                </a>
              </p>
            )}
            <p>
              Service Area: {perth.areasServed.slice(0, 8).join(", ")} & surrounding WA regions.
            </p>
            <p>Time Zone: AWST (Australia/Perth, UTC+08:00)</p>
            <p className="enquiry-card-note">
              Planning a memorial, wake or celebration of life on short notice? Select
              &ldquo;Memorial / Celebration of Life&rdquo; in the form for priority same-day
              coordinator response.
            </p>
          </div>
        </div>
        <div className="enquiry-form-card">
          <Suspense fallback={null}>
            <EnquiryForm locale={locale} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
