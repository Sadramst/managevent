# @managevent/marketing

The marketing site and the staff console: `www.managevent.com.au` (local port `3100`). English only (en-AU). Rules for working here are in [`AGENTS.md`](AGENTS.md); what is still to build is in [`ROADMAP.md`](../../ROADMAP.md) (MKT-05, MKT-10, MKT-14, ADM-02 to ADM-08).

## Running locally

From the repo root, with PostgreSQL and the API running (see [`apps/api/README.md`](../api/README.md)):

```bash
pnpm with-env pnpm --filter @managevent/marketing dev     # http://localhost:3100
pnpm --filter @managevent/marketing test                  # Vitest
pnpm --filter @managevent/marketing build
pnpm --filter @managevent/marketing test:e2e              # Playwright against the mock API (needs a build)
PW_CHANNEL=chrome pnpm --filter @managevent/marketing test:e2e:real  # staff console against the real API
```

`PW_CHANNEL=chrome` (or `msedge`) uses an installed browser instead of Playwright's bundled one. How production is deployed: [`DEPLOYMENT.md`](../../DEPLOYMENT.md).

## Public site

- **Routes:** `/`, `/ceremonies`, `/ceremonies/[slug]` (ten ceremonies from `content/ceremonies`), `/services`, `/invitations`, `/pricing`, `/how-it-works`, `/venues`, `/memorials`, `/about`, `/contact`, `/faq`, plus `/privacy`, `/terms` and `/accessibility`. The list lives in `lib/site.ts` (`routes`, `sitemapPaths`) and feeds the header, footer and `app/sitemap.ts`. Every other path is the branded 404 (`app/[locale]/not-found.tsx`).
- **Proxy:** `proxy.ts` rewrites public URLs into `/en`, redirects `/en/...` to the unprefixed URL and old `/fa/...` URLs to English, leaves `/api/*` alone, and passes `/admin/*` to the console's own root layout with `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.
- **Redirects and headers:** `next.config.ts` holds the alias redirects (`/plan`, `/book`, `/packages`, `/legal/*` ...) and the security headers. The Content-Security-Policy allows inline scripts because the App Router streams its payload inline; a nonce-based policy would force every page to render on demand.
- **Copy:** `packages/i18n/src/site-pages.ts` (`getSitePages(locale)`, `fillCopy()`), plus `ceremony-pages.ts` and `launch.ts`. Invitation prices are never written into copy: `lib/plans.ts` reads the Premium price and the Free guest limit from `packages/payments/src/plans.ts` at build time and falls back to the figures in `docs/business/PRICING_MODEL.md`.
- **Content:** `lib/content.ts` reads `content/ceremonies` and `content/locations/perth/venues.json` and parses them with their Zod schemas. `lib/settings.ts` shows only venue records with reviewed copy, so placeholder names or capacities never reach a page.
- **Shared page parts:** `components/page-kit.tsx` (breadcrumbs with BreadcrumbList data, JSON-LD, arch card, check list, closing call to action), `components/plan-table.tsx` and `components/ceremony-kit.tsx`. Page styles are in `app/site-pages.css` (`sp-` prefix) and `app/ceremony-pages.css`.
- **Cost estimator** (`/#estimator`, `components/event-estimator.tsx`): live AUD bands including GST and a logistics preview. Its rates are working assumptions marked `DECISION-NEEDED(pricing)` until DEC-01 is decided.
- **Enquiry form** (`components/enquiry-form.tsx`, on `/#enquiry` and `/contact`): the `submitEnquiry` server action (`app/actions.ts`) validates with `LeadCreateSchema` and calls `POST /v1/leads` with an idempotency key and the visitor's address. It has a hidden honeypot field and an unticked marketing-consent box. `?venue=<slug>` and `?ceremony=<slug>` prefill it (`lib/venue-prefill.ts`); unknown values are ignored, and it makes no booking or availability claim.
- **Contact details:** the email and phone in the footer, on `/contact`, `/memorials`, the legal pages and the structured data are staff settings. `lib/contact.ts` (`getContact()`) reads `GET /v1/site-settings` through the API client inside Next's data cache (60 seconds, tag `site-settings`), so a change reaches every prerendered page without a rebuild. If the API cannot be reached it falls back to `CONTACT_EMAIL` / `CONTACT_PHONE`, else `appilico.au@gmail.com` and no phone, so a page never breaks. A blank phone hides every phone link. `app/[locale]/layout.tsx` sets `revalidate = 60` so a page built while the API was down heals itself.
- **Honesty rules:** no testimonials, partner venues, agency prices or unreleased invitation features. `lib/site-pages.test.ts` guards the copy.

## Staff console (`/admin`)

A back-office view of the enquiries people send through the site, and the settings page for the public contact details. It is for Managevent staff (`PLANNER_STAFF`, `SUPER_ADMIN`) and shows only what the API holds: no events, partners or finance screens exist yet, so none are shown.

- **Routes** (`app/admin`, its own root layout, outside the locale tree):
  - `/admin/sign-in`: email and password, then the authenticator code. No sign-up, magic link or password reset. After sign-in the server checks `GET /v1/me`; an account without a staff role is signed out again and told "This area is for Managevent staff".
  - `/admin`: the inbox from `GET /v1/leads`. Stage tabs, search (name, email, phone, area) and cursor paging with "Load more". Tab totals appear while every enquiry fits in one API page (100); beyond that the tabs show no numbers rather than wrong ones.
  - `/admin/leads/[leadId]`: contact details (`mailto:`, `tel:`), event details, message, source and UTM, marketing consent, stage moves, internal notes and "Assign to me", all through server actions calling `PATCH /v1/leads/{leadId}`.
  - `/admin/settings`: edit the public contact email, phone and the enquiry-alert address (`GET` and `PUT /v1/admin/site-settings`, permission `site_settings:manage`). Saving expires the cached contact details and the prerendered pages (`updateTag`, `revalidatePath`), so visitors see the change at once on this server. Each save is audited (which fields changed, never their values).
  - `/admin/sign-out`: a form post, so signing out works without JavaScript.
- **Auth:** the browser talks to Better Auth through `app/api/auth/[...all]/route.ts`, a same-origin proxy to `${API_URL}/api/auth/*`. It forwards `Origin`, `Referer` and the cookie, passes every `Set-Cookie` back, and sends the visitor's address with `API_PROXY_SECRET` (`lib/auth-proxy.ts`). It forwards to the API's `/api/auth/` mount and nowhere else (anything outside it is a 404 here), and never relays the API's CORS headers. The API is only ever called server-side (`lib/admin/server.ts`).
- **Access:** every console page starts with `requireStaff()`, and every server action that reads or changes an enquiry starts with `requireStaffForAction()` (`lib/admin/server.ts`): a server action is a public POST endpoint, so it checks the session on each call. A signed-in account without a staff role (a host) is refused before the API is asked for any enquiry. The API checks the role again on every lead route and remains the authority.
- **Visitor address:** `lib/client-ip.ts` reads only `x-real-ip` and `x-forwarded-for`, the two headers our edge (Caddy) writes on every request. The public enquiry form forwards it to the API as well, so rate limits and the marketing-consent record see the visitor, not this server.
- **Never cached or indexed:** every `/admin/*` response is `private, no-store` and `noindex`; `robots.txt` disallows `/admin`; the sitemap never lists it.
- **Memorial Mode:** an enquiry about a funeral, memorial, celebration of life or wake is marked in the inbox and its detail page renders in Memorial Mode (through `getExperienceMode()`).
- **Copy:** `packages/i18n/src/admin-pages.ts` (`getAdminPages(locale)`). **Helpers:** `lib/admin/leads.ts` (stage moves, Perth-time dates, query parsing, safe redirects), unit tested.
- **Environment:** `API_URL` (server-side API origin) and `API_PROXY_SECRET` (shared with the API). The API must list this site's origin in its trusted origins (`AUTH_TRUSTED_ORIGINS` or `NEXT_PUBLIC_MARKETING_URL`).
- **Creating a staff account:** `pnpm with-env pnpm --filter @managevent/api staff:create -- --email <email> --name "<name>" --role PLANNER_STAFF` (from the repo root). It prints the password and the authenticator URI once. Managing staff from the console is ADM-08.
- **Planned:** proposals (ADM-02), the event command centre (ADM-03), vendor verification (ADM-04), inventory (ADM-05), finance (ADM-06), content editing (ADM-07) and the audit log viewer (ADM-08). Staff sessions currently last 30 days like everyone else's; 8 hours is OPS-10.

### Tests

- `playwright.config.ts` (`test:e2e`): the public site against the mock API (`tests/mock-api.mjs`), desktop and Pixel 7, with axe; this is the browser suite CI runs. It checks that `/admin` redirects a signed-out visitor to sign-in.
- `playwright.real.config.ts` (`test:e2e:real`): `tests/admin.spec.ts` against the real API and the local PostgreSQL. It starts its own API on port 4110 and the site on port 3110, creates a staff account with the CLI, sends real enquiries through `/contact`, signs in with a computed authenticator code, and afterwards soft-deletes the rows it created (they all use `@e2e.managevent.test` addresses). It needs `pnpm db:local:detach` and a build first. Set `ADMIN_QA_DIR` to save 1440px and 390px screenshots.
