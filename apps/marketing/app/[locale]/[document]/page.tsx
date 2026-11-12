import { notFound } from "next/navigation";
import { t, type TranslationKey } from "@managevent/i18n";
import { DynamicContactEmail, DynamicContactPhoneWithSeparator } from "../../../components/dynamic-contact";
import { loadCityBySlug } from "../../../lib/content";
import { contact, localePath, pageMetadata } from "../../../lib/site";

const documents = {
  privacy: [
    "marketing.launchPrivacyTitle",
    "marketing.launchPrivacy1",
    "marketing.launchPrivacy2",
    "marketing.launchPrivacy3",
  ],
  terms: [
    "marketing.launchTermsTitle",
    "marketing.launchTerms1",
    "marketing.launchTerms2",
    "marketing.launchTerms3",
  ],
  accessibility: [
    "marketing.launchAccessTitle",
    "marketing.launchAccess1",
    "marketing.launchAccess2",
  ],
} as const satisfies Record<string, readonly [TranslationKey, ...TranslationKey[]]>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; document: string }>;
}) {
  const { document } = await params;
  if (document in documents) {
    const keys = documents[document as keyof typeof documents];
    return pageMetadata("en", t("en", keys[0]), `/${document}`);
  }

  const city = loadCityBySlug(document);
  if (city && city.status === "waitlist") {
    return pageMetadata("en", `${city.name.en} Event Planning Waitlist`, `/${city.slug}`, {
      description: `Join the Managevent waitlist for 0-to-100 event planning and styling in ${city.name.en}. Digital invitations are available Australia-wide today.`,
      noindex: true,
    });
  }

  notFound();
}

export default async function Document({
  params,
}: {
  params: Promise<{ locale: string; document: string }>;
}) {
  const { locale, document } = await params;
  if (locale !== "en") notFound();

  if (document in documents) {
    const keys = documents[document as keyof typeof documents];
    return (
      <main id="main" className="wrap section legal">
        <h1>{t(locale, keys[0])}</h1>
        {document !== "accessibility" && (
          <p className="draft">{t(locale, "marketing.launchDraft")}</p>
        )}
        {keys.slice(1).map((key) => (
          <p key={key}>{t(locale, key)}</p>
        ))}
        <p>
          <DynamicContactEmail fallback={contact.email} asLink />
          <DynamicContactPhoneWithSeparator fallback={contact.phone} />
        </p>
      </main>
    );
  }

  const city = loadCityBySlug(document);
  if (city && city.status === "waitlist") {
    return (
      <main id="main" className="wrap section legal">
        <p className="kicker">National Expansion Waitlist</p>
        <h1>Managevent in {city.name.en}</h1>
        <p>
          Full 0-to-100 on-the-day event production is currently live in{" "}
          <a href={localePath(locale, "/perth")}>Perth, Western Australia</a> and expanding to{" "}
          {city.name.en} soon.
        </p>
        <p>
          Our <a href={localePath(locale, "/invitations")}>Digital Invitation Studio</a> is
          available Australia-wide today with full timezone support ({city.timeZone}).
        </p>
      </main>
    );
  }

  notFound();
}
