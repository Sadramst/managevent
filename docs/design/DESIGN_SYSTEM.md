# Design system

The visual contract for every surface. Tokens live in `packages/ui/src/tokens.ts`; Memorial Mode rules are in [MEMORIAL_MODE.md](MEMORIAL_MODE.md); copy tone is in [`../business/BRAND_VOICE.md`](../business/BRAND_VOICE.md). **Never hard-code a hex value in an app.**

## Where the tokens reach the apps

| Layer                       | Where                                                                                                                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source of truth             | `packages/ui/src/tokens.ts`: `celebrationTokens`, `memorialTokens`, `designTokens` (palettes, typography, radius, motion), `getPaletteTokens(mode)`                                                  |
| CSS variables               | `getCssVariablesForMode(mode)` returns the `--me-*` variables; `@managevent/ui/brand.css` derives rules, tints and radii from them                                                                   |
| Tailwind v4                 | `packages/config/tailwind.css` maps `--color-*` utilities (`bg-surface`, `text-ink-muted`, …) onto the `--me-*` variables                                                                            |
| Brand shell (both web apps) | `@managevent/ui/brand`: `BrandLogo`, `SiteHeader`, `SiteMenu`, `SiteFooter`, and page primitives (`Container`, `Section`, `SectionHead`, `PageHero`, `Card`, `ButtonLink`, `Eyebrow`)                |
| Invitation themes           | `packages/ui/src/themes.ts`: four celebration themes (`royal-ivory`, `midnight-celestial`, `emerald-botanic`, `alabaster-platinum`) and two memorial themes (`memorial-alabaster`, `memorial-slate`) |
| Mobile and desktop          | Planned (MOB-01, WIN-01). `designTokens` is plain JSON-serialisable data for them; `packages/ui-native` is a placeholder                                                                             |

## Colour tokens

### Celebration (default)

| Token                          | Hex                             | Use                                         | Contrast note                                                                                               |
| ------------------------------ | ------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `surface`                      | `#FAF7F2` Warm Ivory            | Page background                             | —                                                                                                           |
| `surface-raised`               | `#FFFFFF`                       | Panels and sheets                           | —                                                                                                           |
| `ink`                          | `#18181B` Rich Charcoal         | Body text                                   | 16.6:1 on surface                                                                                           |
| `ink-muted`                    | `#52525B`                       | Secondary text                              | ≥ 4.5:1 on surface                                                                                          |
| `primary`                      | `#5C1A24` Deep Burgundy         | Primary buttons, headings, links            | 12.1:1 on surface                                                                                           |
| `on-primary`                   | `#FAF7F2`                       | Text on primary                             | 12.1:1                                                                                                      |
| `accent`                       | `#C5A059` Champagne Gold        | Rules, arch frames, ornaments, icon accents | **2.3:1 on surface: decorative only on light backgrounds.** Text is fine on primary (5.3:1) and ink (7.2:1) |
| `accent-strong`                | `#7A5A1E`                       | Small accent-coloured text                  | ≥ 4.5:1 on surface                                                                                          |
| `danger`, `success`, `warning` | `#B3261E`, `#1E6B45`, `#8A5300` | Error, confirmed and caution states         | ≥ 4.5:1 on surface                                                                                          |

### Memorial

| Token                          | Hex                             | Use                                   | Contrast note                            |
| ------------------------------ | ------------------------------- | ------------------------------------- | ---------------------------------------- |
| `surface`                      | `#F8F9FA` Soft Alabaster        | Background                            | —                                        |
| `ink`, `primary`               | `#1E293B` Deep Ink              | Body text **and primary actions**     | 13.9:1                                   |
| `ink-muted`                    | `#64748B` Muted Slate           | Secondary text                        | 4.51:1, only just AA. Plain surface only |
| `accent`                       | `#8C7A6B` Warm Bronze           | Thin rules, large display text, icons | 3.9:1: large text and graphics only      |
| `accent-strong`                | `#665648`                       | Small accent-coloured text            | ≥ 4.5:1 on surface                       |
| `danger`, `success`, `warning` | `#9F2A22`, `#2F5D4A`, `#7A5200` | State colours                         | ≥ 4.5:1 on surface                       |

`packages/ui/src/ui.test.tsx` asserts every documented text pairing is ≥ 4.5:1 (or ≥ 3:1 where marked large or graphic). Change a hex value only together with that test.

## Typography

| Role                           | Face                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| Display and headings           | Cormorant Garamond 600 (self-hosted through `@fontsource`)        |
| UI and body                    | Plus Jakarta Sans 400 and 600 (self-hosted through `@fontsource`) |
| Invitation names (themes only) | The theme's display face                                          |

- **Scale:** a modular ratio of 1.25 on mobile and 1.333 on desktop, base 16px. Serif body text gets +0.1 line height.
- **Line length:** 60–75 characters for prose.
- **Do not use:** tracked all-caps labels, a single italicised word in a headline, or more than two families on a page.

## Layout and motifs

- **Arch frame** (`ArchFrame`): a thin accent-colour arch around hero media, the brand's structural signature.
- **Layered panels:** content panels overlap slightly, like laid cloths. Hierarchy comes from overlap and spacing, not identical shadowed cards.
- **Corner radius by hierarchy:** sheets 24px, panels 12px, controls 8px, chips 999px. Never one radius everywhere.
- **Grid:** 12 columns on desktop, 4 on mobile. Text is start-aligned using logical properties ([I18N_RTL.md](I18N_RTL.md)). Centre alignment only for invitation hero text.

## Motion

- One orchestrated moment per screen (for example the invitation gate).
- Durations: 120ms micro feedback, 240ms UI transitions, about 1.6s for the gate. Easing `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- `prefers-reduced-motion`: crossfades of 200ms or less, no parallax. The gate implements this.
- **Memorial:** gentle fades only.

## Components

`packages/ui` provides plain React components with no third-party UI kit: `ExperienceModeProvider` and `useExperienceMode`, `Button`, `Panel`, `Input`, `Badge`, `ArchFrame`, plus the brand shell above. App-specific components live in each app. Every shared component:

- uses logical properties, so a right-to-left language could be added without rework;
- accepts an `experienceMode` override where colour or motion depends on it;
- has documented states (default, hover, focus-visible, active, disabled, loading, error).
