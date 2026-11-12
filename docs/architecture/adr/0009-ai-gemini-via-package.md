# ADR-0009: Gemini behind `packages/ai`

- **Status:** Accepted. `packages/ai` exists with its guards and tests, but no app calls it yet (ROADMAP INV-04).

- **Decision:** All generative AI uses Google Gemini through the `@google/genai` SDK, wrapped by `packages/ai`, and is called only server-side (`apps/api`, `apps/worker`).
  - Model ids come from the environment (`GEMINI_MODEL_FAST`, `GEMINI_MODEL_REASONING`) and are never hard-coded.
  - Every feature has a versioned prompt, a Zod output schema, a token budget, a per-user quota and an eval fixture set.
- **Reason:** the owner's choice, and consistency with the AI Studio prototype. The provider can be swapped behind the package interface.
