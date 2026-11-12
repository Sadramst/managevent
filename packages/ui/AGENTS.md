# AGENTS.md: packages/ui

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Design tokens, invitation themes and the shared web brand shell.** Celebration and Memorial tokens, the 6 invitation themes, CSS variables, `ExperienceModeProvider`, logical-property base components (`Button`, `Panel`, `Input`, `Badge`), the `ArchFrame` motif, and the brand shell (`brand.css` plus `SiteHeader`, `SiteFooter`, `SiteMenu`, `BrandLogo` and layout primitives) that makes `www` and `invitation` look like one product. Design rules: `docs/design/DESIGN_SYSTEM.md` and `docs/design/MEMORIAL_MODE.md`.

- **Used by:** `apps/marketing` and `apps/invitation`.

## Rules

- No hard-coded hex values in apps; colours come from here.
- The palette lives in `src/tokens.ts`, `packages/config/src/tailwind.ts` and `packages/config/tailwind.css`. Change all three together; the tests fail on drift.
- Contrast tests for every documented text pairing (see `docs/design/DESIGN_SYSTEM.md`).
- Components use logical properties only and take `experienceMode` (or inherit it from `data-experience-mode`). Memorial Mode never shows celebratory motion.
- The brand shell uses only `brand.css` class names, never Tailwind utilities, and takes all copy as props from `packages/i18n` (the brand name is the only literal).
- The current `BrandLogo` is interim artwork until the final logo exists (BIZ-12).

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
