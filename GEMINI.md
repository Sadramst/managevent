# GEMINI.md

Gemini CLI: the authoritative instructions for this repository live in `AGENTS.md`. They are imported below so that there is only one source of truth.

@./AGENTS.md

## Gemini-specific notes

- Work from the repo root. For a single-app task, also load that app's `GEMINI.md`.
- When you implement features that call the Gemini API, use **only** `packages/ai`. Never call `@google/genai` directly from an app. Prompts, output schemas, model ids and safety settings live there.
- Do not change files outside the paths the issue names. Shared-package changes need the `contract-change` label.
