/**
 * @managevent/ai
 *
 * Server-side Google Gemini AI layer (`@google/genai`, `ADR-0009`):
 * - Environment-driven model resolution (`GEMINI_MODEL_FAST`, `GEMINI_MODEL_REASONING`)
 * - Versioned prompt registry & Zod output schemas
 * - Per-user & anonymous daily quotas
 * - APP 8 PII & health-data prompt scrubber
 * - Memorial Mode tone guardrails & output validator
 */

export {
  type GenerativeModelCallParams,
  type GenerativeModelTransport,
  GoogleGenAiSdkTransport,
  ManageventAiClient,
  type ManageventAiClientOptions,
  resolveGeminiModelId,
} from "./client.js";

export {
  assertServerEnvironment,
  CELEBRATION_SYSTEM_INSTRUCTION,
  type CopywriterTone,
  enforceMemorialToneGuard,
  MEMORIAL_SYSTEM_INSTRUCTION,
  scrubPromptPii,
  validateMemorialAiOutput,
} from "./guards.js";

export {
  AI_EVAL_FIXTURES,
  type BilingualCopywriterOutput,
  BilingualCopywriterOutputSchema,
  type BudgetAllocatorOutput,
  BudgetAllocatorOutputSchema,
  type CeremonyArchitectOutput,
  CeremonyArchitectOutputSchema,
  type ModelTier,
  PROMPT_REGISTRY,
  type PromptFeatureKey,
  type VersionedPromptEntry,
} from "./prompts.js";

export { AiQuotaExceededError, AiQuotaManager, type AiQuotaOptions } from "./quotas.js";
