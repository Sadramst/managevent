import { describe, expect, it } from "vitest";
import {
  enDictionary,
  faDictionary,
  formatCeremonyDate,
  formatGregorianDate,
  formatJalaliDate,
  getDir,
  getExperienceMode,
  gregorianToJalali,
  I18N_NAMESPACES,
  isolateLtr,
  MEMORIAL_CEREMONY_SLUGS,
  normalizePersianText,
  t,
  toLatinDigits,
  toPersianDigits,
} from "./index.js";

describe("@managevent/i18n", () => {
  describe("Dictionary parity & Persian script hygiene", () => {
    it("has all 11 required namespaces and exact key parity between EN and FA", () => {
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
        const enKeys = Object.keys(enDictionary[ns]).sort();
        const faKeys = Object.keys(faDictionary[ns]).sort();
        expect(faKeys).toEqual(enKeys);

        for (const key of enKeys) {
          const enVal = (enDictionary[ns] as Record<string, string>)[key] ?? "";
          const faVal = (faDictionary[ns] as Record<string, string>)[key] ?? "";
          expect(enVal.trim().length).toBeGreaterThan(0);
          expect(faVal.trim().length).toBeGreaterThan(0);

          // Every FA string must contain Persian/Arabic script characters
          expect(/[\u0600-\u06FF]/.test(faVal)).toBe(true);

          // No Arabic Yeh (\u064A) or Arabic Kaf (\u0643) in FA dictionary
          expect(/[\u064A\u0643]/.test(faVal)).toBe(false);

          // Placeholder variables {foo} in EN must match FA
          const enPlaceholders = [...enVal.matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
            .map((m) => m[1])
            .sort();
          const faPlaceholders = [...faVal.matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
            .map((m) => m[1])
            .sort();
          expect(faPlaceholders).toEqual(enPlaceholders);
        }
      }
    });
  });

  describe("t() and getDir()", () => {
    it("translates keys and interpolates parameters in EN and FA", () => {
      expect(t("en", "common.planMyCeremony")).toBe("Plan my ceremony");
      expect(t("fa", "common.planMyCeremony")).toBe("طراحی مراسم من");

      expect(t("en", "invitation.dearGuest", { guestName: "Sara & Family" })).toBe(
        "Dear Sara & Family",
      );
      expect(t("fa", "invitation.dearGuest", { guestName: "سارا و خانواده" })).toBe(
        "سارا و خانواده عزیز",
      );
    });

    it("returns correct text direction for all configured locales", () => {
      expect(getDir("en")).toBe("ltr");
      expect(getDir("fa")).toBe("rtl");
      expect(getDir("ar")).toBe("rtl");
      expect(getDir("zh")).toBe("ltr");
      expect(getDir("hi")).toBe("ltr");
    });
  });

  describe("Persian digits, ی/ک normalisation, and LTR isolates", () => {
    it("converts digits between Latin, Arabic-Indic, and Persian", () => {
      expect(toPersianDigits(1405)).toBe("۱۴۰۵");
      expect(toPersianDigits("12 days / ١٢")).toBe("۱۲ days / ۱۲");
      expect(toLatinDigits("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
      expect(toLatinDigits("١٢٣")).toBe("123");
    });

    it("normalises Arabic Yeh (ي / ى) and Kaf (ك) to Persian ی and ک", () => {
      const arabicInput = "كيك و شيريني در مراسم عقد ١٤٠٥";
      const normalized = normalizePersianText(arabicInput);
      expect(normalized).toBe("کیک و شیرینی در مراسم عقد ۱۴۰۵");
      expect(/[\u064A\u0649\u0643]/.test(normalized)).toBe(false);
    });

    it("wraps LTR runs in Unicode isolate markers", () => {
      expect(isolateLtr("$1,250")).toBe("\u2066$1,250\u2069");
    });
  });

  describe("Deterministic Gregorian and Jalali date formatters", () => {
    it("converts Gregorian dates to Jalali accurately (including Nowruz boundary)", () => {
      // 2026-03-21 is 1 Farvardin 1405
      expect(gregorianToJalali(2026, 3, 21)).toEqual({ jy: 1405, jm: 1, jd: 1 });
      // 2026-10-23 is 1 Aban 1405
      expect(gregorianToJalali(2026, 10, 23)).toEqual({ jy: 1405, jm: 8, jd: 1 });
    });

    it("formats Gregorian, Jalali, and ceremony dates deterministically in Perth time", () => {
      // 2026-10-23T08:30:00.000Z is 2026-10-23 16:30 AWST (UTC+8)
      const iso = "2026-10-23T08:30:00.000Z";
      expect(formatGregorianDate(iso, "en", { includeWeekday: true, includeTime: true })).toBe(
        "Friday, 23 October 2026 at 4:30 PM",
      );

      expect(formatJalaliDate(iso, "fa")).toBe("۱ آبان ۱۴۰۵");
      expect(formatJalaliDate(iso, "en")).toBe("1 Aban 1405");

      expect(formatCeremonyDate(iso, "fa")).toBe("۲۳ اکتبر ۲۰۲۶ (۱ آبان ۱۴۰۵)");
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

    it("returns CELEBRATION for wedding, sofreh-aghd, corporate, and empty inputs", () => {
      expect(getExperienceMode("wedding")).toBe("CELEBRATION");
      expect(getExperienceMode("sofreh-aghd")).toBe("CELEBRATION");
      expect(getExperienceMode("/perth/sofreh-aghd")).toBe("CELEBRATION");
      expect(getExperienceMode({ ceremonySlug: "gala-dinner", family: "CORPORATE" })).toBe(
        "CELEBRATION",
      );
      expect(getExperienceMode(null)).toBe("CELEBRATION");
    });
  });
});
