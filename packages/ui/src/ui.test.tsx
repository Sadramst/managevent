import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ArchFrame,
  Badge,
  Button,
  celebrationTokens,
  ExperienceModeProvider,
  getContrastRatio,
  getDefaultThemeForMode,
  Input,
  INVITATION_THEMES,
  isThemeCompatibleWithMode,
  memorialTokens,
  Panel,
} from "./index.js";

describe("@managevent/ui", () => {
  describe("WCAG 2.2 contrast ratios for every documented text pairing in DESIGN_SYSTEM.md", () => {
    it("asserts Celebration palette text pairings meet WCAG AA (>= 4.5:1) or documented decorative ratios", () => {
      // ink (#18181B) on surface (#FAF7F2) -> ~16.6:1 (>= 4.5:1)
      const inkOnSurface = getContrastRatio(celebrationTokens.ink, celebrationTokens.surface);
      expect(inkOnSurface).toBeGreaterThanOrEqual(16.0);

      // primary (#5C1A24) on surface (#FAF7F2) -> ~12.1:1 (>= 4.5:1)
      const primaryOnSurface = getContrastRatio(
        celebrationTokens.primary,
        celebrationTokens.surface,
      );
      expect(primaryOnSurface).toBeGreaterThanOrEqual(11.5);

      // on-primary (#FAF7F2) on primary (#5C1A24) -> ~12.1:1 (>= 4.5:1)
      const onPrimaryOnPrimary = getContrastRatio(
        celebrationTokens.onPrimary,
        celebrationTokens.primary,
      );
      expect(onPrimaryOnPrimary).toBeGreaterThanOrEqual(11.5);

      // ink-muted (#52525B) on surface (#FAF7F2) -> >= 4.5:1
      const inkMutedOnSurface = getContrastRatio(
        celebrationTokens.inkMuted,
        celebrationTokens.surface,
      );
      expect(inkMutedOnSurface).toBeGreaterThanOrEqual(4.5);

      // accent (#C5A059) on primary (#5C1A24) -> ~5.3:1 (>= 4.5:1)
      const accentOnPrimary = getContrastRatio(celebrationTokens.accent, celebrationTokens.primary);
      expect(accentOnPrimary).toBeGreaterThanOrEqual(4.5);

      // accent (#C5A059) on ink (#18181B) -> ~7.2:1 (>= 4.5:1)
      const accentOnInk = getContrastRatio(celebrationTokens.accent, celebrationTokens.ink);
      expect(accentOnInk).toBeGreaterThanOrEqual(7.0);

      // accent (#C5A059) on surface (#FAF7F2) is ~2.3:1 (decorative only on light surfaces)
      const accentOnSurface = getContrastRatio(celebrationTokens.accent, celebrationTokens.surface);
      expect(accentOnSurface).toBeGreaterThan(2.0);
      expect(accentOnSurface).toBeLessThan(3.0);
    });

    it("asserts Memorial palette text pairings meet WCAG AA (>= 4.5:1) and large-text bronze (>= 3.0:1)", () => {
      // ink (#1E293B) on surface (#F8F9FA) -> ~13.9:1 (>= 4.5:1)
      const inkOnSurface = getContrastRatio(memorialTokens.ink, memorialTokens.surface);
      expect(inkOnSurface).toBeGreaterThanOrEqual(13.5);

      // ink-muted (#64748B) on surface (#F8F9FA) -> ~4.51:1 (>= 4.5:1)
      const inkMutedOnSurface = getContrastRatio(memorialTokens.inkMuted, memorialTokens.surface);
      expect(inkMutedOnSurface).toBeGreaterThanOrEqual(4.5);

      // accent (#8C7A6B) on surface (#F8F9FA) -> ~3.9:1 (>= 3.0:1 for large display text & graphics)
      const accentOnSurface = getContrastRatio(memorialTokens.accent, memorialTokens.surface);
      expect(accentOnSurface).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("7 Invitation themes & theme/mode compatibility", () => {
    it("exports all 7 themes with valid body text contrast (>= 4.5:1)", () => {
      const themeIds = Object.keys(INVITATION_THEMES);
      expect(themeIds).toEqual([
        "royal-ivory",
        "midnight-celestial",
        "emerald-botanic",
        "persian-azure",
        "alabaster-platinum",
        "memorial-alabaster",
        "memorial-slate",
      ]);

      for (const theme of Object.values(INVITATION_THEMES)) {
        expect(getContrastRatio(theme.colors.ink, theme.colors.bg)).toBeGreaterThanOrEqual(4.5);
        expect(getContrastRatio(theme.colors.inkMuted, theme.colors.bg)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    });

    it("enforces strict theme/mode compatibility", () => {
      expect(isThemeCompatibleWithMode("royal-ivory", "CELEBRATION")).toBe(true);
      expect(isThemeCompatibleWithMode("persian-azure", "CELEBRATION")).toBe(true);
      expect(isThemeCompatibleWithMode("memorial-alabaster", "CELEBRATION")).toBe(false);

      expect(isThemeCompatibleWithMode("memorial-alabaster", "MEMORIAL")).toBe(true);
      expect(isThemeCompatibleWithMode("memorial-slate", "MEMORIAL")).toBe(true);
      expect(isThemeCompatibleWithMode("royal-ivory", "MEMORIAL")).toBe(false);

      expect(getDefaultThemeForMode("CELEBRATION")).toBe("royal-ivory");
      expect(getDefaultThemeForMode("MEMORIAL")).toBe("memorial-alabaster");
    });
  });

  describe("ExperienceModeProvider, base components, and ArchFrame", () => {
    it("renders Celebration Mode with arch SVG and RTL logical attributes", () => {
      const html = renderToStaticMarkup(
        <ExperienceModeProvider ceremonyOrRoute="sofreh-aghd" dir="rtl">
          <ArchFrame>
            <Panel layered>
              <Badge>Sofreh Aghd</Badge>
              <Input defaultValue="Sara" />
              <Button variant="primary">Plan my ceremony</Button>
            </Panel>
          </ArchFrame>
        </ExperienceModeProvider>,
      );

      expect(html).toContain('data-experience-mode="celebration"');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('data-motif="celebration-arch"');
      expect(html).toContain("<svg");
      expect(html).toContain("--me-primary:#5C1A24");
    });

    it("renders Memorial Mode without celebration arch SVG and with memorial palette variables", () => {
      const html = renderToStaticMarkup(
        <ExperienceModeProvider ceremonyOrRoute="celebration-of-life" dir="ltr">
          <ArchFrame>
            <Panel>
              <Button>Talk to us</Button>
            </Panel>
          </ArchFrame>
        </ExperienceModeProvider>,
      );

      expect(html).toContain('data-experience-mode="memorial"');
      expect(html).toContain('data-motif="memorial-rule"');
      expect(html).not.toContain("<svg");
      expect(html).not.toContain("#5C1A24");
      expect(html).toContain("--me-surface:#F8F9FA");
    });
  });
});
