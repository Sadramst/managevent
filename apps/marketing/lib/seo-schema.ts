import { contact, siteUrl } from "./site";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "Managevent",
    legalName: "Appilico",
    url: siteUrl,
    logo: `${siteUrl}/brand/logo-mark.jpg`,
    description:
      "Full-service 0-to-100 event planning, bespoke ceremony styling, equipment hire, catering coordination, and digital invitations in Perth, Western Australia.",
    email: contact.email,
    ...(contact.phone ? { telephone: contact.phone } : {}),
    parentOrganization: {
      "@type": "Organization",
      name: "Appilico",
    },
    areaServed: {
      "@type": "City",
      name: "Perth",
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: "Western Australia",
      },
    },
  };
}

export function buildLocalBusinessJsonLd(areasServed: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "EventPlanner"],
    "@id": `${siteUrl}/#localbusiness`,
    name: "Managevent Perth",
    url: siteUrl,
    image: `${siteUrl}/hero.webp`,
    email: contact.email,
    ...(contact.phone ? { telephone: contact.phone } : {}),
    priceRange: "$$",
    currenciesAccepted: "AUD",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Perth",
      addressRegion: "WA",
      addressCountry: "AU",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -31.9505,
      longitude: 115.8605,
    },
    areaServed: areasServed.map((area) => ({
      "@type": "Place",
      name: `${area}, WA`,
    })),
    parentOrganization: {
      "@id": `${siteUrl}/#organization`,
    },
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: "Managevent Perth",
    inLanguage: "en-AU",
    publisher: {
      "@id": `${siteUrl}/#organization`,
    },
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: `${siteUrl}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function buildFaqPageJsonLd(faqs: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildCeremonyServiceJsonLd(params: {
  name: string;
  description: string;
  path: string;
  city?: string;
  includes: string[];
}) {
  const areaName = params.city ?? "Perth, Western Australia";
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${params.name} Planning & Coordination (${areaName})`,
    description: params.description,
    url: `${siteUrl}${params.path}`,
    provider: {
      "@id": `${siteUrl}/#localbusiness`,
    },
    areaServed: {
      "@type": "City",
      name: areaName,
    },
    serviceType: params.name,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${params.name} 0-to-100 Services`,
      itemListElement: params.includes.map((inc) => ({
        "@type": "Offer",
        priceCurrency: "AUD",
        itemOffered: {
          "@type": "Service",
          name: inc.replace(/-/g, " "),
        },
      })),
    },
  };
}

export function buildVenuePlaceJsonLd(params: {
  name: string;
  description: string;
  area: string;
  path: string;
  lat?: number;
  lng?: number;
  maxCapacity?: number;
  accessible?: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "EventVenue",
    name: params.name,
    description: params.description,
    url: `${siteUrl}${params.path}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: params.area,
      addressRegion: "WA",
      addressCountry: "AU",
    },
    ...(typeof params.lat === "number" && typeof params.lng === "number"
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: params.lat,
            longitude: params.lng,
          },
        }
      : {}),
    ...(typeof params.maxCapacity === "number"
      ? { maximumAttendeeCapacity: params.maxCapacity }
      : {}),
    ...(typeof params.accessible === "boolean"
      ? { isAccessibleForFree: false, publicAccess: params.accessible }
      : {}),
  };
}
