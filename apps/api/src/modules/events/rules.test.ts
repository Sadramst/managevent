/**
 * The pure invitation rules: mode and plan gating of the design, memorial restrictions, publish
 * requirements and custom slugs. No database.
 */
import { describe, expect, it } from "vitest";
import { getInvitationPlan } from "@managevent/payments";
import {
  CELEBRATION_THEME_IDS,
  FREE_THEME_IDS,
  INVITATION_TEMPLATES,
  MEMORIAL_THEME_IDS,
  RsvpConfigSchema,
  SafeEventSlugSchema,
} from "@managevent/validators";
import { ApiProblem } from "../../lib/errors.js";
import {
  assertRsvpConfigAllowed,
  assertWellAllowed,
  missingPublishRequirements,
  replaceEventSlugWords,
  resolveInvitationDesign,
} from "./rules.js";

const FREE = getInvitationPlan("FREE", "CELEBRATION");
const PREMIUM = getInvitationPlan("PREMIUM", "CELEBRATION");
const MEMORIAL_FREE = getInvitationPlan("FREE", "MEMORIAL");

function problemOf(run: () => unknown): ApiProblem {
  try {
    run();
  } catch (err) {
    if (err instanceof ApiProblem) return err;
    throw err;
  }
  throw new Error("Expected an ApiProblem");
}

describe("resolveInvitationDesign", () => {
  it("gives a new invitation its template's theme and gate", () => {
    for (const template of INVITATION_TEMPLATES) {
      const plan = template.mode === "MEMORIAL" ? MEMORIAL_FREE : PREMIUM;
      expect(
        resolveInvitationDesign({
          mode: template.mode,
          plan,
          current: null,
          change: { templateSlug: template.slug },
        }),
      ).toEqual({
        templateSlug: template.slug,
        themeId: template.defaultThemeId,
        gateStyle: template.defaultGateStyle,
      });
    }
  });

  it("lets a free celebration use only the free templates and themes", () => {
    const freeTemplates = INVITATION_TEMPLATES.filter(
      (template) => template.mode === "CELEBRATION" && template.free,
    );
    expect(freeTemplates.map((template) => template.slug)).toEqual([
      "royal-classic",
      "modern-minimal",
    ]);
    for (const template of freeTemplates) {
      expect(() =>
        resolveInvitationDesign({
          mode: "CELEBRATION",
          plan: FREE,
          current: null,
          change: { templateSlug: template.slug },
        }),
      ).not.toThrow();
    }

    const premiumTemplate = problemOf(() =>
      resolveInvitationDesign({
        mode: "CELEBRATION",
        plan: FREE,
        current: null,
        change: { templateSlug: "celestial-evening" },
      }),
    );
    expect(premiumTemplate).toMatchObject({ status: 403, code: "FEATURE_NOT_IN_PLAN" });
    expect(premiumTemplate.details).toEqual({
      feature: "allThemesAndAnimations",
      field: "templateSlug",
    });

    const current = {
      templateSlug: "royal-classic",
      themeId: "royal-ivory",
      gateStyle: "wax-seal",
    };
    for (const themeId of CELEBRATION_THEME_IDS) {
      const attempt = () =>
        resolveInvitationDesign({ mode: "CELEBRATION", plan: FREE, current, change: { themeId } });
      if ((FREE_THEME_IDS as readonly string[]).includes(themeId)) {
        expect(attempt().themeId).toBe(themeId);
      } else {
        expect(problemOf(attempt)).toMatchObject({
          status: 403,
          code: "FEATURE_NOT_IN_PLAN",
          details: { feature: "allThemesAndAnimations", field: "themeId" },
        });
      }
    }
  });

  it("limits a free celebration to its template's gate or the plain fade", () => {
    const current = {
      templateSlug: "royal-classic",
      themeId: "royal-ivory",
      gateStyle: "wax-seal",
    };
    const resolve = (gateStyle: string, plan = FREE) =>
      resolveInvitationDesign({ mode: "CELEBRATION", plan, current, change: { gateStyle } });

    expect(resolve("wax-seal").gateStyle).toBe("wax-seal");
    expect(resolve("plain-fade").gateStyle).toBe("plain-fade");
    for (const gateStyle of ["ribbon", "arch"]) {
      expect(problemOf(() => resolve(gateStyle))).toMatchObject({
        status: 403,
        code: "FEATURE_NOT_IN_PLAN",
        details: { feature: "allGateStyles", field: "gateStyle" },
      });
      expect(resolve(gateStyle, PREMIUM).gateStyle).toBe(gateStyle);
    }
  });

  it("allows every celebration template, theme and gate on Premium", () => {
    const current = {
      templateSlug: "royal-classic",
      themeId: "royal-ivory",
      gateStyle: "wax-seal",
    };
    expect(
      resolveInvitationDesign({
        mode: "CELEBRATION",
        plan: PREMIUM,
        current,
        change: {
          templateSlug: "botanic-garden",
          themeId: "midnight-celestial",
          gateStyle: "ribbon",
        },
      }),
    ).toEqual({
      templateSlug: "botanic-garden",
      themeId: "midnight-celestial",
      gateStyle: "ribbon",
    });
  });

  it("takes the new template's defaults when only the template changes", () => {
    const current = {
      templateSlug: "royal-classic",
      themeId: "royal-ivory",
      gateStyle: "wax-seal",
    };
    expect(
      resolveInvitationDesign({
        mode: "CELEBRATION",
        plan: FREE,
        current,
        change: { templateSlug: "modern-minimal" },
      }),
    ).toEqual({
      templateSlug: "modern-minimal",
      themeId: "alabaster-platinum",
      gateStyle: "plain-fade",
    });
    // Naming the current template again changes nothing.
    expect(
      resolveInvitationDesign({
        mode: "CELEBRATION",
        plan: FREE,
        current: { ...current, themeId: "alabaster-platinum", gateStyle: "plain-fade" },
        change: { templateSlug: "royal-classic" },
      }),
    ).toEqual({
      templateSlug: "royal-classic",
      themeId: "alabaster-platinum",
      gateStyle: "plain-fade",
    });
  });

  it("keeps memorial invitations on memorial templates and themes with the plain fade gate", () => {
    const current = {
      templateSlug: "memorial-calm",
      themeId: "memorial-alabaster",
      gateStyle: "plain-fade",
    };
    // Complimentary Premium: both memorial themes are open without paying.
    for (const themeId of MEMORIAL_THEME_IDS) {
      expect(
        resolveInvitationDesign({
          mode: "MEMORIAL",
          plan: MEMORIAL_FREE,
          current,
          change: { themeId },
        }).themeId,
      ).toBe(themeId);
    }
    // A celebration gate is never applied, whatever was asked for.
    expect(
      resolveInvitationDesign({
        mode: "MEMORIAL",
        plan: MEMORIAL_FREE,
        current,
        change: { gateStyle: "wax-seal" },
      }).gateStyle,
    ).toBe("plain-fade");

    for (const themeId of CELEBRATION_THEME_IDS) {
      const problem = problemOf(() =>
        resolveInvitationDesign({
          mode: "MEMORIAL",
          plan: MEMORIAL_FREE,
          current,
          change: { themeId },
        }),
      );
      expect(problem).toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
      expect(problem.details).toMatchObject({ fieldErrors: { themeId: [expect.any(String)] } });
    }
    expect(
      problemOf(() =>
        resolveInvitationDesign({
          mode: "MEMORIAL",
          plan: MEMORIAL_FREE,
          current,
          change: { templateSlug: "royal-classic" },
        }),
      ),
    ).toMatchObject({
      status: 400,
      details: { fieldErrors: { templateSlug: [expect.any(String)] } },
    });
  });

  it("keeps celebrations off memorial templates and themes", () => {
    const current = {
      templateSlug: "royal-classic",
      themeId: "royal-ivory",
      gateStyle: "wax-seal",
    };
    expect(
      problemOf(() =>
        resolveInvitationDesign({
          mode: "CELEBRATION",
          plan: PREMIUM,
          current,
          change: { templateSlug: "memorial-calm" },
        }),
      ),
    ).toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
    expect(
      problemOf(() =>
        resolveInvitationDesign({
          mode: "CELEBRATION",
          plan: PREMIUM,
          current,
          change: { themeId: "memorial-slate" },
        }),
      ),
    ).toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
  });
});

describe("memorial restrictions", () => {
  it("allows a tribute book but no wishing well and no bank or registry details", () => {
    expect(() => assertWellAllowed("MEMORIAL", "NONE", {})).not.toThrow();
    expect(() =>
      assertWellAllowed("MEMORIAL", "TRIBUTE_BOOK", {
        tributePrompt: "Share a memory",
        donationUrl: "https://example.org/donate",
      }),
    ).not.toThrow();

    expect(problemOf(() => assertWellAllowed("MEMORIAL", "WISHING_WELL", {}))).toMatchObject({
      status: 400,
      details: { fieldErrors: { wellMode: [expect.any(String)] } },
    });
    for (const config of [
      { payId: "family@example.org" },
      { bsb: "066-000" },
      { accountNumber: "12345678" },
      { accountName: "The family" },
      { registryUrl: "https://example.org/registry" },
    ]) {
      expect(problemOf(() => assertWellAllowed("MEMORIAL", "TRIBUTE_BOOK", config))).toMatchObject({
        status: 400,
        code: "VALIDATION_ERROR",
        details: { fieldErrors: { wellConfig: [expect.any(String)] } },
      });
    }
  });

  it("allows a wishing well but no tribute book on a celebration", () => {
    expect(() => assertWellAllowed("CELEBRATION", "NONE", {})).not.toThrow();
    expect(() =>
      assertWellAllowed("CELEBRATION", "WISHING_WELL", { message: "No gifts, please" }),
    ).not.toThrow();
    expect(() =>
      assertWellAllowed("CELEBRATION", "WISHING_WELL", {
        bsb: "066000",
        accountNumber: "12345678",
      }),
    ).not.toThrow();
    expect(problemOf(() => assertWellAllowed("CELEBRATION", "TRIBUTE_BOOK", {}))).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects the standard song prompt at a memorial", () => {
    const config = (songPrompt: "STANDARD" | "MEMORIAL" | "HIDDEN") =>
      RsvpConfigSchema.parse({ songPrompt });
    expect(() => assertRsvpConfigAllowed("MEMORIAL", config("HIDDEN"))).not.toThrow();
    expect(() => assertRsvpConfigAllowed("MEMORIAL", config("MEMORIAL"))).not.toThrow();
    expect(problemOf(() => assertRsvpConfigAllowed("MEMORIAL", config("STANDARD")))).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });
    expect(() => assertRsvpConfigAllowed("CELEBRATION", config("STANDARD"))).not.toThrow();
  });
});

describe("missingPublishRequirements", () => {
  const now = new Date("2027-01-10T04:00:00.000Z");
  const future = new Date("2027-03-01T08:00:00.000Z");
  const ready = { headline: "Anna & Tom", hosts: "The families", venue: { name: "Town Hall" } };

  it("is empty when the invitation is ready", () => {
    expect(missingPublishRequirements(ready, future, now)).toEqual([]);
  });

  it("names everything that is missing, in a fixed order", () => {
    expect(
      missingPublishRequirements({ headline: "  ", hosts: "", venue: null }, now, now),
    ).toEqual(["HEADLINE", "HOSTS", "VENUE", "START_IN_FUTURE"]);
    expect(missingPublishRequirements({ ...ready, venue: { name: " " } }, future, now)).toEqual([
      "VENUE",
    ]);
    expect(missingPublishRequirements(ready, new Date(now.getTime() - 1), now)).toEqual([
      "START_IN_FUTURE",
    ]);
  });
});

describe("replaceEventSlugWords", () => {
  it("replaces the words and keeps the random suffix", () => {
    const next = replaceEventSlugWords("anna-and-tom-x7k2", "the-big-day");
    expect(next).toBe("the-big-day-x7k2");
    expect(SafeEventSlugSchema.safeParse(next).success).toBe(true);
    expect(replaceEventSlugWords("anna-and-tom-x7k2", "anna-and-tom")).toBe("anna-and-tom-x7k2");
  });

  it("rejects words that do not make a valid slug", () => {
    for (const words of ["", "Has Capitals", "double--hyphen", "-leading", "a".repeat(120)]) {
      expect(problemOf(() => replaceEventSlugWords("anna-and-tom-x7k2", words))).toMatchObject({
        status: 400,
        code: "VALIDATION_ERROR",
      });
    }
  });
});
