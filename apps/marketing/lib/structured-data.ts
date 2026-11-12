import { absoluteUrl, contact, siteUrl } from "./site";

export type JsonLdData = Record<string, unknown>;

const organizationId = `${siteUrl}/#organization`;

/**
 * Organization data for the home and contact pages. Only fields we can stand behind are
 * included: there is deliberately no street address, ABN, rating or opening hours.
 */
export function organizationJsonLd(description: string): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId,
    name: "Managevent",
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    description,
    email: contact.email,
    ...(contact.phone ? { telephone: contact.phone } : {}),
    areaServed: { "@type": "City", name: "Perth, Western Australia" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: contact.email,
      ...(contact.phone ? { telephone: contact.phone } : {}),
      areaServed: "AU",
      availableLanguage: "en",
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: readonly Crumb[]): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function serviceJsonLd(service: {
  name: string;
  description: string;
  path: string;
}): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    url: absoluteUrl(service.path),
    provider: { "@type": "Organization", "@id": organizationId, name: "Managevent", url: siteUrl },
    areaServed: { "@type": "City", name: "Perth, Western Australia" },
  };
}

export function faqJsonLd(items: readonly { question: string; answer: string }[]): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Serialises structured data for an inline script, escaping `<` so it cannot close the tag. */
export function serializeJsonLd(data: JsonLdData | readonly JsonLdData[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
