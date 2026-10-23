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

Next.js (App Router), Tailwind v4, Framer Motion (gate reveal), `packages/ui` themes. Server-rendered guest pages.

## Depends on (contracts; do not modify from this app)

`ui` (themes), `i18n`, `validators`, `types`, `payments` (plans and entitlements, read-only), `api-client`, `config`

## Proposed layout

```text
app/
  page.tsx  templates/…                # public
  studio/…                             # host (auth), noindex
  i/[eventSlug]/[guestToken]/…         # guest micro-site, noindex
  display/[eventId]/[displayToken]/    # projector view
  legacy/[...path]/                    # Appilico legacy links
components/gate/  components/views/  components/rsvp/  components/studio/
lib/tokens.ts (client helpers only; derivation is server-side in apps/api)
```

## Rules specific to this app

- `noindex, nofollow, noarchive` goes on every route except `/` and `/templates`, as both an HTTP header **and** a meta tag. `robots.txt` disallows `/i/`, `/studio/`, `/display/` and `/legacy/`.
- Guest pages: the core details render without JavaScript. Do not use `localStorage` or `sessionStorage`. Language and mute state live in the URL. Date formatting is deterministic.
- Music plays only after the guest taps, with a persistent mute control. Use the licensed library or rights-attested uploads only.
- The guest's name never appears in Open Graph tags or images.
- Unknown token → 404. Revoked token → 410.
- The RSVP form is idempotent (`Idempotency-Key`) and never loses entered data on a network error.
- Memorial events: memorial themes only, gentle motion, tribute book, no auto-approve on the photo wall, no upsells.
- Port tests from both legacy repos (i18n parity, slug and token tests, in-app browser e2e).

## Environment variables

NEXT_PUBLIC_INVITATION_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MEDIA_CDN_URL, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. The names are listed in the root `.env.example`.

## Tests required

Vitest. Playwright projects: iPhone Safari, Android Chrome, WhatsApp, Instagram and Facebook in-app user agents, no-JavaScript, reduced-motion, FA RTL, memorial fixture. Axe scan.

## Status

⬜ Not scaffolded. The first issue scaffolds it using the current stable framework version (pin exact versions).
