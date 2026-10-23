# AGENTS.md: packages/ai

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Gemini AI layer (server-side only)**. The `@google/genai` client, a versioned prompt registry, Zod output schemas, token budgets, per-user quotas, the memorial tone guard, PII scrubbing before prompts, and eval fixtures.

- **Built by:** FND-16 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Server-side only. Never import this package from client bundles.
- Never include guest names, contacts or health data in prompts.
- Model ids come from the environment.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
