# @managevent/marketing

Marketing site and staff console: `www.managevent.com.au` (local port `3100`)

The public platform for Managevent in Perth, Western Australia. It covers all ceremony verticals from 0 to 100 (Weddings, Milestone Birthdays, Corporate Galas, Cultural Ceremonies, and Celebration of Life / Memorials), the 0-to-100 Services matrix, the **Instant Event & Ceremony Cost Estimator** (`#estimator`), curated Perth Venues, the Digital RSVP-to-Catering Bridge showcase, the Enquiry & Consultation booking form, and the staff console for enquiries (`/admin`, staff sign-in required).

## Language Architecture

- **Language**: English only (en-AU), served at `/`. Legacy `/fa` URLs redirect to English. No Persian content is shipped.
- **Multi-Language Expansion Ready**: Built on `@managevent/i18n` with full dictionary parity testing and logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `inset-inline-*`), allowing other locales to be added later through a `contract-change`.

## Key Surfaces

1. **Homepage (`/[locale]`)**:
   - Editorial Perth hero with trust stats and quick navigation.
   - All-events vertical cards (Weddings, Engagements, Milestone Birthdays, Corporate Galas, and Memorials & Wakes with automatic Memorial Mode palette).
   - **0-to-100 Full-Stack Services Showcase**: Concept & Run-Sheet, Venue Sourcing, Catering & Bar (Halal/Dietary/RSA), Styling & Florals, Audio/Visual & Crew, Digital Invitations & QR Check-in.
   - **Interactive Event & Ceremony Cost Estimator (`#estimator`)**: Calculates live AUD (incl. 10% GST) low/high investment bands, Ex-GST + GST splits, and logistics bridge outputs (banquet tables, catering portions with buffer, service crew, and cake serves), with one-click transfer into the Enquiry Form.
   - **Curated Perth Venues Showcase**: Validated from `/content/venues/perth.json` across Swan Valley, Perth CBD, Fremantle, South Perth, and Cottesloe.
   - **Ask about this venue**: each venue card links to `/?venue=<slug>#enquiry`. The enquiry form reads `venue` on the client, and a known slug shows a note and prefills the editable message. Unknown, empty or repeated values are ignored (`lib/venue-prefill.ts`, `resolveVenueName`). Copy keys: `launchVenueAsk`, `launchVenueNote`, `launchVenuePrefill` in `packages/i18n/src/launch.ts`. It makes no booking or availability claim.
   - **Enquiry & Consultation Form**: Server Action (`submitEnquiryAction`) posting to `POST /v1/leads` with Zod validation, honeypot protection, and unticked marketing consent.
2. **Staff console (`/admin`)**: see [Staff console](#staff-console-admin) below. It shows real enquiries from the API to signed-in staff only; there is no sample data.
3. **Legal & Compliance Pages (`/[locale]/[...document]`)**:
   - `/privacy`, `/terms`, and `/accessibility` (WCAG 2.2 AA). The route is a catch-all, so every other unmatched path reaches `notFound()` inside the locale layout and gets the branded 404 page (`app/[locale]/not-found.tsx`).

## Commands

Run from repository root:

```bash
pnpm --filter @managevent/marketing dev       # Port 3100
pnpm --filter @managevent/marketing build
pnpm --filter @managevent/marketing test
pnpm --filter @managevent/marketing test:e2e  # Playwright desktop/mobile + axe a11y suite
PW_CHANNEL=chrome pnpm --filter @managevent/marketing test:e2e  # same, using installed Chrome
PW_CHANNEL=chrome pnpm --filter @managevent/marketing test:e2e:real  # staff console against the real API
```

Deployment and secret-entry instructions: [../../infra/DEPLOY_RUNBOOK.md](../../infra/DEPLOY_RUNBOOK.md) and [../../docs/business/PERTH_STRATEGY.md](../../docs/business/PERTH_STRATEGY.md).

## Site structure (enterprise uplift)

- **Routes:** `/`, `/ceremonies`, `/ceremonies/[slug]`, `/services`, `/invitations`, `/pricing`, `/how-it-works`, `/venues`, `/memorials`, `/about`, `/contact`, `/faq`, plus `/privacy`, `/terms`, `/accessibility`. The list lives in `lib/site.ts` (`routes`, `sitemapPaths`) and feeds the header, footer and `app/sitemap.ts`.
- **Copy:** `packages/i18n/src/site-pages.ts` (`getSitePages(locale)`, `fillCopy()`). Invitation prices are never written into copy; `lib/plans.ts` reads the Premium price and Free guest limit from `packages/payments/src/plans.ts` at build time and falls back to the figures in `docs/business/PRICING_MODEL.md`.
- **Shared page parts:** `components/page-kit.tsx` (breadcrumbs with BreadcrumbList data, JSON-LD, arch card, check list, closing call to action) and `components/plan-table.tsx`. Page styles are in `app/site-pages.css` (`sp-` prefix).
- **Enquiry form:** one component on `/#enquiry` and `/contact`. It accepts `?venue=<slug>` and `?ceremony=<slug>` prefills and submits without JavaScript.
- **Redirects and headers:** `next.config.ts` holds the alias redirects (`/plan`, `/book`, `/packages`, `/legal/*` ...) and the security headers. The Content-Security-Policy allows inline scripts because the App Router streams its payload inline; a nonce-based policy would force every page to render on demand.
- **Proxy:** `proxy.ts` rewrites public URLs into `/en`, leaves `/api/*` alone, and passes `/admin/*` to the console's own root layout with `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.
- **Honesty rules:** no testimonials, partner venues, agency prices or unreleased invitation features. `lib/site-pages.test.ts` guards the copy.

## Staff console (`/admin`)

A back-office view of the enquiries people send through the site. It is for Managevent staff (`PLANNER_STAFF`, `SUPER_ADMIN`) and shows only what the API holds: no events, partners or finance screens exist yet, so none are shown.

- **Routes** (`app/admin`, its own root layout, outside the locale tree):
  - `/admin/sign-in`: email and password, then the authenticator code. No sign-up, magic link or password reset. After sign-in the server checks `GET /v1/me`; an account without a staff role is signed out again and told "This area is for Managevent staff".
  - `/admin`: the inbox from `GET /v1/leads`. Stage tabs, search (name, email, phone, area) and cursor paging with "Load more". Tab totals appear while every enquiry fits in one API page (100); beyond that the tabs show no numbers rather than wrong ones.
  - `/admin/leads/[leadId]`: contact details (`mailto:`, `tel:`), event details, message, source and UTM, marketing consent, stage moves, internal notes and "Assign to me", all through server actions calling `PATCH /v1/leads/{leadId}`.
  - `/admin/sign-out`: a form post, so signing out works without JavaScript.
- **Auth:** the browser talks to Better Auth through `app/api/auth/[...all]/route.ts`, a same-origin proxy to `${API_URL}/api/auth/*`. It forwards `Origin`, `Referer` and the cookie, passes every `Set-Cookie` back, and sends the visitor's address with `API_PROXY_SECRET` (`lib/auth-proxy.ts`). It forwards to the API's `/api/auth/` mount and nowhere else (anything outside it is a 404 here), and never relays the API's CORS headers. The API is only ever called server-side (`lib/admin/server.ts`).
- **Access:** every console page starts with `requireStaff()`, and every server action that reads or changes an enquiry starts with `requireStaffForAction()` (`lib/admin/server.ts`): a server action is a public POST endpoint, so it checks the session on each call. A signed-in account without a staff role (a host) is refused before the API is asked for any enquiry. The API checks the role again on every lead route and remains the authority.
- **Visitor address:** `lib/client-ip.ts` reads only `x-real-ip` and `x-forwarded-for`, the two headers our edge (Caddy) writes on every request. The public enquiry form forwards it to the API as well, so rate limits and the marketing-consent record see the visitor, not this server.
- **Never cached or indexed:** every `/admin/*` response is `private, no-store` and `noindex`; `robots.txt` disallows `/admin`; the sitemap never lists it.
- **Memorial Mode:** an enquiry about a funeral, memorial, celebration of life or wake is marked in the inbox and its detail page renders in Memorial Mode (through `getExperienceMode()`).
- **Copy:** `packages/i18n/src/admin-pages.ts` (`getAdminPages(locale)`). **Helpers:** `lib/admin/leads.ts` (stage moves, Perth-time dates, query parsing, safe redirects), unit tested.
- **Environment:** `API_URL` (server-side API origin) and `API_PROXY_SECRET` (shared with the API). The API must list this site's origin in its trusted origins (`AUTH_TRUSTED_ORIGINS` or `NEXT_PUBLIC_MARKETING_URL`).
- **Creating a staff account:** `node scripts/with-env.mjs pnpm --filter @managevent/api staff:create -- --email <email> --name "<name>" --role PLANNER_STAFF` (from the repo root). It prints the password and the authenticator URI once.

### Tests

- `playwright.config.ts` (`test:e2e`): the public site against the mock API. It checks that `/admin` redirects a signed-out visitor to sign-in.
- `playwright.real.config.ts` (`test:e2e:real`): `tests/admin.spec.ts` against the real API and the local PostgreSQL. It starts its own API on port 4110 and the site on port 3110, creates a staff account with the CLI, sends real enquiries through `/contact`, signs in with a computed authenticator code, and afterwards soft-deletes the rows it created (they all use `@e2e.managevent.test` addresses). It needs `pnpm db:local:detach` and a build first. Set `ADMIN_QA_DIR` to save 1440px and 390px screenshots.
