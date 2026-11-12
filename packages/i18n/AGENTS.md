# AGENTS.md: packages/i18n

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Copy, direction and formatting.** The English (en-AU) dictionary by namespace with a typed `t()`, page copy modules for www, the staff console and the invitation app, `getDir()`, deterministic Gregorian date formatters, and **`getExperienceMode()`** (the only way to decide Memorial Mode).

- **Used by:** `apps/api`, `apps/worker`, `apps/marketing`, `apps/invitation`, `packages/ui`, `packages/notifications`, `packages/pricing`, `packages/ai`.

## Rules

- Every user-facing string lives here. Add `en` keys in the same PR as the UI that uses them.
- `ENABLED_LOCALES` is `["en"]`. `Locale` (from `LocaleSchema` in `packages/validators`) also reserves `ar`, `zh` and `hi`, which are not enabled. Enabling one is a `contract-change`: widen `EnabledLocaleSchema`, add a test that every `en` key exists in the new dictionary, put the language in the URL (root `AGENTS.md` §3), and mark machine translation `// TODO(<locale>-review)`.
- No `Intl` in SSR or hydration paths; use the formatters in `src/dates.ts`. They take a fixed UTC offset (default Perth, +08:00), so pass `timeZoneOffsetMinutes` for events in other zones.
- Spelling is en-AU. Dates read day first (`23 October 2026`, or DD/MM/YYYY where numeric).

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
