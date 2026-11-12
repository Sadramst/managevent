# AGENTS.md: apps/invitation

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Invitations: invitation.managevent.com.au**

- **Domain:** invitation.managevent.com.au
- **Local port:** 3001
- **Phase:** Phase 2. **Backlog:** INV-01 … INV-15 (see `ROADMAP.md`)

The **Host Studio** (create, design, AI wording, guests, share, responses, photo wall, wishing well or tribute book, settings) and the **guest micro-site** (gate reveal, Story, Timeline and Gallery views, RSVP, QR pass, photo wall, calendar and maps). It merges `appilico-invitations` and `anniversary-invitation`. See `MIGRATION.md`.

## Specification

`WEBSITE.md` Part B (all sections). Part C for cross-domain rules.

## Stack

English only (en-AU). Next.js (App Router), Tailwind v4, `packages/ui` themes. Server-rendered guest pages. The gate reveal is a CSS animation, which keeps the guest bundle small (`framer-motion` is installed but not used).

## Depends on (contracts; do not modify from this app)

`ui` (themes), `i18n`, `validators`, `types`, `payments` (plans and entitlements, read-only), `api-client`, `config`

## Layout

```text
app/
  (site)/…                             # public and sign-in pages: www header and footer (SiteChrome)
  studio/…                             # Host Studio: signed-in host required, StudioShell chrome, noindex
  check-in/[eventId]/                  # door check-in, noindex
  i/[eventSlug]/[guestToken]/…         # guest micro-site: no site chrome, noindex
  legacy/[...path]/  anniversary/  e/  # old links, resolved by the API
  api/auth/[...all]/route.ts           # same-origin auth proxy (the only browser → API path)
proxy.ts                               # request path for the sign-in redirect; guest-link 410s
components/ui/  components/site/  components/studio/  components/auth/  (+ gate, rsvp, views)
lib/server-api.ts  session.ts  action-result.ts  next-path.ts  urls.ts  dates.ts  metadata.ts
```

See `README.md` for what each file is for.

## Rules specific to this app

- No data lives here: no in-memory stores, no hard-coded sample data, no salts or token derivation. Everything goes through `getServerApi()` (`lib/server-api.ts`), server-side only. The browser reaches the API only through `/api/auth/*`.
- "Who is signed in" and "what this deployment can do" come from `GET /v1/me` (`getMe()`, `requireHost()` in `lib/session.ts`). Never read the session cookie. When a capability is false, say so plainly and offer the alternative; never fake the feature.
- Server actions return `ActionResult<T>` (`lib/action-result.ts`, use `runAction`). `?next=` values go through `safeNextPath` (`lib/next-path.ts`).
- Look and feel is the shared brand shell (`@managevent/ui/brand`, `brand.css`) plus `components/ui`. No palette utilities (`stone-`, `amber-` ...) and no hex values; guest pages use their invitation theme from `@managevent/ui/themes`.
- Client components take their copy as props from a server component; do not import `@managevent/i18n` values into the browser bundle.
- Import plan data from `@managevent/payments/plans` (the package root pulls in the Stripe SDK).

- `noindex, nofollow, noarchive` goes on every route except `/` and `/templates`, as both an HTTP header **and** a meta tag. `robots.txt` disallows `/i/`, `/studio/`, `/display/` and `/legacy/`.
- Guest pages: the core details render without JavaScript. Do not use `localStorage` or `sessionStorage`. Language and mute state live in the URL. Date formatting is deterministic.
- Music plays only after the guest taps, with a persistent mute control. Use the licensed library or rights-attested uploads only.
- The guest's name never appears in Open Graph tags or images.
- Unknown token → 404. Revoked token → 410. An event that is not the host's → 404. These are real status codes: never put a `loading.tsx` above a layout or page that calls `notFound()` (the response would already have started with 200).
- The RSVP form is idempotent (`Idempotency-Key`) and never loses entered data on a network error.
- Memorial events: memorial themes only, gentle motion, tribute book, no auto-approve on the photo wall, no upsells.
- Port tests from both legacy repos (i18n parity, slug and token tests, in-app browser e2e).

## Environment variables

`API_URL` (server-side base URL of the API), `API_PROXY_SECRET` (shared with the API), `NEXT_PUBLIC_INVITATION_URL`, `NEXT_PUBLIC_MARKETING_URL`. The names are listed in the root `.env.example`. `NEXT_PUBLIC_API_URL` is not used: the browser never calls the API.

## Tests required

Vitest (`lib/**`, `components/**`, `app/**`, next to the code). Playwright in `tests/e2e` against the real stack: projects `desktop` (1440px) and `mobile` (Pixel 7); the WhatsApp, Instagram and Facebook in-app user agents, no-JavaScript, reduced-motion and the memorial fixture are `test.describe` blocks inside those projects. Axe scan (WCAG 2.2 AA) on every page. Still to add: a WebKit (iPhone Safari) project, which needs `playwright install webkit`.

## Status

Built on the real API, end to end: public pages (home, templates, pricing, email preferences), sign-in and sign-up, the Host Studio (wizard, overview, design, details, guests, share, responses, awaiting replies, settings), the guest micro-site (gate, details, RSVP with dietary needs, wishing well or tribute book, passes, calendar), door check-in and the old-link routes. No stand-in pages and no in-memory data remain. `tests/e2e` runs the whole journey in a browser against PostgreSQL and the API (README "Browser tests"). Not yet exercised against live services: email sending (invitations, reminders, magic links, password reset) and Stripe Checkout, which the pages offer only when `GET /v1/me` reports the capability. Not built: uploads (images and music are host-supplied https links), photo wall, co-host invitations.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
