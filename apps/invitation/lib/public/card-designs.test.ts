import { getContrastRatio } from "@managevent/ui/tokens";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import {
  INVITATION_OCCASION_SLUGS,
  INVITATION_TEMPLATES,
  MEMORIAL_THEME_IDS,
} from "@managevent/validators";
import { describe, expect, it } from "vitest";
import {
  CARD_DESIGN_CATEGORIES,
  getCardDesignById,
  inferCardDesignForInvitation,
  OCCASION_CARD_DESIGNS,
} from "./card-designs";

describe("52 occasion card designs catalogue", () => {
  it("provides at least 40 distinct designs (52 total) with unique ids", () => {
    expect(OCCASION_CARD_DESIGNS.length).toBeGreaterThanOrEqual(40);
    expect(OCCASION_CARD_DESIGNS).toHaveLength(52);

    const ids = new Set(OCCASION_CARD_DESIGNS.map((design) => design.id));
    expect(ids.size).toBe(52);
  });

  it("maps every design to valid validator slugs and existing themes", () => {
    const validOccasions = new Set<string>(INVITATION_OCCASION_SLUGS);
    const validTemplates = new Set<string>(INVITATION_TEMPLATES.map((t) => t.slug));

    for (const design of OCCASION_CARD_DESIGNS) {
      expect(validOccasions.has(design.occasionSlug), design.id).toBe(true);
      expect(validTemplates.has(design.templateSlug), design.id).toBe(true);
      expect(INVITATION_THEMES[design.themeId], design.id).toBeDefined();
    }
  });

  it("covers all 14 event categories including pet birthdays, baby girl/boy/neutral, weddings, anniversaries and memorials", () => {
    const categories = CARD_DESIGN_CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id);
    expect(categories).toHaveLength(14);

    for (const category of categories) {
      const items = OCCASION_CARD_DESIGNS.filter((d) => d.category === category);
      expect(items.length, category).toBeGreaterThan(0);
    }

    expect(
      OCCASION_CARD_DESIGNS.filter((d) => d.category === "pet-birthday").length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      OCCASION_CARD_DESIGNS.filter((d) => d.category === "baby-shower-girl").length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      OCCASION_CARD_DESIGNS.filter((d) => d.category === "baby-shower-boy").length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      OCCASION_CARD_DESIGNS.filter((d) => d.category === "baby-shower-neutral").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("uses at least 14 distinct card frame silhouettes and 25+ custom vector motifs", () => {
    const shapes = new Set(OCCASION_CARD_DESIGNS.map((d) => d.cardShape));
    const motifs = new Set(OCCASION_CARD_DESIGNS.map((d) => d.motif));
    expect(shapes.size).toBeGreaterThanOrEqual(14);
    expect(motifs.size).toBeGreaterThanOrEqual(25);
  });

  it("passes WCAG 2.2 AA text contrast (>= 4.5:1) on every design card", () => {
    for (const design of OCCASION_CARD_DESIGNS) {
      const { bg, surface, ink, inkMuted } = design.palette;
      expect(getContrastRatio(ink, surface), `${design.id} ink/surface`).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(ink, bg), `${design.id} ink/bg`).toBeGreaterThanOrEqual(4.5);
      expect(
        getContrastRatio(inkMuted, surface),
        `${design.id} muted/surface`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(inkMuted, bg), `${design.id} muted/bg`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("enforces Memorial Mode rules and preserves them during inference", () => {
    const memorialIds = new Set<string>(MEMORIAL_THEME_IDS);
    const memorials = OCCASION_CARD_DESIGNS.filter((d) => d.category === "memorial");
    expect(memorials.length).toBeGreaterThanOrEqual(3);

    for (const design of memorials) {
      expect(design.mode).toBe("MEMORIAL");
      expect(design.gateStyle).toBe("plain-fade");
      expect(memorialIds.has(design.themeId)).toBe(true);
    }

    // Attempting to render a celebratory card ID on a Memorial event resolves back to Memorial
    const resolved = inferCardDesignForInvitation({
      cardId: "pet-dog-barkday-pawty",
      memorial: true,
      templateSlug: "memorial-calm",
    });
    expect(resolved?.mode).toBe("MEMORIAL");
  });

  it("looks up designs by id and infers dog, baby boy and baby girl designs cleanly", () => {
    expect(getCardDesignById("pet-dog-barkday-pawty")?.name).toBe("Dog Barkday Golden Pawty");
    expect(
      inferCardDesignForInvitation({
        title: "Charlie's 4th Barkday Pawty",
        headline: "Treat time for all good dogs",
        ceremonySlug: "birthday",
      })?.id,
    ).toBe("pet-dog-barkday-pawty");
    expect(
      inferCardDesignForInvitation({
        headline: "Baby Boy Prince Shower",
        ceremonySlug: "baby-shower",
      })?.id,
    ).toBe("baby-boy-little-prince");
  });
});
