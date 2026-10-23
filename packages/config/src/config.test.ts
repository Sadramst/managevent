import { describe, expect, it } from "vitest";
import {
  baseVitestConfig,
  createEslintConfig,
  createVitestConfig,
  findPhysicalDirectionClasses,
  generateTailwindV4ThemeCss,
  isSensitiveKey,
  noPhysicalDirectionClassesRule,
  prettierConfig,
  REDACTED_PLACEHOLDER,
  redactForLog,
  redactUrl,
  tailwindBrandTokens,
} from "./index.js";

describe("@managevent/config", () => {
  describe("ESLint physical-direction rule and helpers", () => {
    it("detects physical margin, padding, position, and text alignment classes", () => {
      const sample = "flex ml-4 mr-2 pl-6 pr-3 left-0 right-4 text-left md:text-right -ml-2";
      const found = findPhysicalDirectionClasses(sample);
      expect(found).toEqual([
        "ml-4",
        "mr-2",
        "pl-6",
        "pr-3",
        "left-0",
        "right-4",
        "text-left",
        "md:text-right",
        "-ml-2",
      ]);
    });

    it("allows logical properties and unrelated classes", () => {
      const sample =
        "flex ms-4 me-2 ps-6 pe-3 start-0 end-4 text-start md:text-end items-center justify-between";
      expect(findPhysicalDirectionClasses(sample)).toEqual([]);
    });

    it("reports violations via the ESLint rule visitor for Literal and TemplateLiteral", () => {
      const reports: Array<{ messageId: string; data?: Record<string, string> }> = [];
      const visitor = noPhysicalDirectionClassesRule.create({
        report(desc) {
          reports.push({
            messageId: desc.messageId,
            ...(desc.data ? { data: desc.data } : {}),
          });
        },
      });

      visitor.Literal({
        type: "Literal",
        value: "ms-2 ml-4 text-right",
      });
      visitor.TemplateLiteral({
        type: "TemplateLiteral",
        quasis: [{ value: { raw: "px-4 pl-2 left-0", cooked: "px-4 pl-2 left-0" } }],
      });

      expect(reports).toHaveLength(4);
      expect(reports.map((r) => r.data?.className)).toEqual([
        "ml-4",
        "text-right",
        "pl-2",
        "left-0",
      ]);
    });

    it("creates a valid flat ESLint config array", () => {
      const cfg = createEslintConfig({ ignores: ["custom/**"] });
      expect(cfg).toHaveLength(2);
      expect(cfg[0]?.ignores).toContain("custom/**");
      expect(cfg[1]?.rules?.["managevent/no-physical-direction-classes"]).toBe("error");
    });
  });

  describe("Log redaction helpers", () => {
    it("identifies sensitive keys accurately", () => {
      expect(isSensitiveKey("email")).toBe(true);
      expect(isSensitiveKey("guestToken")).toBe(true);
      expect(isSensitiveKey("allergy_notes")).toBe(true);
      expect(isSensitiveKey("Authorization")).toBe(true);
      expect(isSensitiveKey("customAuthToken")).toBe(true);
      expect(isSensitiveKey("ceremonySlug")).toBe(false);
      expect(isSensitiveKey("eventId")).toBe(false);
    });

    it("redacts guest tokens, display tokens, legacy paths, and sensitive query parameters in URLs", () => {
      expect(redactUrl("/i/sara-ali-aghd/sara-family-g9qtmt")).toBe(
        `/i/sara-ali-aghd/${REDACTED_PLACEHOLDER}`,
      );
      expect(redactUrl("/display/evt_0192/secret-display-token")).toBe(
        `/display/evt_0192/${REDACTED_PLACEHOLDER}`,
      );
      expect(redactUrl("/legacy/anniversary/armita-party-g9qtmt")).toBe(
        `/legacy/anniversary/${REDACTED_PLACEHOLDER}`,
      );
      expect(redactUrl("/plan?token=abc123&lang=fa&email=test@example.com#top")).toBe(
        `/plan?token=${REDACTED_PLACEHOLDER}&lang=fa&email=${REDACTED_PLACEHOLDER}#top`,
      );
    });

    it("deeply redacts objects, arrays, and circular structures", () => {
      const payload: Record<string, unknown> = {
        eventId: "evt_0192",
        email: "host@example.com",
        phone: "+61412345678",
        url: "https://invitation.managevent.com.au/i/wedding-2026/sara-family-g9qtmt",
        nested: {
          dietary: ["HALAL", "NUT_ALLERGY"],
          allergyNotes: "Severe peanut allergy",
          guestCount: 120,
        },
      };
      payload.self = payload;

      const sanitized = redactForLog(payload) as Record<string, unknown>;
      expect(sanitized.eventId).toBe("evt_0192");
      expect(sanitized.email).toBe(REDACTED_PLACEHOLDER);
      expect(sanitized.phone).toBe(REDACTED_PLACEHOLDER);
      expect(sanitized.url).toBe(
        `https://invitation.managevent.com.au/i/wedding-2026/${REDACTED_PLACEHOLDER}`,
      );
      const nested = sanitized.nested as Record<string, unknown>;
      expect(nested.dietary).toBe(REDACTED_PLACEHOLDER);
      expect(nested.allergyNotes).toBe(REDACTED_PLACEHOLDER);
      expect(nested.guestCount).toBe(120);
      expect(sanitized.self).toBe("[CIRCULAR]");
    });
  });

  describe("Prettier, Vitest, and Tailwind presets", () => {
    it("exports canonical Prettier config", () => {
      expect(prettierConfig.printWidth).toBe(100);
      expect(prettierConfig.singleQuote).toBe(false);
    });

    it("exports Vitest preset builder", () => {
      expect(baseVitestConfig.test.environment).toBe("node");
      const custom = createVitestConfig({
        environment: "jsdom",
        coverageThresholds: { branches: 100 },
      });
      expect(custom.test.environment).toBe("jsdom");
      expect(custom.test.coverage.thresholds?.branches).toBe(100);
    });

    it("exports Tailwind v4 tokens and CSS generator", () => {
      expect(tailwindBrandTokens.celebration.primary).toBe("#5C1A24");
      expect(tailwindBrandTokens.memorial.surface).toBe("#F8F9FA");
      const css = generateTailwindV4ThemeCss();
      expect(css).toContain('@import "tailwindcss";');
      expect(css).toContain("--color-primary: var(--me-primary);");
    });
  });
});
