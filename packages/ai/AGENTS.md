# AGENTS.md: packages/ai

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Gemini AI layer (server-side only, ADR-0009).** The `@google/genai` client behind a transport interface, a versioned prompt registry, Zod output schemas, daily quotas, the Memorial Mode tone guard, a PII and health-data scrubber for prompts, and eval fixtures.

- **Status:** built and unit-tested, but **no app uses it yet**. Wiring it into the studio through a new `apps/api` operation is INV-04.
- **Used by:** nothing today. Planned: `apps/api` (INV-04).

## Rules

- Server-side only (`apps/api`, `apps/worker`). Never import this package from a client bundle.
- Never include guest names, contacts or health data in a prompt. Pass free text through `scrubPromptPii()`; the client does this for `details`.
- Memorial ceremonies use the memorial system instruction and `enforceMemorialToneGuard()` only.
- Model ids come from the environment (`GEMINI_MODEL_FAST`, `GEMINI_MODEL_REASONING`).
- `new ManageventAiClient()` without a `transport` answers with the canned `AI_EVAL_FIXTURES`. That default is for tests only: a production caller must pass `new GoogleGenAiSdkTransport(apiKey)` (key from `GEMINI_API_KEY`) and fail closed when the key is missing, like Stripe and Resend in `apps/api`.
- The quota store is in process memory. Before an app depends on it, move it to a shared store (same reason as OPS-11).

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
