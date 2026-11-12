import { t } from "@managevent/i18n";
import type { EnabledLocale } from "@managevent/types";
import type { Metadata } from "next";

export const siteUrl = "https://www.managevent.com.au";
export const invitationSiteUrl = "https://invitation.managevent.com.au";
export const invitationUrl = invitationSiteUrl;

export const contact = {
  email: process.env.CONTACT_EMAIL || "appilico.au@gmail.com",
  phone: process.env.CONTACT_PHONE ?? "",
};

export function localePath(locale: EnabledLocale, path = ""): string {
  void locale;
  return path || "/";
}

export interface PageMetadataOptions {
  description?: string | undefined;
  canonicalPath?: string | undefined;
  noindex?: boolean | undefined;
  keywords?: string[] | undefined;
}

export function pageMetadata(
  locale: EnabledLocale,
  title: string,
  path = "",
  options?: PageMetadataOptions,
): Metadata {
  const description = options?.description ?? t(locale, "marketing.launchDescription");
  const canonical = localePath(locale, options?.canonicalPath ?? path);
  const isNoIndex = process.env.VERCEL_ENV === "preview" || Boolean(options?.noindex);

  const fullTitle =
    title === "Managevent"
      ? "Managevent | 0-to-100 Event Planner, Styling & Invitations Perth WA"
      : `${title} | Managevent Perth`;

  return {
    title: fullTitle,
    description,
    keywords: options?.keywords ?? [
      "event planner Perth",
      "event management Perth",
      "wedding planner Perth",
      "ceremony styling Perth",
      "milestone birthday packages Perth",
      "corporate event management Perth",
      "celebration of life Perth",
      "wake catering Perth",
      "digital invitations Perth",
      "party hire Perth WA",
    ],
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical,
      languages: {
        "en-AU": canonical,
        "x-default": canonical,
      },
    },
    robots: isNoIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url: `${siteUrl}${canonical === "/" ? "" : canonical}`,
      siteName: "Managevent Perth",
      locale: "en_AU",
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/opengraph-image"],
    },
  };
}
