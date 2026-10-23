/**
 * Versioned prompt registry, Zod output schemas, and eval fixtures (`ADR-0009` & `ARCHITECTURE.md` §12).
 */
import { z } from "zod";

export type PromptFeatureKey =
  "ai.ceremony_architect" | "ai.bilingual_copywriter" | "ai.budget_allocator";

export type ModelTier = "FAST" | "REASONING";

export const CeremonyArchitectOutputSchema = z.object({
  promptVersion: z.string().min(1),
  isAiGenerated: z.literal(true),
  timelineMilestones: z
    .array(
      z.object({
        weeksBefore: z.number().int().min(0),
        title: z.object({ en: z.string().min(1), fa: z.string().min(1) }),
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

export const BilingualCopywriterOutputSchema = z.object({
  promptVersion: z.string().min(1),
  isAiGenerated: z.literal(true),
  tone: z.enum([
    "poetic",
    "formal",
    "casual",
    "persian-classical",
    "persian-modern",
    "memorial-respectful",
  ]),
  en: z.object({
    headline: z.string().min(1),
    invitationBody: z.string().min(1),
    storyParagraphs: z.array(z.string().min(1)).min(1),
    scheduleSummary: z.string().min(1),
  }),
  fa: z.object({
    headline: z.string().min(1),
    invitationBody: z.string().min(1),
    storyParagraphs: z.array(z.string().min(1)).min(1),
    scheduleSummary: z.string().min(1),
  }),
});

export type BilingualCopywriterOutput = z.infer<typeof BilingualCopywriterOutputSchema>;

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

  "ai.bilingual_copywriter": {
    key: "ai.bilingual_copywriter",
    version: "1.0.0",
    modelTier: "FAST",
    maxOutputTokens: 1536,
    outputSchema: BilingualCopywriterOutputSchema,
    buildUserPrompt: (ctx) =>
      `Write parallel EN and FA invitation wording for ${ctx.ceremonySlug ?? "sofreh-aghd"} in tone '${ctx.tone ?? "formal"}'. Details: ${ctx.details ?? ""}`,
  } satisfies VersionedPromptEntry<typeof BilingualCopywriterOutputSchema>,

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
  copywriterCelebration: BilingualCopywriterOutput;
  copywriterMemorial: BilingualCopywriterOutput;
  budgetAllocator: BudgetAllocatorOutput;
}> = {
  ceremonyArchitect: {
    promptVersion: "1.0.0",
    isAiGenerated: true,
    timelineMilestones: [
      {
        weeksBefore: 16,
        title: {
          en: "Confirm Swan Valley venue and sofreh stylist",
          fa: "تأیید محل برگزاری در سوان ولی و طراح سفره عقد",
        },
      },
      {
        weeksBefore: 6,
        title: {
          en: "Send bilingual digital invitations",
          fa: "ارسال دعوت‌نامه‌های دیجیتال دوزبانه",
        },
      },
    ],
    vendorChecklist: ["venue", "sofreh-set", "catering", "florals", "photo-video"],
    budgetSplitPercent: [
      { category: "catering", percent: 45 },
      { category: "venue", percent: 25 },
      { category: "sofreh-set", percent: 15 },
      { category: "florals", percent: 15 },
    ],
  },
  copywriterCelebration: {
    promptVersion: "1.0.0",
    isAiGenerated: true,
    tone: "persian-modern",
    en: {
      headline: "Together at Our Sofreh Aghd",
      invitationBody:
        "With joy in our hearts, we invite you to share in our Sofreh Aghd ceremony and reception in Perth.",
      storyParagraphs: ["Our journey began in Perth and brings our families together."],
      scheduleSummary: "4:00 PM Sofreh Aghd · 6:30 PM Dinner Reception",
    },
    fa: {
      headline: "همراه ما در پای سفره عقد",
      invitationBody:
        "با دلی سرشار از شادی، از شما دعوت می‌کنیم در مراسم عقد و جشن ما در پرث حضور به هم رسانید.",
      storyParagraphs: ["داستان ما در پرث آغاز شد و اکنون خانواده‌های ما را گرد هم می‌آورد."],
      scheduleSummary: "ساعت ۱۶:۰۰ مراسم عقد · ساعت ۱۸:۳۰ پذیرایی شام",
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
    fa: {
      headline: "به یاد و احترام",
      invitationBody:
        "با احترام از شما دعوت می‌کنیم در گردهمایی یادبود و گرامیداشت عزیز سفرکرده‌مان همراه خانواده ما باشید.",
      storyParagraphs: [
        "در کنار خانواده و دوستان گرد هم می‌آییم تا یاد و خاطره ایشان را گرامی بداریم.",
      ],
      scheduleSummary: "ساعت ۱۰:۳۰ مراسم یادبود · ساعت ۱۱:۳۰ پذیرایی",
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
