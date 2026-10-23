import { describe, expect, it } from "vitest";
import {
  AI_EVAL_FIXTURES,
  AiQuotaExceededError,
  AiQuotaManager,
  enforceMemorialToneGuard,
  ManageventAiClient,
  resolveGeminiModelId,
  scrubPromptPii,
  validateMemorialAiOutput,
} from "./index.js";

describe("@managevent/ai", () => {
  const testEnv = {
    GEMINI_MODEL_FAST: "gemini-2.5-flash",
    GEMINI_MODEL_REASONING: "gemini-2.5-pro",
  };

  it("resolves model IDs strictly from environment variables and throws when missing", () => {
    expect(resolveGeminiModelId("FAST", testEnv)).toBe("gemini-2.5-flash");
    expect(resolveGeminiModelId("REASONING", testEnv)).toBe("gemini-2.5-pro");
    expect(() => resolveGeminiModelId("FAST", {})).toThrow(
      "Missing required environment variable GEMINI_MODEL_FAST",
    );
  });

  it("scrubs guest emails, AU phone numbers, guest tokens, and health/allergy data from prompts (ADR-0008)", () => {
    const raw =
      "Guest Sara (sara@example.com, +61 412 345 678, /i/aghd-7kq/sara-family-g9qtmt) has severe peanut allergy and anaphylaxis carrying EpiPen.";
    const scrubbed = scrubPromptPii(raw);
    expect(scrubbed).not.toContain("sara@example.com");
    expect(scrubbed).not.toContain("412 345 678");
    expect(scrubbed).not.toContain("sara-family-g9qtmt");
    expect(scrubbed.toLowerCase()).not.toContain("anaphylaxis");
    expect(scrubbed.toLowerCase()).not.toContain("epipen");
    expect(scrubbed).toContain("[REDACTED_EMAIL]");
    expect(scrubbed).toContain("[REDACTED_PHONE]");
    expect(scrubbed).toContain("[REDACTED_HEALTH_DATA]");
  });

  it("enforces Memorial Mode tone guardrails and blocks celebratory/countdown/upsell AI outputs", () => {
    const guard = enforceMemorialToneGuard({
      ceremonySlug: "celebration-of-life",
      requestedTone: "casual",
    });
    expect(guard.experienceMode).toBe("MEMORIAL");
    expect(guard.effectiveTone).toBe("memorial-respectful");
    expect(guard.systemInstruction).toContain("Memorial Mode");

    // Valid memorial fixture passes
    expect(validateMemorialAiOutput(AI_EVAL_FIXTURES.copywriterMemorial)).toEqual({
      valid: true,
      violations: [],
    });

    // Output containing party/countdown/confetti/emoji is rejected
    const badCheck = validateMemorialAiOutput({
      headline: "Join the party! Only 10 days to go 🎉",
    });
    expect(badCheck.valid).toBe(false);
    expect(badCheck.violations).toContain("party");
    expect(badCheck.violations).toContain("days to go");
    expect(badCheck.violations).toContain("celebratory-emoji");
  });

  it("enforces per-user and anonymous daily quotas via AiQuotaManager", () => {
    const quotas = new AiQuotaManager({ anonymousDailyLimit: 2, authenticatedDailyLimit: 3 });
    expect(quotas.consume({ subjectKey: "anon_1", isAnonymous: true }).remaining).toBe(1);
    expect(quotas.consume({ subjectKey: "anon_1", isAnonymous: true }).remaining).toBe(0);
    expect(() => quotas.consume({ subjectKey: "anon_1", isAnonymous: true })).toThrow(
      AiQuotaExceededError,
    );
  });

  it("executes ceremony architect, bilingual copywriter (celebration & memorial), and budget allocator against eval fixtures", async () => {
    const capturedPrompts: string[] = [];
    const client = new ManageventAiClient({
      env: testEnv,
      transport: {
        async generateJson(params) {
          capturedPrompts.push(params.userPrompt);
          if (params.userPrompt.includes("Allocate category weights")) {
            return AI_EVAL_FIXTURES.budgetAllocator;
          }
          if (params.userPrompt.includes("Write parallel EN and FA invitation wording")) {
            return params.systemInstruction.includes("Memorial Mode")
              ? AI_EVAL_FIXTURES.copywriterMemorial
              : AI_EVAL_FIXTURES.copywriterCelebration;
          }
          return AI_EVAL_FIXTURES.ceremonyArchitect;
        },
      },
    });

    const plan = await client.generateCeremonyPlan({
      subjectKey: "usr_1",
      ceremonySlug: "sofreh-aghd",
      guestCount: 80,
      brief: "Outdoor Swan Valley sofreh aghd, contact host@example.com",
    });
    expect(plan.isAiGenerated).toBe(true);
    expect(capturedPrompts[0]).not.toContain("host@example.com");

    const wordingMemorial = await client.generateInvitationWording({
      subjectKey: "usr_1",
      ceremonySlug: "celebration-of-life",
      requestedTone: "poetic", // Overridden to memorial-respectful by guard
      details: "Quiet morning service in Kings Park",
    });
    expect(wordingMemorial.tone).toBe("memorial-respectful");

    const budget = await client.generateBudgetAllocation({
      subjectKey: "usr_1",
      ceremonySlug: "wedding",
      guestCount: 100,
      priorities: "Hospitality and styling",
    });
    expect(budget.allocations).toHaveLength(3);
  });
});
