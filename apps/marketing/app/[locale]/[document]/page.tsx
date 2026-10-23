import { notFound } from "next/navigation";
import { t, type TranslationKey } from "@managevent/i18n";
import { contact, pageMetadata } from "../../../lib/site";

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
  const { locale, document } = await params;
  if (!(document in documents)) notFound();
  const keys = documents[document as keyof typeof documents];
  return pageMetadata(
    locale === "fa" ? "fa" : "en",
    t(locale === "fa" ? "fa" : "en", keys[0]),
    `/${document}`,
  );
}

export default async function Document({
  params,
}: {
  params: Promise<{ locale: string; document: string }>;
}) {
  const { locale, document } = await params;
  if ((locale !== "fa" && locale !== "en") || !(document in documents)) notFound();
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
        <a href={`mailto:${contact.email}`}>
          <bdi>{contact.email}</bdi>
        </a>
        {contact.phone && (
          <>
            {" "}
            ·{" "}
            <a href={`tel:${contact.phone}`}>
              <bdi>{contact.phone}</bdi>
            </a>
          </>
        )}
      </p>
    </main>
  );
}
