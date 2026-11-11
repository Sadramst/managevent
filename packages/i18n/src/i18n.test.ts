import { describe, expect, it } from "vitest";
import {
  enDictionary,
  formatCeremonyDate,
  formatGregorianDate,
  getDir,
  getExperienceMode,
  I18N_NAMESPACES,
  MEMORIAL_CEREMONY_SLUGS,
  t,
} from "./index.js";

describe("@managevent/i18n", () => {
  describe("Dictionary shape", () => {
    it("has all 11 required namespaces with non-empty en strings", () => {
      expect(I18N_NAMESPACES).toEqual([
        "common",
        "marketing",
        "invitation",
        "portal",
        "vendors",
        "admin",
        "mobile",
        "desktop",
        "ceremonies",
        "legal",
        "emails",
      ]);

      for (const ns of I18N_NAMESPACES) {
        for (const [key, val] of Object.entries(enDictionary[ns] as Record<string, string>)) {
          expect(val.trim().length, `${ns}.${key}`).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("t() and getDir()", () => {
    it("translates keys and interpolates parameters", () => {
      expect(t("en", "common.planMyCeremony")).toBe("Plan my ceremony");

      expect(t("en", "invitation.dearGuest", { guestName: "Sara & Family" })).toBe(
        "Dear Sara & Family",
      );
    });

    it("returns correct text direction for all configured locales", () => {
      expect(getDir("en")).toBe("ltr");
      expect(getDir("ar")).toBe("rtl");
      expect(getDir("zh")).toBe("ltr");
      expect(getDir("hi")).toBe("ltr");
    });
  });

  describe("Deterministic Gregorian date formatters", () => {
    it("formats dates deterministically in Perth time", () => {
      // 2026-10-23T08:30:00.000Z is 2026-10-23 16:30 AWST (UTC+8)
      const iso = "2026-10-23T08:30:00.000Z";
      expect(formatGregorianDate(iso, "en", { includeWeekday: true, includeTime: true })).toBe(
        "Friday, 23 October 2026 at 4:30 PM",
      );
      expect(formatCeremonyDate(iso, "en")).toBe("23 October 2026");
    });
  });

  describe("getExperienceMode()", () => {
    it("returns MEMORIAL for all solemn ceremony slugs, routes, and objects", () => {
      for (const slug of MEMORIAL_CEREMONY_SLUGS) {
        expect(getExperienceMode(slug)).toBe("MEMORIAL");
        expect(getExperienceMode(`/perth/${slug}`)).toBe("MEMORIAL");
        expect(getExperienceMode({ ceremonySlug: slug })).toBe("MEMORIAL");
      }
      expect(getExperienceMode("/memorials")).toBe("MEMORIAL");
      expect(getExperienceMode({ family: "SOLEMN" })).toBe("MEMORIAL");
      expect(getExperienceMode({ experienceMode: "MEMORIAL" })).toBe("MEMORIAL");
    });

    it("matches memorial routes with locale prefix, trailing slash, query and hash", () => {
      expect(getExperienceMode("/en/memorials")).toBe("MEMORIAL");
      expect(getExperienceMode("/perth/wake/")).toBe("MEMORIAL");
      expect(getExperienceMode("/wake?x=1")).toBe("MEMORIAL");
      expect(getExperienceMode("/en/memorial-service#details")).toBe("MEMORIAL");
      expect(getExperienceMode("/weddings?next=/wake")).toBe("CELEBRATION");
    });

    it("returns CELEBRATION for wedding, engagement, corporate, and empty inputs", () => {
      expect(getExperienceMode("wedding")).toBe("CELEBRATION");
      expect(getExperienceMode("engagement-party")).toBe("CELEBRATION");
      expect(getExperienceMode("/perth/engagement-party")).toBe("CELEBRATION");
      expect(getExperienceMode({ ceremonySlug: "gala-dinner", family: "CORPORATE" })).toBe(
        "CELEBRATION",
      );
      expect(getExperienceMode(null)).toBe("CELEBRATION");
    });
  });
});
