import { notFound } from "next/navigation";
import { t } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { loadCeremonies } from "../../../lib/content";
import { buildBreadcrumbJsonLd } from "../../../lib/seo-schema";
import { localePath, pageMetadata } from "../../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  return pageMetadata("en", "All Ceremonies & Event Types (0 to 100)", "/ceremonies", {
    description:
      "Explore all 17 ceremony and event types planned, styled and delivered end to end by Managevent in Perth, WA: Weddings, Milestone Birthdays, Corporate Galas, Cultural Ceremonies and Memorials.",
  });
}

const FAMILY_META = [
  {
    key: "CELEBRATION" as const,
    id: "celebration",
    title: "Celebrations & Personal Milestones",
    subtitle:
      "Modern Australian weddings, engagements, romantic proposals, 21st to 70th+ milestone birthdays, kids' parties, baby showers and graduations across Perth.",
  },
  {
    key: "CULTURAL" as const,
    id: "cultural",
    title: "Cultural & Traditional Ceremonies",
    subtitle:
      "Multicultural weddings, engagements and family gatherings styled with authentic ceremony stages, Halal catering coordination and multi-event timelines.",
  },
  {
    key: "CORPORATE" as const,
    id: "corporate",
    title: "Corporate Galas & Community Events",
    subtitle:
      "Executive gala dinners, award nights, brand launches, end-of-year Christmas parties and turnkey local council hall transformations across metropolitan WA.",
  },
  {
    key: "SOLEMN" as const,
    id: "solemn",
    title: "Memorials, Wakes & Celebrations of Life (Memorial Mode)",
    subtitle:
      "Calm, dignified support for celebrations of life, post-service wakes and memorial gatherings — served in respectful Memorial Mode alongside your funeral director.",
  },
];

export default async function CeremoniesHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en") notFound();

  const ceremonies = loadCeremonies();
  const breadcrumbSchema = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Ceremonies", path: "/ceremonies" },
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
        <span aria-current="page">Ceremonies</span>
      </nav>

      <div className="section-head">
        <p className="kicker">Perth & Western Australia · 0 to 100 Event Production</p>
        <h1>Every ceremony and occasion, planned end to end</h1>
        <p className="section-lead">
          Managevent brings venue sourcing, bespoke styling, catering coordination, equipment hire,
          digital invitations, encrypted dietary tracking and on-the-day crew together under one
          accountable Perth team.
        </p>
      </div>

      {FAMILY_META.map((fam) => {
        const items = ceremonies.filter((c) => c.family === fam.key);
        const isMemorial = fam.key === "SOLEMN";

        return (
          <section
            key={fam.key}
            id={fam.id}
            className="hub-family-section"
            style={isMemorial ? (getCssVariablesForMode("MEMORIAL") as CSSProperties) : undefined}
            data-experience-mode={isMemorial ? "memorial" : "celebration"}
          >
            <div className="section-head">
              <h2>{fam.title}</h2>
              <p className="section-lead">{fam.subtitle}</p>
            </div>
            <div className="services-grid">
              {items.map((ceremony) => (
                <article key={ceremony.slug} className="venue-card">
                  <div>
                    <div className="venue-card-meta">
                      <span>{ceremony.family}</span>
                      <span className="venue-type">
                        {ceremony.experienceMode === "MEMORIAL"
                          ? "Memorial Mode"
                          : "0-to-100 Full Service"}
                      </span>
                    </div>
                    <h3>
                      <a href={localePath(locale, `/ceremonies/${ceremony.slug}`)}>
                        {ceremony.name.en}
                      </a>
                    </h3>
                    <p className="venue-cap">{ceremony.summary.en}</p>
                    <div className="venue-tags">
                      {ceremony.includes.slice(0, 5).map((inc) => (
                        <span key={inc} className="venue-tag">
                          {inc.replace(/-/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="venue-card-actions">
                    <a
                      className="venue-ask"
                      href={localePath(locale, `/ceremonies/${ceremony.slug}`)}
                    >
                      {t(locale, "marketing.seoViewDetails")} →
                    </a>
                    <a className="venue-ask" href={localePath(locale, `/perth/${ceremony.slug}`)}>
                      Perth local guide →
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
