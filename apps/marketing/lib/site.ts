import { t } from "@managevent/i18n";
import type { EnabledLocale } from "@managevent/types";
import type { Metadata } from "next";

export const siteUrl = "https://www.managevent.com.au";
/** The sibling invitations site. Falls back to production when the env var is unset. */
export const invitationUrl = (
  process.env.NEXT_PUBLIC_INVITATION_URL || "https://invitation.managevent.com.au"
).replace(/\/+$/, "");
/** Entry points on the invitations site that www links to. */
export const invitationLinks = {
  home: invitationUrl,
  templates: `${invitationUrl}/templates`,
  /** Starts a new invitation in the host studio (WEBSITE.md B: `/studio/new`). */
  create: `${invitationUrl}/studio/new`,
} as const;
export const contact = {
  email: process.env.CONTACT_EMAIL || "sadra.tabarestani@gmail.com",
  phone: process.env.CONTACT_PHONE ?? "0452657916",
};

/** Every public route on www, in one place for the nav, footer, sitemap and internal links. */
export const routes = {
  home: "/",
  ceremonies: "/ceremonies",
  services: "/services",
  invitations: "/invitations",
  pricing: "/pricing",
  howItWorks: "/how-it-works",
  venues: "/venues",
  memorials: "/memorials",
  about: "/about",
  contact: "/contact",
  faq: "/faq",
  privacy: "/privacy",
  terms: "/terms",
  accessibility: "/accessibility",
  estimator: "/#estimator",
  enquiry: "/#enquiry",
} as const;

/** Indexable static paths for the sitemap (ceremony detail pages are added from content). */
export const sitemapPaths = [
  routes.home,
  routes.ceremonies,
  routes.services,
  routes.invitations,
  routes.pricing,
  routes.howItWorks,
  routes.venues,
  routes.memorials,
  routes.about,
  routes.contact,
  routes.faq,
  routes.privacy,
  routes.terms,
  routes.accessibility,
] as const;

export function localePath(locale: EnabledLocale, path = ""): string {
  void locale;
  return path || "/";
}

/** Absolute URL for a site path, for the sitemap and structured data. */
export function absoluteUrl(path = "/"): string {
  return path === "/" || path === "" ? siteUrl : `${siteUrl}${path}`;
}

export interface PageMetadataOptions {
  /** Page-specific meta description. Falls back to the site description. */
  description?: string;
  /** Use `title` exactly as given, without the " | Managevent Perth" suffix. */
  absoluteTitle?: boolean;
  /** Brand suffix for the document title. Defaults to "Managevent Perth". */
  suffix?: string;
}

export function pageMetadata(
  locale: EnabledLocale,
  title: string,
  path = "",
  options: PageMetadataOptions = {},
): Metadata {
  const description = options.description ?? t(locale, "marketing.launchDescription");
  const fullTitle = options.absoluteTitle
    ? title
    : `${title} | ${options.suffix ?? "Managevent Perth"}`;
  return {
    title: fullTitle,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: localePath(locale, path),
      languages: {
        "en-AU": localePath("en", path),
        "x-default": localePath("en", path),
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: localePath(locale, path),
      siteName: "Managevent",
      type: "website",
      locale: "en_AU",
      images: ["/opengraph-image"],
    },
  };
}
