# @managevent/ai

Server-side only Google Gemini layer (`@google/genai`, `ADR-0009`), versioned prompt registry, Zod output schemas, daily per-user quotas, APP 8 PII & health-data prompt scrubber, Memorial Mode tone guardrails, and offline eval fixtures.

> **Important:** Server-side only (`apps/api`, `apps/worker`). Never import from client bundles.

## Usage

```ts
import { ManageventAiClient } from "@managevent/ai";

const ai = new ManageventAiClient();
const wording = await ai.generateInvitationWording({
  subjectKey: "usr_123",
  ceremonySlug: "sofreh-aghd",
  requestedTone: "persian-modern",
  details: "Outdoor Swan Valley ceremony at 4pm",
});
```
