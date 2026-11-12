# @managevent/ai

Server-side Google Gemini layer (`@google/genai`, ADR-0009): a versioned prompt registry, Zod output schemas, daily per-subject quotas, a PII and health-data prompt scrubber, Memorial Mode tone guardrails, and offline eval fixtures.

> **Not wired into any app yet.** AI wording suggestions in the studio are INV-04 in [`ROADMAP.md`](../../ROADMAP.md). Server-side only: never import it from a client bundle.

## Usage

```ts
import { GoogleGenAiSdkTransport, ManageventAiClient } from "@managevent/ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("AI is not configured"); // fail closed; never fall back to fixtures

const ai = new ManageventAiClient({ transport: new GoogleGenAiSdkTransport(apiKey) });
const wording = await ai.generateInvitationWording({
  subjectKey: "usr_123",
  ceremonySlug: "wedding",
  requestedTone: "poetic",
  details: "Outdoor Swan Valley ceremony at 4pm",
});
```

- Model ids come from `GEMINI_MODEL_FAST` and `GEMINI_MODEL_REASONING` (`resolveGeminiModelId`).
- Without a `transport`, the client returns the canned `AI_EVAL_FIXTURES`. Use that only in tests.
- `details` is passed through `scrubPromptPii()` before it reaches the prompt. Memorial ceremony slugs get the memorial system instruction (`enforceMemorialToneGuard`).
- Quotas (`AiQuotaManager`) are counted in process memory, so they reset on restart and are not shared between instances.

See [`AGENTS.md`](AGENTS.md) for the rules.
