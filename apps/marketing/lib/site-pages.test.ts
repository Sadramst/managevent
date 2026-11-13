import { describe, expect, it } from "vitest";
import { sitePagesEn } from "@managevent/i18n";
import sitemap from "../app/sitemap";
import { loadPerthVenues } from "./content";
import {
  FALLBACK_PLAN_FACTS,
  formatAudCents,
  loadInvitationPlanFacts,
  parsePlanFacts,
} from "./plans";
import { perthSettings } from "./settings";
import { pageMetadata, routes, siteUrl } from "./site";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  serializeJsonLd,
} from "./structured-data";

describe("invitation plan facts", () => {
  it("reads the Premium price and Free guest limit from packages/payments", () => {
    const facts = loadInvitationPlanFacts();
    expect(facts.source).toBe("payments");
    expect(facts.premiumPriceCents).toBe(6900);
    expect(facts.freeMaxGuests).toBe(30);
  });
  it("falls back instead of guessing when the source cannot be parsed", () => {
    expect(parsePlanFacts("export const INVITATION_PLANS = {};")).toBeUndefined();
    expect(
      parsePlanFacts("FREE: { maxGuests: 0, }, PREMIUM: { priceIncGstCents: 1, }"),
    ).toBeUndefined();
    expect(FALLBACK_PLAN_FACTS.source).toBe("fallback");
  });
  it("formats cents without floating point", () => {
    expect(formatAudCents(6900)).toBe("$69");
    expect(formatAudCents(6950)).toBe("$69.50");
    expect(formatAudCents(123400)).toBe("$1,234");
  });
});

describe("Perth settings", () => {
  it("never exposes placeholder venue names or labels", () => {
    const settings = perthSettings("en", loadPerthVenues());
    expect(settings.length).toBeGreaterThanOrEqual(6);
    for (const setting of settings) {
      expect(`${setting.name} ${setting.area} ${setting.kind} ${setting.body}`).not.toMatch(
        /placeholder|TBC|partner/i,
      );
    }
  });
});

describe("site copy honesty", () => {
  const text = JSON.stringify(sitePagesEn);
  it("does not mention features that are not in this release", () => {
    expect(text).not.toMatch(/photo wall|\bSMS\b|Apple Wallet|Google Wallet|\bAI\b/i);
  });
  it("keeps invitation prices out of copy so they come from plan config", () => {
    expect(text).not.toMatch(/\$69|\b30 guests/);
  });
  it("has between 12 and 16 questions on the FAQ", () => {
    const count = sitePagesEn.faq.groups.reduce((sum, group) => sum + group.items.length, 0);
    expect(count).toBeGreaterThanOrEqual(12);
    expect(count).toBeLessThanOrEqual(16);
  });
});

describe("metadata, sitemap and structured data", () => {
  it("gives each page its own description and canonical", () => {
    const meta = pageMetadata("en", "Pricing", routes.pricing, { description: "About pricing" });
    expect(meta.title).toBe("Pricing | Managevent Perth");
    expect(meta.description).toBe("About pricing");
    expect(meta.alternates?.canonical).toBe("/pricing");
    expect(pageMetadata("en", "Exact", "", { absoluteTitle: true }).title).toBe("Exact");
  });
  it("lists every public route and each ceremony from content", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const path of ["/invitations", "/pricing", "/ceremonies", "/venues", "/memorials", "/faq"])
      expect(urls).toContain(`${siteUrl}${path}`);
    expect(urls).toContain(siteUrl);
    expect(urls).toContain(`${siteUrl}/ceremonies/wedding`);
    expect(urls.some((url) => url.includes("/admin"))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });
  it("builds structured data without an address or ABN", () => {
    const organization = organizationJsonLd("About us", {
      email: "hello@example.com.au",
      phone: "",
    });
    expect(organization).not.toHaveProperty("address");
    // A blank phone is left out rather than published as an empty number.
    expect(organization).not.toHaveProperty("telephone");
    expect(organization).toMatchObject({ email: "hello@example.com.au" });
    expect(organization).not.toHaveProperty("taxID");
    expect(
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "FAQ", path: "/faq" },
      ]),
    ).toMatchObject({ itemListElement: [{ item: siteUrl }, { item: `${siteUrl}/faq` }] });
    expect(serializeJsonLd(faqJsonLd([{ question: "a</script>", answer: "b" }]))).not.toContain(
      "</script>",
    );
  });
});
