/**
 * Structured data for the two indexable pages. Only facts the site can stand behind: the
 * product name, who provides it, where, and the two published prices. No ratings, reviews or
 * counts.
 */

export type JsonLdData = Record<string, unknown>;

/** Serialises JSON-LD for an inline data block; `<` is escaped so it cannot end the element. */
export function serializeJsonLd(data: JsonLdData | readonly JsonLdData[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export interface ServiceJsonLdInput {
  name: string;
  description: string;
  url: string;
  serviceType: string;
  providerName: string;
  providerUrl: string;
  /** Plan names as shown on the page. */
  freeName: string;
  premiumName: string;
  /** Premium price as a decimal string, GST inclusive, e.g. "69.00". */
  premiumPrice: string;
}

export function serviceJsonLd(input: ServiceJsonLdInput): JsonLdData {
  const offer = (name: string, price: string) => ({
    "@type": "Offer",
    name,
    price,
    priceCurrency: "AUD",
    url: input.url,
  });
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: input.url,
    serviceType: input.serviceType,
    areaServed: { "@type": "Country", name: "Australia" },
    provider: { "@type": "Organization", name: input.providerName, url: input.providerUrl },
    offers: [offer(input.freeName, "0"), offer(input.premiumName, input.premiumPrice)],
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

export function itemListJsonLd(
  name: string,
  items: readonly { name: string; description: string }[],
): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      description: item.description,
    })),
  };
}
