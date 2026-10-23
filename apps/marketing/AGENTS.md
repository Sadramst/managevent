# AGENTS.md: apps/marketing

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Marketing site: www.managevent.com.au**

- **Domain:** www.managevent.com.au
- **Local port:** 3000
- **Phase:** Phase 1. **Backlog:** MKT-01 … MKT-15 (see `ROADMAP.md`)

The public site. It covers SEO landing pages, the ceremony catalogue, packages, venues, the **Ceremony Builder and Cost Estimator** (`/plan`), the AI Event Planner, enquiry and booking forms, and the Memorials hub.

## Specification

`WEBSITE.md` Part A (all sections). Part C for cross-domain rules.

## Stack

Next.js (App Router), Tailwind v4 (preset from `packages/config`), shadcn/ui via `packages/ui`, Framer Motion (hero dial and Builder transitions only), MDX for legal pages and the journal.

## Depends on (contracts; do not modify from this app)

`ui`, `i18n`, `validators`, `types`, `pricing` (client-side preview only; the authoritative estimate comes from the API), `api-client`, `config`

## Proposed layout

```text
app/
  [locale]/            # en (default, no prefix) and fa through middleware
    page.tsx           # home
    ceremonies/…  packages/…  plan/…  venues/…  services/…  invitations/
    memorials/…  gallery/  stories/  how-it-works/  pricing/  faq/  about/
    contact/  book/  corporate/  vendors/  journal/…  legal/…  accessibility/
    [city]/…           # programmatic local SEO (WEBSITE.md §A7)
  sitemap.ts  robots.ts  opengraph-image.tsx
components/            # app-specific only; shared ones belong in packages/ui
lib/content/           # loader and validation for /content
middleware.ts          # locale prefix handling, no Accept-Language redirect
```

## Rules specific to this app

- Content comes from `/content`, validated against `content/schemas` at build time. A build fails on invalid content.
- The Builder state lives in the URL (search params) and is mirrored to the API with `BuilderSession`. Never use localStorage for it.
- City pages must pass the thin-content guard (WEBSITE.md §A7). Gated cities render `noindex` or 404.
- No marketing pixels before consent. No PII in analytics.
- Testimonials and gallery items need `verified` / `consentRecordId` before they render.
- Memorial Mode applies to all solemn routes through route metadata and `getExperienceMode()`.

## Environment variables

NEXT_PUBLIC_*_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_MEDIA_CDN_URL. The names are listed in the root `.env.example`.

## Tests required

Vitest (content loader, helpers). Playwright: home → Builder → estimate → lead; FA RTL visual snapshots; Memorial Mode route assertions; axe on every template. Lighthouse CI budgets (WEBSITE.md §A13).

## Status

⬜ Not scaffolded. The first issue scaffolds it using the current stable framework version (pin exact versions).
