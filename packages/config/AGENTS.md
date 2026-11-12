# AGENTS.md: packages/config

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Shared tooling config.** tsconfig presets (`base`, `node`, `nextjs`, `react-library`, `expo`), the ESLint flat config with the `managevent/no-physical-direction-classes` rule, Prettier, the Vitest preset, the Tailwind v4 palette tokens (`tailwind.ts` and `tailwind.css`), and the log redaction helpers.

- **Used by:** every workspace that has code.

## Rules

- Keep presets minimal and documented. A change affects every workspace, so label it `contract-change`.
- The ESLint rule blocks physical direction classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`). Do not weaken it.
- The palette in `src/tailwind.ts` and `tailwind.css` must equal `packages/ui/src/tokens.ts`. Change all three together; the `packages/ui` tests fail on drift.
- Log through `redactForLog` / `redactUrl`. Add a field name to `REDACTED_FIELD_NAMES` when a new kind of PII appears.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
