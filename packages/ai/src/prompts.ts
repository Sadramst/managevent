/**
 * Versioned prompt registry, Zod output schemas, and eval fixtures (`ADR-0009` & `ARCHITECTURE.md` §12).
 */
import { z } from "zod";

export type PromptFeatureKey =
  "ai.ceremony_architect" | "ai.invitation_copywriter" | "ai.budget_allocator";

export type ModelTier = "FAST" | "REASONING";

export const CeremonyArchitectOutputSchema = z.object({
  promptVersion: z.string().min(1),
  isAiGenerated: z.literal(true),
  timelineMilestones: z
    .array(
      z.object({
        weeksBefore: z.number().int().min(0),
        title: z.object({ en: z.string().min(1) }),
      }),
    )
    .min(1),
  vendorChecklist: z.array(z.string().min(1)).min(1),
  budgetSplitPercent: z
    .array(
      z.object({
        category: z.string().min(1),
        percent: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .refine(
      (items) => items.reduce((sum, item) => sum + item.percent, 0) === 100,
      "Budget split percentages must sum to 100%",
    ),
});

export type CeremonyArchitectOutput = z.infer<typeof CeremonyArchitectOutputSchema>;

export const InvitationCopywriterOutputSchema = z.object({
  promptVersion: z.string().min(1),
  isAiGenerated: z.literal(true),
  tone: z.enum([
    "poetic",
    "formal",
    "casual",
    "memorial-respectful",
  ]),
  en: z.object({
    headline: z.string().min(1),
    invitationBody: z.string().min(1),
    storyParagraphs: z.array(z.string().min(1)).min(1),
    scheduleSummary: z.string().min(1),
  }),
});

export type InvitationCopywriterOutput = z.infer<typeof InvitationCopywriterOutputSchema>;

export const BudgetAllocatorOutputSchema = z.object({
  promptVersion: z.string().min(1),
  isAiGenerated: z.literal(true),
  allocations: z
    .array(
      z.object({
        category: z.string().min(1),
        weightPercent: z.number().int().min(1).max(100),
        rationale: z.string().min(1),
      }),
    )
    .min(1),
});

export type BudgetAllocatorOutput = z.infer<typeof BudgetAllocatorOutputSchema>;

export interface VersionedPromptEntry<TSchema extends z.ZodTypeAny> {
  key: PromptFeatureKey;
  version: string;
  modelTier: ModelTier;
  maxOutputTokens: number;
  outputSchema: TSchema;
  buildUserPrompt: (context: Record<string, string | number>) => string;
}

export const PROMPT_REGISTRY = {
  "ai.ceremony_architect": {
    key: "ai.ceremony_architect",
    version: "1.0.0",
    modelTier: "REASONING",
    maxOutputTokens: 2048,
    outputSchema: CeremonyArchitectOutputSchema,
    buildUserPrompt: (ctx) =>
      `Plan a ${ctx.ceremonySlug ?? "wedding"} ceremony in Perth for ${ctx.guestCount ?? 80} guests. Brief: ${ctx.brief ?? ""}`,
  } satisfies VersionedPromptEntry<typeof CeremonyArchitectOutputSchema>,

  "ai.invitation_copywriter": {
    key: "ai.invitation_copywriter",
    version: "1.0.0",
    modelTier: "FAST",
    maxOutputTokens: 1536,
    outputSchema: InvitationCopywriterOutputSchema,
    buildUserPrompt: (ctx) =>
      `Write en-AU invitation wording for ${ctx.ceremonySlug ?? "wedding"} in tone '${ctx.tone ?? "formal"}'. Details: ${ctx.details ?? ""}`,
  } satisfies VersionedPromptEntry<typeof InvitationCopywriterOutputSchema>,

  "ai.budget_allocator": {
    key: "ai.budget_allocator",
    version: "1.0.0",
    modelTier: "FAST",
    maxOutputTokens: 1024,
    outputSchema: BudgetAllocatorOutputSchema,
    buildUserPrompt: (ctx) =>
      `Allocate category weights for ${ctx.ceremonySlug ?? "wedding"} with ${ctx.guestCount ?? 100} guests. Priorities: ${ctx.priorities ?? ""}`,
  } satisfies VersionedPromptEntry<typeof BudgetAllocatorOutputSchema>,
} as const;

/**
 * Deterministic eval fixtures for offline testing without live Gemini API calls.
 */
export const AI_EVAL_FIXTURES: Readonly<{
  ceremonyArchitect: CeremonyArchitectOutput;
  copywriterCelebration: InvitationCopywriterOutput;
  copywriterMemorial: InvitationCopywriterOutput;
  budgetAllocator: BudgetAllocatorOutput;
}> = {
  ceremonyArchitect: {
    promptVersion: "1.0.0",
    isAiGenerated: true,
    timelineMilestones: [
      {
        weeksBefore: 16,
        title: {
          en: "Confirm Swan Valley venue and stylist",
        },
      },
      {
        weeksBefore: 6,
        title: {
          en: "Send digital invitations",
        },
      },
    ],
    vendorChecklist: ["venue", "av-lighting", "catering", "florals", "photo-video"],
    budgetSplitPercent: [
      { category: "catering", percent: 45 },
      { category: "venue", percent: 25 },
      { category: "av-lighting", percent: 15 },
      { category: "florals", percent: 15 },
    ],
  },
  copywriterCelebration: {
    promptVersion: "1.0.0",
    isAiGenerated: true,
    tone: "poetic",
    en: {
      headline: "Together at Our Wedding",
      invitationBody:
        "With joy in our hearts, we invite you to share in our wedding ceremony and reception in Perth.",
      storyParagraphs: ["Our journey began in Perth and brings our families together."],
      scheduleSummary: "4:00 PM Ceremony · 6:30 PM Dinner Reception",
    },
  },
  copywriterMemorial: {
    promptVersion: "1.0.0",
    isAiGenerated: true,
    tone: "memorial-respectful",
    en: {
      headline: "In Loving Memory",
      invitationBody:
        "You are warmly invited to join our family in remembering and honouring a cherished life.",
      storyParagraphs: ["We gather quietly with family and friends to share memories together."],
      scheduleSummary: "10:30 AM Service of Remembrance · 11:30 AM Refreshments",
    },
  },
  budgetAllocator: {
    promptVersion: "1.0.0",
    isAiGenerated: true,
    allocations: [
      {
        category: "catering",
        weightPercent: 50,
        rationale: "Primary hospitality driver for 100 guests",
      },
      {
        category: "styling",
        weightPercent: 30,
        rationale: "Custom arch and table styling",
      },
      {
        category: "photo-video",
        weightPercent: 20,
        rationale: "Full ceremony coverage",
      },
    ],
  },
};
