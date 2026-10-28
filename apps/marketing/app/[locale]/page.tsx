import Image from "next/image";
import { notFound } from "next/navigation";
import { t } from "@managevent/i18n";
import { getCssVariablesForMode } from "@managevent/ui/tokens";
import type { CSSProperties } from "react";
import { EnquiryForm } from "../../components/enquiry-form";
import { loadCeremonies } from "../../lib/content";
import { pageMetadata } from "../../lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return pageMetadata(locale === "fa" ? "fa" : "en", "Managevent");
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "fa") notFound();
  loadCeremonies();
  const families = [
    ["marketing.launchCelebration", "marketing.launchCelebrationBody"],
    ["marketing.launchCultural", "marketing.launchCulturalBody"],
    ["marketing.launchCorporate", "marketing.launchCorporateBody"],
    ["marketing.launchSolemn", "marketing.launchSolemnBody"],
  ] as const;
  return (
    <main id="main">
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
        <div className="wrap hero-copy">
          <p className="hero-brand">Managevent</p>
          <h1>{t(locale, "marketing.launchTitle")}</h1>
          <p>{t(locale, "marketing.launchIntro")}</p>
          <a className="button hero-button" href="#enquiry">
            {t(locale, "marketing.launchEnquire")}
          </a>
        </div>
      </section>
      <section className="wrap section">
        <p className="kicker">{t(locale, "marketing.launchLocation")}</p>
        <h2>{t(locale, "marketing.launchFamilies")}</h2>
        <div className="families">
          {families.map(([title, body], index) => (
            <article
              key={title}
              style={
                index === 3 ? (getCssVariablesForMode("MEMORIAL") as CSSProperties) : undefined
              }
              data-experience-mode={index === 3 ? "memorial" : "celebration"}
            >
              <h3>{t(locale, title)}</h3>
              <p>{t(locale, body)}</p>
            </article>
          ))}
        </div>
      </section>
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
      <section id="enquiry" className="wrap section enquiry">
        <div>
          <h2>{t(locale, "marketing.launchFormTitle")}</h2>
          <p>{t(locale, "marketing.launchFormIntro")}</p>
        </div>
        <EnquiryForm locale={locale} />
      </section>
    </main>
  );
}
