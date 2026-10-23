# Design system

Tokens live in `packages/ui/tokens`. They are exported as CSS variables (web), a Tailwind v4 theme, a NativeWind theme (mobile) and JSON (Tauri). **Never hard-code a hex value in an app.**

## Colour tokens

### Celebration (default)

| Token            | Hex                                          | Use                                         | Contrast note                                                                                                    |
| ---------------- | -------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `surface`        | `#FAF7F2` Warm Ivory                         | Page background                             | —                                                                                                                |
| `surface-raised` | `#FFFFFF`                                    | Panels and sheets                           | —                                                                                                                |
| `ink`            | `#18181B` Rich Charcoal                      | Body text                                   | 16.6:1 on surface                                                                                                |
| `primary`        | `#5C1A24` Deep Burgundy                      | Primary buttons, headings, links            | 12.1:1 on surface                                                                                                |
| `on-primary`     | `#FAF7F2`                                    | Text on primary                             | 12.1:1                                                                                                           |
| `accent`         | `#C5A059` Champagne Gold                     | Rules, arch frames, ornaments, icon accents | **2.3:1 on surface, so decorative only on light backgrounds.** Text is OK on primary (5.3:1) and on ink (7.2:1). |
| `ink-muted`      | derive at implementation, ≥ 4.5:1 on surface | Secondary text                              | —                                                                                                                |

### Memorial

| Token       | Hex                      | Use                                   | Contrast note                                          |
| ----------- | ------------------------ | ------------------------------------- | ------------------------------------------------------ |
| `surface`   | `#F8F9FA` Soft Alabaster | Background                            | —                                                      |
| `ink`       | `#1E293B` Deep Ink       | Body text and **primary actions**     | 13.9:1                                                 |
| `ink-muted` | `#64748B` Muted Slate    | Secondary text                        | 4.51:1, which only just passes AA. Plain surface only. |
| `accent`    | `#8C7A6B` Warm Bronze    | Thin rules, large display text, icons | 3.9:1, so large text and graphics only                 |

Tests in `packages/ui` assert every documented text pairing is ≥ 4.5:1 (or ≥ 3:1 where marked large or graphic).

## Typography

| Role                           | Latin                        | Farsi / Arabic script                          |
| ------------------------------ | ---------------------------- | ---------------------------------------------- |
| Display and headings           | Cormorant Garamond (500–600) | Vazirmatn (600–700)                            |
| UI and body                    | Plus Jakarta Sans (400–600)  | Vazirmatn (400–500)                            |
| Invitation names (themes only) | The theme's display face     | A licensed decorative Persian face (per theme) |

- **Scale:** a modular ratio of 1.25 (mobile) or 1.333 (desktop). Base 16px for the UI. Serif body text gets +0.1 extra line-height.
- **Line length:** 60–75 characters for prose.
- **Do not use:** tracked all-caps labels, a single italicised word in a headline, or more than 2 families on a page.

## Layout and motifs

- **Arch frame:** a thin accent-colour arch around hero media. It comes from the Appilico invitations and is the brand's structural signature.
- **Sofreh layering:** content panels overlap slightly, like laid cloths. Hierarchy comes from overlap and spacing, **not** identical shadowed cards.
- **Corner radius by hierarchy:** sheets 24px, panels 12px, controls 8px, chips 999px. Never one radius everywhere.
- **Grid:** a 12-column grid on desktop and 4 columns on mobile. Text is start-aligned, which means right-aligned in RTL. Centre alignment is only for invitation hero text.

## Motion

- One orchestrated moment per screen (the hero dial, the Builder step change, the invitation gate).
- Durations: 120ms for micro feedback, 240ms for UI transitions, about 1.6s for the gate sequence. Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- `prefers-reduced-motion`: crossfades of 200ms or less, and no parallax.
- **Memorial:** `motion = gentle` (fades only).

## Components

`packages/ui` is built on shadcn/ui plus Radix primitives (web). `packages/ui-native` mirrors names and props for React Native where it makes sense. Every component:

- supports RTL
- accepts an `experienceMode` override
- has documented states (default, hover, focus-visible, active, disabled, loading, error)
