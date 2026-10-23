# AGENTS.md: packages/ui-native

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**React Native components**. Native equivalents of key `ui` components on the same tokens, for `apps/mobile`.

- **Built by:** MOB-01 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Keep names and props aligned with `packages/ui` where possible. RTL via `I18nManager`-aware styles.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
