# @managevent/ui

Design tokens (Celebration and Memorial palettes), the 6 invitation themes (`WEBSITE.md` §B4), CSS variables, `ExperienceModeProvider`, logical-property (direction-safe) base components (`Button`, `Panel`, `Input`, `Badge`), the `ArchFrame` motif, and the **brand shell** shared by `apps/marketing` and `apps/invitation`. Rules: [`AGENTS.md`](AGENTS.md).

## Brand shell

One stylesheet and one set of server-compatible components make `www` and `invitation` look like the same product.

| Import                                           | What it is                                                                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@managevent/ui/brand.css`                       | The semantic stylesheet: base type, layout, buttons, cards, forms, badges, tables, tabs, stats, alerts, dialogs, header, footer, logo, arch motif. |
| `@managevent/ui/brand`                           | `BrandLogo`, `SiteHeader`, `SiteFooter`, `SiteMenu`, `Container`, `Section`, `SectionHead`, `Eyebrow`, `Card`, `ButtonLink`, `PageHero`.           |
| `@managevent/ui/icon.svg`                        | The brand mark as a standalone icon. Copy it to `app/icon.svg` in each Next.js app.                                                                |
| `@managevent/ui/tokens`, `@managevent/ui/themes` | The palette tokens and the 6 invitation themes on their own.                                                                                       |

### Wiring an app

```css
/* app/globals.css */
@import "@managevent/config/tailwind.css"; /* palette tokens and Tailwind */
@import "@fontsource/cormorant-garamond/latin-600.css";
@import "@fontsource/plus-jakarta-sans/latin-400.css";
@import "@fontsource/plus-jakarta-sans/latin-600.css";
@import "@managevent/ui/brand.css";
/* page-specific styles follow */
```

```ts
// next.config.ts
transpilePackages: ["@managevent/ui", "@managevent/i18n"],
webpack(config) {
  config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
  return config;
},
```

```tsx
// a server layout or chrome component (apps/invitation: components/site/SiteChrome.tsx)
import { SiteFooter, SiteHeader } from "@managevent/ui/brand";

<SiteHeader
  product="invitations"
  productLabel={t(locale, "marketing.launchProductInvitations")}
  homeHref="/"
  navLabel={t(locale, "marketing.launchNavLabel")}
  menuLabel={t(locale, "marketing.launchMenu")}
  navItems={[{ label: "Templates", href: "/templates" }]}
  crossLink={{ label: "Event planning", href: "https://www.managevent.com.au" }}
  cta={{ label: "Create an invitation", href: "/studio/new" }}
/>;
```

Notes:

- The components use only `brand.css` class names, never Tailwind utilities, so no `@source` line for this package is needed.
- Every rule in `brand.css` sits in the `base` or `components` cascade layer. Tailwind utilities and an app's own unlayered CSS always override it.
- Fonts are loaded by the app (`@fontsource/*` is an app dependency). The shell uses Cormorant Garamond 600 and Plus Jakarta Sans 400 and 600.
- All copy is passed in as props from `packages/i18n`. The only literal is the brand name.
- Memorial Mode needs no extra classes: set `data-experience-mode="memorial"` on a wrapper (or use `getCssVariablesForMode("MEMORIAL")`), and the tokens swap.

### Tokens

The palette lives in three places that a unit test keeps identical: `src/tokens.ts`, `packages/config/src/tailwind.ts` and `packages/config/tailwind.css`. Change all three together; `pnpm --filter @managevent/ui test` fails if they drift.

## Usage of the base components

```tsx
import { ExperienceModeProvider, ArchFrame, Panel, Button } from "@managevent/ui";

export function Hero() {
  return (
    <ExperienceModeProvider ceremonyOrRoute="engagement-party" dir="ltr">
      <ArchFrame>
        <Panel layered>
          <Button variant="primary">Plan my ceremony</Button>
        </Panel>
      </ArchFrame>
    </ExperienceModeProvider>
  );
}
```
