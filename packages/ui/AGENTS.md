# AGENTS.md: packages/ui

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Design tokens and web components**. Tokens (celebration and memorial), the 7 invitation themes, CSS variables, Tailwind theme export, shadcn/ui-based components, the `ExperienceModeProvider`, RTL-safe primitives, and the arch frame ornament.

- **Built by:** FND-06 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- No hard-coded hex values in apps; everything comes from here.
- Contrast tests for every documented text pairing (see `docs/design/DESIGN_SYSTEM.md`).
- Components must support `dir=rtl` and `experienceMode`.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
