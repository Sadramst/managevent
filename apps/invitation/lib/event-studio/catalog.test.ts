import { invitationStudioEn } from "@managevent/i18n";
import { INVITATION_THEMES } from "@managevent/ui/themes";
import {
  FREE_THEME_IDS,
  INVITATION_OCCASION_SLUGS,
  INVITATION_TEMPLATES,
} from "@managevent/validators";
import { describe, expect, it } from "vitest";
import {
  buildCatalog,
  formatAud,
  freeGuestLimit,
  isMemorialEvent,
  occasionLabel,
  occasionMode,
  timeZonesIncluding,
} from "./catalog";
import {
  applyTemplate,
  defaultTemplateFor,
  isGateLocked,
  isTemplateLocked,
  isThemeLocked,
  lockedSelections,
} from "./design-rules";

const catalog = buildCatalog();
const FREE = { allThemes: false, allGateStyles: false };
const PREMIUM = { allThemes: true, allGateStyles: true };

describe("studio catalogue", () => {
  it("names every occasion, template, theme and opening style in the contract", () => {
    expect(catalog.occasions.map((item) => item.slug)).toEqual([...INVITATION_OCCASION_SLUGS]);
    expect(catalog.templates.map((item) => item.slug)).toEqual(
      INVITATION_TEMPLATES.map((item) => item.slug),
    );
    expect(catalog.themes.map((item) => item.id).sort()).toEqual(
      Object.keys(INVITATION_THEMES).sort(),
    );
    expect(catalog.gateStyles.map((item) => item.id)).toEqual([
      "wax-seal",
      "ribbon",
      "arch",
      "plain-fade",
    ]);
    for (const item of [...catalog.occasions, ...catalog.timeZones]) {
      expect(item.label.trim().length).toBeGreaterThan(0);
    }
    for (const item of [...catalog.templates, ...catalog.themes, ...catalog.gateStyles]) {
      expect(item.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("takes the mode of an occasion from the shared helper", () => {
    expect(occasionMode("wedding")).toBe("CELEBRATION");
    for (const slug of ["memorial-service", "celebration-of-life", "wake"]) {
      expect(occasionMode(slug)).toBe("MEMORIAL");
    }
    expect(catalog.occasions.filter((item) => item.mode === "MEMORIAL")).toHaveLength(3);
    expect(isMemorialEvent({ ceremonySlug: "wedding", experienceMode: "CELEBRATION" })).toBe(false);
    expect(isMemorialEvent({ ceremonySlug: "wedding", experienceMode: "MEMORIAL" })).toBe(true);
    expect(isMemorialEvent({ ceremonySlug: "wake", experienceMode: "CELEBRATION" })).toBe(true);
  });

  it("marks the free themes and lists them first", () => {
    const free = catalog.themes.filter((item) => item.free).map((item) => item.id);
    expect(free.sort()).toEqual([...FREE_THEME_IDS].sort());
    expect(catalog.themes[0]?.free).toBe(true);
  });

  it("falls back to a neutral name for an occasion it cannot name", () => {
    expect(occasionLabel("wedding", invitationStudioEn.catalog)).toBe("Wedding");
    expect(occasionLabel("funeral-coordination", invitationStudioEn.catalog)).toBe("Event");
  });

  it("keeps an unusual time zone selectable", () => {
    expect(timeZonesIncluding(catalog.timeZones, "Australia/Perth")).toBe(catalog.timeZones);
    const extended = timeZonesIncluding(catalog.timeZones, "Pacific/Port_Moresby");
    expect(extended.at(-1)).toEqual({ id: "Pacific/Port_Moresby", label: "Pacific/Port Moresby" });
  });

  it("formats AUD cents without doing arithmetic on money", () => {
    expect(formatAud(6900)).toBe("$69");
    expect(formatAud(627)).toBe("$6.27");
    expect(formatAud(605)).toBe("$6.05");
    expect(formatAud(0)).toBe("$0");
  });

  it("reads the free guest limit from the plan table", () => {
    expect(freeGuestLimit()).toBe(30);
  });
});

describe("design rules (mirror of the API plan gating)", () => {
  const template = (slug: string) => {
    const found = catalog.templates.find((item) => item.slug === slug);
    if (!found) throw new Error(`no template ${slug}`);
    return found;
  };
  const theme = (id: string) => {
    const found = catalog.themes.find((item) => item.id === id);
    if (!found) throw new Error(`no theme ${id}`);
    return found;
  };
  const gate = (id: string) => {
    const found = catalog.gateStyles.find((item) => item.id === id);
    if (!found) throw new Error(`no gate ${id}`);
    return found;
  };

  it("locks premium templates and themes on the free plan only", () => {
    expect(isTemplateLocked(template("royal-classic"), FREE)).toBe(false);
    expect(isTemplateLocked(template("celestial-evening"), FREE)).toBe(true);
    expect(isTemplateLocked(template("celestial-evening"), PREMIUM)).toBe(false);
    expect(isThemeLocked(theme("midnight-celestial"), FREE)).toBe(true);
    expect(isThemeLocked(theme("alabaster-platinum"), FREE)).toBe(false);
    expect(isThemeLocked(theme("emerald-botanic"), PREMIUM)).toBe(false);
  });

  it("allows the template's own opening and the simple fade on the free plan", () => {
    const royal = template("royal-classic");
    expect(isGateLocked(gate("wax-seal"), royal, FREE)).toBe(false);
    expect(isGateLocked(gate("plain-fade"), royal, FREE)).toBe(false);
    expect(isGateLocked(gate("ribbon"), royal, FREE)).toBe(true);
    expect(isGateLocked(gate("arch"), royal, FREE)).toBe(true);
    expect(isGateLocked(gate("arch"), royal, PREMIUM)).toBe(false);
  });

  it("names what a selection is missing, in template, colours, opening order", () => {
    expect(
      lockedSelections(
        { templateSlug: "royal-classic", themeId: "royal-ivory", gateStyle: "wax-seal" },
        catalog,
        FREE,
      ),
    ).toEqual([]);
    expect(
      lockedSelections(
        { templateSlug: "botanic-garden", themeId: "midnight-celestial", gateStyle: "ribbon" },
        catalog,
        FREE,
      ),
    ).toEqual(["Botanic Garden", "Midnight and rose gold", "Ribbon"]);
    expect(
      lockedSelections(
        { templateSlug: "botanic-garden", themeId: "midnight-celestial", gateStyle: "ribbon" },
        catalog,
        PREMIUM,
      ),
    ).toEqual([]);
  });

  it("a template brings its colours and opening; memorials always fade", () => {
    expect(applyTemplate(template("modern-minimal"))).toEqual({
      templateSlug: "modern-minimal",
      themeId: "alabaster-platinum",
      gateStyle: "plain-fade",
    });
    expect(applyTemplate(template("memorial-linen")).gateStyle).toBe("plain-fade");
    expect(applyTemplate(template("royal-classic")).gateStyle).toBe("wax-seal");
  });

  it("starts a new event on a free template of its own mode", () => {
    expect(defaultTemplateFor(catalog.templates, "CELEBRATION")?.slug).toBe("royal-classic");
    expect(defaultTemplateFor(catalog.templates, "MEMORIAL")?.slug).toBe("memorial-calm");
  });
});

describe("studio copy", () => {
  const all = JSON.stringify(invitationStudioEn).toLowerCase();

  it("does not promise features that do not exist", () => {
    for (const phrase of [
      "photo wall",
      "sms",
      "wallet",
      "persian",
      "bilingual",
      "ai wording",
      "upload your",
    ]) {
      expect(all.includes(phrase), phrase).toBe(false);
    }
  });

  it("says plainly that photo uploads are not available yet", () => {
    expect(invitationStudioEn.content.images.note).toMatch(/not available yet/);
  });

  it("uses en-AU spelling and sentence-case labels", () => {
    expect(all.includes("color")).toBe(false);
    expect(all.includes("organize")).toBe(false);
    for (const label of Object.values(invitationStudioEn.wizard.steps)) {
      expect(label).toBe(label[0]?.toUpperCase() + label.slice(1).toLowerCase());
    }
  });
});
