# AGENTS.md: packages/config

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Shared tooling config**. tsconfig presets (`base`, `nextjs`, `react-library`, `node`, `expo`), ESLint flat config, Prettier, the Tailwind v4 preset (imports tokens from `ui`), Vitest preset, and the log redaction helper list.

- **Built by:** FND-01 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Keep presets minimal and documented. Changes affect every workspace, so label them `contract-change`.
- Includes an ESLint rule that blocks physical CSS direction classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`).

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
