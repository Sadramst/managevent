import { notFound } from "next/navigation";
import { getSitePages, t, type TranslationKey } from "@managevent/i18n";
import { PageHero, Section } from "@managevent/ui/brand";
import { Breadcrumbs } from "../../../components/page-kit";
import { contact, localePath, pageMetadata, routes } from "../../../lib/site";

type DocumentKey = "privacy" | "terms" | "accessibility";

const documents: Record<
  DocumentKey,
  { path: string; title: TranslationKey; body: readonly TranslationKey[]; draft: boolean }
> = {
  privacy: {
    path: routes.privacy,
    title: "marketing.launchPrivacyTitle",
    body: ["marketing.launchPrivacy1", "marketing.launchPrivacy2", "marketing.launchPrivacy3"],
    draft: true,
  },
  terms: {
    path: routes.terms,
    title: "marketing.launchTermsTitle",
    body: ["marketing.launchTerms1", "marketing.launchTerms2", "marketing.launchTerms3"],
    draft: true,
  },
  accessibility: {
    path: routes.accessibility,
    title: "marketing.launchAccessTitle",
    body: ["marketing.launchAccess1", "marketing.launchAccess2"],
    draft: false,
  },
};

const documentKeys = Object.keys(documents) as DocumentKey[];

function isDocumentKey(value: string): value is DocumentKey {
  return value in documents;
}

/**
 * This is a catch-all so that every unmatched path, however deep, reaches `notFound()` inside
 * the locale layout and gets the branded 404 page. Only the three legal documents render.
 */
type Params = Promise<{ locale: string; document: string[] }>;

function documentKey(segments: readonly string[]): DocumentKey | undefined {
  const [first, ...rest] = segments;
  return first !== undefined && rest.length === 0 && isDocumentKey(first) ? first : undefined;
}

export function generateStaticParams() {
  return documentKeys.map((document) => ({ locale: "en", document: [document] }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const document = documentKey((await params).document);
  if (!document) return {};
  const entry = documents[document];
  return pageMetadata("en", t("en", entry.title), entry.path, {
    description: getSitePages("en").legal.documents[document].metaDescription,
  });
}

export default async function Document({ params }: { params: Params }) {
  const { locale, document: segments } = await params;
  const document = documentKey(segments);
  if (locale !== "en" || !document) notFound();
  const entry = documents[document];
  const copy = getSitePages(locale).legal;
  const title = t(locale, entry.title);

  return (
    <main id="main">
      <Breadcrumbs locale={locale} trail={[{ name: title, path: entry.path }]} />
      <PageHero eyebrow={copy.eyebrow} title={title} lead={copy.documents[document].lead} />

      <Section>
        <div className="prose sp-doc">
          {entry.draft ? (
            <p className="badge sp-doc-status">{t(locale, "marketing.launchDraft")}</p>
          ) : null}
          {entry.body.map((key) => (
            <p key={key}>{t(locale, key)}</p>
          ))}

          <div className="sp-doc-contact">
            <h2>{copy.contactTitle}</h2>
            <p>{copy.contactBody}</p>
            <ul className="sp-doc-links">
              <li>
                <a className="link" href={`mailto:${contact.email}`}>
                  <bdi>{contact.email}</bdi>
                </a>
              </li>
              {contact.phone ? (
                <li>
                  <a className="link" href={`tel:${contact.phone}`}>
                    <bdi>{contact.phone}</bdi>
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <nav className="sp-doc-contact" aria-label={copy.relatedLabel}>
            <ul className="sp-doc-links">
              {documentKeys
                .filter((key) => key !== document)
                .map((key) => (
                  <li key={key}>
                    <a className="sp-more" href={localePath(locale, documents[key].path)}>
                      {t(locale, documents[key].title)}
                    </a>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
      </Section>
    </main>
  );
}
