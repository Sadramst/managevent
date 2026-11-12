import { fillCopy, getInvitationPublic } from "@managevent/i18n";
import { INVITATION_PLANS } from "@managevent/payments/plans";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import { FREE_THEME_IDS, INVITATION_TEMPLATES } from "@managevent/validators";
import { describe, expect, it } from "vitest";
import { faqJsonLd, serializeJsonLd, serviceJsonLd } from "./json-ld";
import { legacyPath } from "./legacy-path";
import { createInvitationHref, samplePath } from "./links";
import {
  formatAudCents,
  PLAN_COLUMNS,
  planCopyParams,
  planEntitlements,
  premiumPriceDecimal,
} from "./plans";

const copy = getInvitationPublic("en");

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (value && typeof value === "object") {
    for (const item of Object.values(value)) strings(item, out);
  }
  return out;
}

describe("plan facts", () => {
  it("formats AUD cents as a consumer price", () => {
    expect(formatAudCents(0)).toBe("$0");
    expect(formatAudCents(6900)).toBe("$69");
    expect(formatAudCents(6950)).toBe("$69.50");
    expect(formatAudCents(123456)).toBe("$1,234.56");
    expect(() => formatAudCents(-1)).toThrow();
    expect(() => formatAudCents(1.5)).toThrow();
  });

  it("takes the price and guest limit from INVITATION_PLANS", () => {
    expect(planCopyParams()).toEqual({
      price: formatAudCents(INVITATION_PLANS.PREMIUM.priceIncGstCents),
      guests: String(INVITATION_PLANS.FREE.maxGuests),
    });
    expect(premiumPriceDecimal()).toBe(
      (INVITATION_PLANS.PREMIUM.priceIncGstCents / 100).toFixed(2),
    );
  });

  it("gives memorial events Premium features at no charge", () => {
    const plans = planEntitlements();
    expect(Object.keys(plans)).toEqual([...PLAN_COLUMNS]);
    expect(plans.memorial.priceIncGstCents).toBe(0);
    expect(plans.memorial.qrPassesAndCheckin).toBe(true);
    expect(plans.memorial.maxGuests).toBe("unlimited");
    expect(plans.free.qrPassesAndCheckin).toBe(false);
    expect(plans.agency.automaticLogisticsBridge).toBe(true);
    expect(plans.premium.automaticLogisticsBridge).toBe(false);
  });
});

describe("links", () => {
  it("sends a signed-in host straight to the wizard", () => {
    expect(createInvitationHref(true)).toBe("/studio/new");
    expect(createInvitationHref(true, "royal-classic")).toBe("/studio/new?template=royal-classic");
  });

  it("sends a signed-out visitor through sign-up and keeps the template", () => {
    expect(createInvitationHref(false)).toBe("/sign-up?next=%2Fstudio%2Fnew");
    const href = createInvitationHref(false, "memorial-calm");
    expect(new URL(href, "http://x").searchParams.get("next")).toBe(
      "/studio/new?template=memorial-calm",
    );
  });

  it("builds the sample guest path", () => {
    expect(samplePath({ eventSlug: "sample-a", guestToken: "tok-1" })).toBe("/i/sample-a/tok-1");
  });

  it("rebuilds an old link path from its route segments", () => {
    expect(legacyPath("anniversary", ["sara-and-family"])).toBe("/anniversary/sara-and-family");
    expect(legacyPath("e", ["gala", "the%20smiths"])).toBe("/e/gala/the smiths");
    expect(legacyPath("legacy", ["a", "b", "%E0%A4%A"])).toBe("/legacy/a/b/%E0%A4%A");
  });
});

describe("structured data", () => {
  it("escapes markup so the data block cannot be closed early", () => {
    expect(serializeJsonLd({ name: "</script><b>" })).not.toContain("<");
  });

  it("describes the service with the two published prices only", () => {
    const data = serviceJsonLd({
      name: "Managevent Invitations",
      description: "d",
      url: "https://invitation.managevent.com.au",
      serviceType: "Digital invitations and RSVP",
      providerName: "Managevent",
      providerUrl: "https://www.managevent.com.au",
      freeName: "Free",
      premiumName: "Premium Event Pass",
      premiumPrice: premiumPriceDecimal(),
    });
    expect(data.offers).toEqual([
      expect.objectContaining({ name: "Free", price: "0", priceCurrency: "AUD" }),
      expect.objectContaining({ price: premiumPriceDecimal(), priceCurrency: "AUD" }),
    ]);
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|review/i);
  });

  it("builds an FAQ page from the visible questions", () => {
    const data = faqJsonLd(copy.home.faq) as { mainEntity: unknown[] };
    expect(data.mainEntity).toHaveLength(copy.home.faq.length);
  });
});

describe("public copy", () => {
  it("names every template in the catalogue, and nothing else", () => {
    expect(Object.keys(copy.templateNames).sort()).toEqual(
      INVITATION_TEMPLATES.map((template) => template.slug).sort(),
    );
  });

  it("matches the catalogue where it counts templates", () => {
    const celebration = INVITATION_TEMPLATES.filter((t) => t.mode === "CELEBRATION");
    const memorial = INVITATION_TEMPLATES.filter((t) => t.mode === "MEMORIAL");
    // "Six designed templates", "Four for celebrations and two for memorials",
    // "Two celebration templates", "Both memorial templates".
    expect(INVITATION_TEMPLATES).toHaveLength(6);
    expect(celebration).toHaveLength(4);
    expect(memorial).toHaveLength(2);
    expect(celebration.filter((t) => t.free)).toHaveLength(2);
    expect(memorial.every((t) => t.free)).toBe(true);
    for (const template of INVITATION_TEMPLATES) {
      expect(INVITATION_THEMES[template.defaultThemeId]).toBeDefined();
      expect((FREE_THEME_IDS as readonly string[]).includes(template.defaultThemeId)).toBe(
        template.free,
      );
    }
  });

  it("states no price or guest limit of its own", () => {
    const params = planCopyParams();
    for (const text of strings(copy)) {
      // "$0" is the Free plan; any other dollar figure must come from {price}.
      expect(text.replace(/\$0\b/g, ""), text).not.toMatch(/\$\d/);
      expect(fillCopy(text, { ...params, name: "x" }), text).not.toMatch(/\{[a-zA-Z]+\}/);
    }
  });

  it("does not mention features that do not exist", () => {
    const banned =
      /photo wall|\bSMS\b|Apple Wallet|Google Wallet|\bAI\b|Persian|Farsi|bilingual|—|–/i;
    for (const text of strings(copy)) expect(text, text).not.toMatch(banned);
  });
});
