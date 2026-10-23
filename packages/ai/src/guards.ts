/**
 * Privacy (APP 8 PII/health scrubber), server-only guard, and Memorial Mode tone guardrails
 * (`ADR-0008`, `ADR-0009`, `ARCHITECTURE.md` §12, `docs/design/MEMORIAL_MODE.md`).
 */
import { getExperienceMode } from "@managevent/i18n";
import type { ExperienceMode } from "@managevent/types";

export type CopywriterTone =
  "poetic" | "formal" | "casual" | "persian-classical" | "persian-modern" | "memorial-respectful";

/**
 * Ensures `@managevent/ai` is never executed in a browser environment.
 */
export function assertServerEnvironment(): void {
  if (typeof globalThis !== "undefined" && "window" in globalThis && "document" in globalThis) {
    throw new Error(
      "@managevent/ai is server-only and must never be imported or executed in client bundles",
    );
  }
}

/**
 * Scrubs guest PII (emails, phone numbers, guest link tokens) and health/allergy information
 * from prompt inputs before sending anything to Google Gemini (`ADR-0008`).
 */
export function scrubPromptPii(input: string): string {
  return (
    input
      // Guest invitation links
      .replace(/\/i\/[^\s/?#]+\/[^\s/?#]+/gi, "/i/[REDACTED_EVENT]/[REDACTED_TOKEN]")
      // Email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
      // Australian and international phone numbers
      .replace(/(?:\+61[\s-]?|0)[23478](?:[\s-]?\d){8}\b/g, "[REDACTED_PHONE]")
      // Health / allergy sensitive phrases
      .replace(
        /\b(?:anaphylaxis|anaphylactic|epipen|nut\s+allergy|peanut\s+allergy|shellfish\s+allergy|severe\s+allergy|allergy\s+notes?)\b/gi,
        "[REDACTED_HEALTH_DATA]",
      )
  );
}

export const CELEBRATION_SYSTEM_INSTRUCTION =
  "You are the Managevent Perth ceremony assistant. Use warm, plain, specific Australian English and fluent Persian (using Persian ی and ک). Never state exact prices or availability as fact; all pricing comes from @managevent/pricing.";

export const MEMORIAL_SYSTEM_INSTRUCTION =
  "You are the Managevent memorial gathering assistant in Memorial Mode. Use a calm, gentle, brief, and respectful tone. NEVER generate humour, jokes, superlatives, countdown language ('days to go'), party language, confetti/celebratory emojis, or upsells. NEVER invent biographical facts; use ONLY details explicitly supplied by the family.";

const FORBIDDEN_MEMORIAL_REGEXES: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "party", pattern: /\bparty\b/i },
  { label: "confetti", pattern: /\bconfetti\b/i },
  { label: "days to go", pattern: /\bdays\s+to\s+go\b/i },
  { label: "countdown", pattern: /\bcountdown\b/i },
  {
    label: "discount/upsell",
    pattern: /\b(?:discount|limited\s+offer|upgrade\s+now|book\s+now)\b/i,
  },
  { label: "celebratory-emoji", pattern: /[🎉🥳🎊🎈🍾🥂]/u },
];

/**
 * Enforces Memorial Mode tone and system instructions when an event or ceremony is solemn.
 */
export function enforceMemorialToneGuard(params: {
  ceremonySlug?: string;
  experienceMode?: ExperienceMode;
  requestedTone?: CopywriterTone;
}): {
  experienceMode: ExperienceMode;
  effectiveTone: CopywriterTone;
  systemInstruction: string;
} {
  const resolvedMode = getExperienceMode({
    ceremonySlug: params.ceremonySlug,
    experienceMode: params.experienceMode,
  });

  if (resolvedMode === "MEMORIAL") {
    return {
      experienceMode: "MEMORIAL",
      effectiveTone: "memorial-respectful",
      systemInstruction: MEMORIAL_SYSTEM_INSTRUCTION,
    };
  }

  const effectiveTone: CopywriterTone =
    params.requestedTone && params.requestedTone !== "memorial-respectful"
      ? params.requestedTone
      : "formal";

  return {
    experienceMode: "CELEBRATION",
    effectiveTone,
    systemInstruction: CELEBRATION_SYSTEM_INSTRUCTION,
  };
}

/**
 * Scans AI-generated text or structured JSON output in Memorial Mode to ensure no banned
 * celebratory, countdown, upsell, or emoji tokens are present.
 */
export function validateMemorialAiOutput(output: unknown): {
  valid: boolean;
  violations: string[];
} {
  const serialized = typeof output === "string" ? output : JSON.stringify(output);
  const violations: string[] = [];

  for (const rule of FORBIDDEN_MEMORIAL_REGEXES) {
    if (rule.pattern.test(serialized)) {
      violations.push(rule.label);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
