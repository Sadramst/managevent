import Image from "next/image";
import { notFound } from "next/navigation";
import { t } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { EnquiryForm } from "../../components/enquiry-form";
import { EventEstimator } from "../../components/event-estimator";
import { loadCeremonies, loadPerthVenues } from "../../lib/content";
import { contact, localePath, pageMetadata } from "../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata("en", "Managevent");
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  loadCeremonies();
  const venues = loadPerthVenues().slice(0, 6);

  const families = [
    [
      "marketing.launchCelebration",
      "marketing.launchCelebrationBody",
      "marketing.launchCelebrationTags",
    ],
    ["marketing.launchCultural", "marketing.launchCulturalBody", "marketing.launchCulturalTags"],
    ["marketing.launchCorporate", "marketing.launchCorporateBody", "marketing.launchCorporateTags"],
    ["marketing.launchSolemn", "marketing.launchSolemnBody", "marketing.launchSolemnTags"],
  ] as const;

  const services = [
    ["01", "marketing.launchSvc1Title", "marketing.launchSvc1Body"],
    ["02", "marketing.launchSvc2Title", "marketing.launchSvc2Body"],
    ["03", "marketing.launchSvc3Title", "marketing.launchSvc3Body"],
    ["04", "marketing.launchSvc4Title", "marketing.launchSvc4Body"],
    ["05", "marketing.launchSvc5Title", "marketing.launchSvc5Body"],
    ["06", "marketing.launchSvc6Title", "marketing.launchSvc6Body"],
  ] as const;

  return (
    <main id="main">
      {/* Editorial Hero Section */}
      <section className="hero">
        <Image
          src="/hero.webp"
          alt={t(locale, "marketing.launchImageAlt")}
          fill
          preload
          fetchPriority="high"
          sizes="100vw"
        />
        <div className="hero-shade" />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="hero-badge">{t(locale, "marketing.launchHeroBadge")}</p>
            <p className="hero-brand">Managevent</p>
            <h1>{t(locale, "marketing.launchTitle")}</h1>
            <p className="hero-lead">{t(locale, "marketing.launchIntro")}</p>
            <div className="hero-actions">
              <a className="button hero-button" href="#enquiry">
                {t(locale, "marketing.launchEnquire")}
              </a>
              <a className="button hero-button-outline" href="#estimator">
                {t(locale, "marketing.launchEstimateCta")}
              </a>
            </div>
          </div>

          <div className="hero-arch-card">
            <div className="hero-arch-inner">
              <p className="hero-arch-kicker">Perth Full-Service Event Production</p>
              <div className="hero-stats-grid">
                <div>
                  <strong dir="ltr">{t(locale, "marketing.launchStat1Value")}</strong>
                  <span>{t(locale, "marketing.launchStat1Label")}</span>
                </div>
                <div>
                  <strong>{t(locale, "marketing.launchStat2Value")}</strong>
                  <span>{t(locale, "marketing.launchStat2Label")}</span>
                </div>
                <div>
                  <strong>{t(locale, "marketing.launchStat3Value")}</strong>
                  <span>{t(locale, "marketing.launchStat3Label")}</span>
                </div>
                <div>
                  <strong>{t(locale, "marketing.launchStat4Value")}</strong>
                  <span>{t(locale, "marketing.launchStat4Label")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Event Types Section */}
      <section id="occasions" className="wrap section">
        <div className="section-head">
          <p className="kicker">{t(locale, "marketing.launchLocation")}</p>
          <h2>{t(locale, "marketing.launchFamilies")}</h2>
          <p className="section-lead">{t(locale, "marketing.launchFamiliesSub")}</p>
        </div>
        <div className="families">
          {families.map(([title, body, tags], index) => (
            <article
              key={title}
              className="family-card"
              style={
                index === 3 ? (getCssVariablesForMode("MEMORIAL") as CSSProperties) : undefined
              }
              data-experience-mode={index === 3 ? "memorial" : "celebration"}
            >
              <span className="family-index" aria-hidden="true">
                0{index + 1}
              </span>
              <h3>{t(locale, title)}</h3>
              <p>{t(locale, body)}</p>
              <p className="family-tags">{t(locale, tags)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 0-to-100 Full Service Catalogue */}
      <section id="services" className="services-band">
        <div className="wrap section">
          <div className="section-head">
            <p className="kicker">{t(locale, "marketing.launchServicesKicker")}</p>
            <h2>{t(locale, "marketing.launchServicesTitle")}</h2>
            <p className="section-lead">{t(locale, "marketing.launchServicesIntro")}</p>
          </div>
          <div className="services-grid">
            {services.map(([num, titleKey, bodyKey]) => (
              <article key={num} className="service-card">
                <span className="service-num" aria-hidden="true" dir="ltr">
                  {num}
                </span>
                <h3>{t(locale, titleKey)}</h3>
                <p>{t(locale, bodyKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Instant Event Cost Estimator */}
      <section id="estimator" className="wrap section">
        <div className="section-head">
          <p className="kicker">{t(locale, "marketing.launchEstimatorKicker")}</p>
          <h2>{t(locale, "marketing.launchEstimatorTitle")}</h2>
          <p className="section-lead">{t(locale, "marketing.launchEstimatorIntro")}</p>
        </div>
        <EventEstimator locale={locale} />
      </section>

      {/* Curated Perth Venues Showcase */}
      <section id="venues" className="venues-band">
        <div className="wrap section">
          <div className="section-head">
            <p className="kicker">{t(locale, "marketing.launchVenuesKicker")}</p>
            <h2>{t(locale, "marketing.launchVenuesTitle")}</h2>
            <p className="section-lead">{t(locale, "marketing.launchVenuesIntro")}</p>
          </div>
          <div className="venues-grid">
            {venues.map((venue) => {
              const maxCap = Math.max(
                venue.capacity?.cocktail ?? 0,
                venue.capacity?.banquet ?? 0,
                venue.capacity?.rounds ?? 0,
                venue.capacity?.theatre ?? 100,
              );
              return (
                <article key={venue.slug} className="venue-card">
                  <div className="venue-card-meta">
                    <span className="venue-area">{venue.area}</span>
                    <span className="venue-type">{venue.type.replace("_", " ")}</span>
                  </div>
                  <h3>{venue.name.en}</h3>
                  <p className="venue-cap">
                    {t(locale, "marketing.launchVenueCapLabel", { max: maxCap })} ·{" "}
                    {venue.indoorOutdoor ?? "INDOOR / OUTDOOR"}
                  </p>
                  <div className="venue-tags">
                    {venue.suitableFor.slice(0, 4).map((tag) => (
                      <span key={tag} className="venue-tag">
                        {tag.replace(/-/g, " ")}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Digital Invitations to Fulfilment Bridge */}
      <section id="bridge" className="wrap section">
        <div className="bridge-panel">
          <div className="section-head">
            <p className="kicker">{t(locale, "marketing.launchBridgeKicker")}</p>
            <h2>{t(locale, "marketing.launchBridgeTitle")}</h2>
            <p className="section-lead">{t(locale, "marketing.launchBridgeIntro")}</p>
          </div>
          <div className="bridge-steps">
            <article className="bridge-step">
              <h3>{t(locale, "marketing.launchBridge1Title")}</h3>
              <p>{t(locale, "marketing.launchBridge1Body")}</p>
            </article>
            <article className="bridge-step">
              <h3>{t(locale, "marketing.launchBridge2Title")}</h3>
              <p>{t(locale, "marketing.launchBridge2Body")}</p>
            </article>
            <article className="bridge-step">
              <h3>{t(locale, "marketing.launchBridge3Title")}</h3>
              <p>{t(locale, "marketing.launchBridge3Body")}</p>
            </article>
          </div>
        </div>
      </section>

      {/* How We Work Process */}
      <section className="process">
        <div className="wrap section">
          <h2>{t(locale, "marketing.launchProcess")}</h2>
          <ol>
            {([1, 2, 3] as const).map((step) => (
              <li key={step}>
                <span aria-hidden="true">{step.toString().padStart(2, "0")}</span>
                <h3>{t(locale, `marketing.launchStep${step}`)}</h3>
                <p>{t(locale, `marketing.launchStep${step}Body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Enquiry & Consultation Form */}
      <section id="enquiry" className="wrap section enquiry">
        <div className="enquiry-sidebar">
          <p className="kicker">{t(locale, "marketing.launchLocation")}</p>
          <h2>{t(locale, "marketing.launchFormTitle")}</h2>
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
            <p className="enquiry-card-note">
              Staff & Coordinators:{" "}
              <a href={localePath(locale, "/admin")}>Open Planner Command Centre →</a>
            </p>
          </div>
        </div>
        <div className="enquiry-form-card">
          <EnquiryForm locale={locale} />
        </div>
      </section>
    </main>
  );
}
