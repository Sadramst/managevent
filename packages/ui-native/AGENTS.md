# AGENTS.md: packages/ui-native

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Planned: React Native components** for `apps/mobile`: native equivalents of the key `packages/ui` components on the same tokens. Today the folder holds only this file, `README.md`, `CLAUDE.md` and a placeholder `package.json`; there is no code. It is built with the Expo app (MOB-01 in `ROADMAP.md`).

## Rules

- Take colours and type from `packages/ui` tokens; never copy hex values.
- Keep names and props aligned with `packages/ui` where possible.
- Use logical layout props (`start`/`end`) and `I18nManager`-aware styles so RTL can be added later.
- Memorial Mode comes from `getExperienceMode()` (`packages/i18n`), as on the web.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
