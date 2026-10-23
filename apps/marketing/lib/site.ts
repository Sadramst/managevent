import { t } from "@managevent/i18n";
import type { EnabledLocale } from "@managevent/types";
import type { Metadata } from "next";

export const siteUrl = "https://www.managevent.com.au";
export const contact = {
  email: process.env.CONTACT_EMAIL || "sadra.tabarestani@gmail.com",
  phone: process.env.CONTACT_PHONE ?? "0452657916",
};

export function localePath(locale: EnabledLocale, path = ""): string {
  return `${locale === "fa" ? "/fa" : ""}${path}` || "/";
}

export function pageMetadata(locale: EnabledLocale, title: string, path = ""): Metadata {
  return {
    title: `${title} | Managevent Perth`,
    description: t(locale, "marketing.launchDescription"),
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: localePath(locale, path),
      languages: {
        "en-AU": localePath("en", path),
        "fa-IR": localePath("fa", path),
        "x-default": localePath("en", path),
      },
    },
    robots:
      process.env.VERCEL_ENV === "preview"
        ? { index: false, follow: false }
        : { index: true, follow: true },
    openGraph: {
      title,
      description: t(locale, "marketing.launchDescription"),
      locale: locale === "fa" ? "fa_IR" : "en_AU",
      images: ["/opengraph-image"],
    },
  };
}
