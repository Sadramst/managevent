# AGENTS.md: packages/i18n

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Translations, RTL and formatting**. EN and FA dictionaries by namespace, typed `t()`, `getDir()`, deterministic Gregorian and Jalali date formatters, digit helpers, Persian character normalisation (ی and ک), and **`getExperienceMode()`**.

- **Built by:** FND-05 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Parity test: all keys in all enabled locales. Do not use `Intl` in SSR paths.
- FA copy must be written or reviewed by a fluent speaker. Machine translation must be marked `// TODO(fa-review)`.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
