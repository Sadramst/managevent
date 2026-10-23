/**
 * Server-side Google Gemini client wrapper (`@google/genai`, `ADR-0009`).
 *
 * Model IDs are read from `GEMINI_MODEL_FAST` and `GEMINI_MODEL_REASONING` environment variables.
 */
import { GoogleGenAI } from "@google/genai";
import { normalizePersianText } from "@managevent/i18n";
import type { ExperienceMode } from "@managevent/types";
import {
  assertServerEnvironment,
  type CopywriterTone,
  enforceMemorialToneGuard,
  scrubPromptPii,
  validateMemorialAiOutput,
} from "./guards.js";
import {
  AI_EVAL_FIXTURES,
  type BilingualCopywriterOutput,
  BilingualCopywriterOutputSchema,
  type BudgetAllocatorOutput,
  type CeremonyArchitectOutput,
  type ModelTier,
  PROMPT_REGISTRY,
} from "./prompts.js";
import { AiQuotaManager } from "./quotas.js";

/**
 * Resolves the Gemini model ID from environment variables (`GEMINI_MODEL_FAST` or `GEMINI_MODEL_REASONING`).
 * Never hard-codes model names inside prompt definitions (`ADR-0009`).
 */
export function resolveGeminiModelId(
  tier: ModelTier,
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = tier === "REASONING" ? env.GEMINI_MODEL_REASONING : env.GEMINI_MODEL_FAST;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      `Missing required environment variable ${tier === "REASONING" ? "GEMINI_MODEL_REASONING" : "GEMINI_MODEL_FAST"}`,
    );
  }
  return raw.trim();
}

export interface GenerativeModelCallParams {
  model: string;
  systemInstruction: string;
  userPrompt: string;
  maxOutputTokens: number;
}

export interface GenerativeModelTransport {
  generateJson(params: GenerativeModelCallParams): Promise<unknown>;
}

/**
 * Live `@google/genai` transport adapter (only invoked when an explicit API key is configured in production/staging).
 */
export class GoogleGenAiSdkTransport implements GenerativeModelTransport {
  private readonly sdk: GoogleGenAI;

  constructor(apiKey: string) {
    this.sdk = new GoogleGenAI({ apiKey });
  }

  async generateJson(params: GenerativeModelCallParams): Promise<unknown> {
    const response = await this.sdk.models.generateContent({
      model: params.model,
      contents: params.userPrompt,
      config: {
        systemInstruction: params.systemInstruction,
        maxOutputTokens: params.maxOutputTokens,
        responseMimeType: "application/json",
      },
    });
    const text = response.text ?? "{}";
    return JSON.parse(text) as unknown;
  }
}

export interface ManageventAiClientOptions {
  transport?: GenerativeModelTransport;
  quotaManager?: AiQuotaManager;
  env?: Record<string, string | undefined>;
}

export class ManageventAiClient {
  private readonly transport: GenerativeModelTransport;
  private readonly quotaManager: AiQuotaManager;
  private readonly env: Record<string, string | undefined>;

  constructor(options: ManageventAiClientOptions = {}) {
    assertServerEnvironment();
    this.quotaManager = options.quotaManager ?? new AiQuotaManager();
    this.env = options.env ?? process.env;
    this.transport =
      options.transport ??
      ({
        async generateJson(params) {
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
      } satisfies GenerativeModelTransport);
  }

  async generateInvitationWording(params: {
    subjectKey: string;
    isAnonymous?: boolean;
    ceremonySlug: string;
    experienceMode?: ExperienceMode;
    requestedTone?: CopywriterTone;
    details: string;
  }): Promise<BilingualCopywriterOutput> {
    assertServerEnvironment();
    this.quotaManager.consume({
      subjectKey: params.subjectKey,
      ...(params.isAnonymous !== undefined ? { isAnonymous: params.isAnonymous } : {}),
    });

    const entry = PROMPT_REGISTRY["ai.bilingual_copywriter"];
    const model = resolveGeminiModelId(entry.modelTier, this.env);
    const guard = enforceMemorialToneGuard({
      ceremonySlug: params.ceremonySlug,
      ...(params.experienceMode ? { experienceMode: params.experienceMode } : {}),
      ...(params.requestedTone ? { requestedTone: params.requestedTone } : {}),
    });

    const scrubbedDetails = scrubPromptPii(params.details);
    const userPrompt = entry.buildUserPrompt({
      ceremonySlug: params.ceremonySlug,
      tone: guard.effectiveTone,
      details: scrubbedDetails,
    });

    const rawOutput = await this.transport.generateJson({
      model,
      systemInstruction: guard.systemInstruction,
      userPrompt,
      maxOutputTokens: entry.maxOutputTokens,
    });

    if (guard.experienceMode === "MEMORIAL") {
      const check = validateMemorialAiOutput(rawOutput);
      if (!check.valid) {
        throw new Error(
          `Memorial Mode tone guard rejected AI output due to forbidden patterns: ${check.violations.join(", ")}`,
        );
      }
    }

    const parsed = BilingualCopywriterOutputSchema.parse(rawOutput);
    return {
      ...parsed,
      fa: {
        headline: normalizePersianText(parsed.fa.headline),
        invitationBody: normalizePersianText(parsed.fa.invitationBody),
        storyParagraphs: parsed.fa.storyParagraphs.map(normalizePersianText),
        scheduleSummary: normalizePersianText(parsed.fa.scheduleSummary),
      },
    };
  }

  async generateCeremonyPlan(params: {
    subjectKey: string;
    isAnonymous?: boolean;
    ceremonySlug: string;
    guestCount: number;
    brief: string;
  }): Promise<CeremonyArchitectOutput> {
    assertServerEnvironment();
    this.quotaManager.consume({
      subjectKey: params.subjectKey,
      ...(params.isAnonymous !== undefined ? { isAnonymous: params.isAnonymous } : {}),
    });

    const entry = PROMPT_REGISTRY["ai.ceremony_architect"];
    const model = resolveGeminiModelId(entry.modelTier, this.env);
    const guard = enforceMemorialToneGuard({ ceremonySlug: params.ceremonySlug });
    const scrubbedBrief = scrubPromptPii(params.brief);

    const rawOutput = await this.transport.generateJson({
      model,
      systemInstruction: guard.systemInstruction,
      userPrompt: entry.buildUserPrompt({
        ceremonySlug: params.ceremonySlug,
        guestCount: params.guestCount,
        brief: scrubbedBrief,
      }),
      maxOutputTokens: entry.maxOutputTokens,
    });

    if (guard.experienceMode === "MEMORIAL") {
      const check = validateMemorialAiOutput(rawOutput);
      if (!check.valid) {
        throw new Error(
          `Memorial Mode tone guard rejected AI plan due to forbidden patterns: ${check.violations.join(", ")}`,
        );
      }
    }

    return entry.outputSchema.parse(rawOutput);
  }

  async generateBudgetAllocation(params: {
    subjectKey: string;
    isAnonymous?: boolean;
    ceremonySlug: string;
    guestCount: number;
    priorities: string;
  }): Promise<BudgetAllocatorOutput> {
    assertServerEnvironment();
    this.quotaManager.consume({
      subjectKey: params.subjectKey,
      ...(params.isAnonymous !== undefined ? { isAnonymous: params.isAnonymous } : {}),
    });

    const entry = PROMPT_REGISTRY["ai.budget_allocator"];
    const model = resolveGeminiModelId(entry.modelTier, this.env);
    const guard = enforceMemorialToneGuard({ ceremonySlug: params.ceremonySlug });

    const rawOutput = await this.transport.generateJson({
      model,
      systemInstruction: guard.systemInstruction,
      userPrompt: entry.buildUserPrompt({
        ceremonySlug: params.ceremonySlug,
        guestCount: params.guestCount,
        priorities: scrubPromptPii(params.priorities),
      }),
      maxOutputTokens: entry.maxOutputTokens,
    });

    return entry.outputSchema.parse(rawOutput);
  }
}
