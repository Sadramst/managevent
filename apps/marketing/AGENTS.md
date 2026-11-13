# AGENTS.md: apps/marketing

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Marketing site and staff console: www.managevent.com.au**

- **Domain:** www.managevent.com.au (the staff console is `/admin` on the same host)
- **Local port:** 3100
- **Open backlog:** MKT-05 (packages catalogue), MKT-10 (Perth local SEO), MKT-14 (analytics with consent), and the staff console items ADM-02 to ADM-08 (see [`ROADMAP.md`](../../ROADMAP.md))

The public site (home with the cost estimator, ceremonies and ten ceremony pages, services, invitations, pricing, how it works, venues, memorials, about, contact, FAQ and the legal pages), the enquiry form that creates a lead through `POST /v1/leads`, and the staff console at `/admin` (sign-in with password and TOTP, enquiry inbox, enquiry detail and the contact-details settings page). What each file does is in [`README.md`](README.md).

**Planned, not built:** `/packages` and `/packages/[slug]` (MKT-05; today they redirect to `/pricing`), `/perth` and other city pages (MKT-10), analytics and a consent banner (MKT-14), and every staff module other than enquiries (ADM-02 to ADM-08).

## Specification

`WEBSITE.md` Part A (Part C for cross-domain rules). Where the spec and the code differ, the code and `README.md` describe what exists; the spec describes the target.

## Stack

Next.js (App Router), Tailwind v4, the brand shell in `packages/ui` (`@managevent/ui/brand`), shared with `apps/invitation`. No Framer Motion, shadcn/ui or MDX: legal pages render from `packages/i18n`.

## Depends on (contracts; do not modify from this app)

`ui`, `i18n`, `validators`, `types`, `api-client`, `config`. Plan figures are read from `packages/payments/src/plans.ts` at build time by `lib/plans.ts`, without a package dependency.

## Layout

```text
app/
  [locale]/            # public pages; proxy.ts rewrites unprefixed URLs into /en
    page.tsx  about/  ceremonies/  ceremonies/[slug]/  contact/  faq/  how-it-works/
    invitations/  memorials/  pricing/  services/  venues/  [...document]/ (privacy, terms, accessibility)
  admin/               # staff console: its own root layout, outside the locale tree
  api/auth/[...all]/   # same-origin Better Auth proxy for the console sign-in
  actions.ts           # submitEnquiry server action → POST /v1/leads
  sitemap.ts  robots.ts  opengraph-image.tsx
components/            # app-specific only; shared ones belong in packages/ui
lib/                   # content loader, site routes, contact details (contact.ts), plans, admin helpers (lib/admin)
proxy.ts  next.config.ts
```

## Rules specific to this app

- Content comes from the root `content/` folder and is parsed with its Zod schemas when pages build (`lib/content.ts`); invalid content fails the build.
- The estimator's rates are placeholders marked `DECISION-NEEDED(pricing)` until the founder approves them (DEC-01). Do not present them as quotes.
- Honesty: no testimonials, partner venues, agency prices or unreleased invitation features in copy (`lib/site-pages.test.ts` guards it). Testimonials and gallery items, when added, need `verified` and a consent record before they render.
- No analytics or marketing pixels before consent, and no PII in analytics (MKT-14, PRV-03).
- City pages, when built, must pass the thin-content guard (WEBSITE.md §A7); gated cities return 404.
- Memorial Mode applies to solemn routes and memorial enquiries through `getExperienceMode()`.
- The staff console shows only what the API returns, is never cached or indexed, and checks the staff session on every page and every server action (`lib/admin/server.ts`). The API remains the authority.
- The browser calls the API only through `/api/auth/*`; everything else is server-side.
- Contact details are never hard-coded or read from `process.env` by a page: use `await getContact()` (`lib/contact.ts`). A page that reads them is prerendered and refreshed every 60 seconds; the staff settings page (`/admin/settings`) is where they are changed. A blank phone must hide every phone link.

## Environment variables

`API_URL` and `API_PROXY_SECRET` (server-side, shared secret with the API), `NEXT_PUBLIC_INVITATION_URL`, and `CONTACT_EMAIL` / `CONTACT_PHONE` (optional: the fallback shown only if the API cannot be reached; the real values are staff settings, see below). The names are listed in the root `.env.example`.

## Tests required

Vitest next to the code (content loader, site, venue prefill, admin helpers, auth proxy). Playwright `test:e2e` (desktop and Pixel 7 against `tests/mock-api.mjs`, with axe; runs in CI) and `test:e2e:real` (the staff console against the real API and PostgreSQL). Lighthouse CI budgets (WEBSITE.md §A13) are not set up yet.

## Status

Built and running locally against the real API: every public page listed above, the enquiry form and the staff console (enquiries and contact settings). Not deployed from this branch yet (OPS-01). Old `/fa` URLs redirect to English; only en-AU is shipped.
