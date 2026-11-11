# @managevent/invitation

Invitations: `invitation.managevent.com.au` (local port `3001`)

The **Host Studio** (create, design, AI wording, guests, share, responses, photo wall, wishing well or tribute book, settings) and the **guest micro-site** (gate reveal, Story, Timeline and Gallery views, RSVP, QR pass, photo wall, calendar and maps). It merges `appilico-invitations` and `anniversary-invitation`. See [MIGRATION.md](MIGRATION.md).

## Language

English only (en-AU). There is no `fa` locale, Jalali calendar or Persian ceremony content. Dates on guest pages are formatted deterministically, and the calendar `.ics` helpers live in `app/i/[eventSlug]/[guestToken]/calendar.ics/ics-helpers.ts`. Guest pages include a `NoscriptFallback` so who, when and where still show without JavaScript.

## Status

✅ **Built and tested locally (`INV-01` … `INV-15`).**

- **Host Studio (`/studio`)**: Multi-step create flow, AI wording assistant (`@managevent/ai`), guest & party management, Share Studio (`wa.me`, QR codes, email invitations), responses dashboard with UTF-8 BOM CSV export, and Premium Event Pass (`$69 AUD incl. GST`, free for Memorial Mode).
- **Guest Micro-site (`/i/[eventSlug]/[guestToken]`)**: Server-rendered core event details (works without JavaScript), reduced-motion-aware envelope gate reveal, Story/Timeline/Gallery views, idempotent RSVP form with encrypted dietary & allergy capture (`headcount.changed`), signed QR passes, moderated Photo Wall, and Wishing Well / Tribute Book.
- **Memorial Mode**: Automatic calm palette (`#F4F3EF` / `#1C222B` / `#5B6B7A`), respectful wording, Tribute Book in place of Wishing Well, and zero celebratory motion or upsells.
- **Deployment Config**: Includes `apps/invitation/vercel.json` pinned to Sydney (`"regions": ["syd1"]`).

## Awaiting replies (PROD-INV-01)

`/studio/[eventId]/awaiting` lists parties that have not replied, shows days left to the RSVP deadline (or "Replies requested by DD/MM/YYYY" for Memorial Mode), and offers a copyable plain-text reminder per party. Logic lives in `lib/rsvp-chase.ts`, copy in `lib/rsvp-chase-copy.ts` (local until moved to `packages/i18n` via a contract-change). The message never includes tokens, links or dietary data. Nothing is sent. The route is as open as the other studio routes until the auth gate lands (DECISION-NEEDED in the page), and nothing links to it from `studio/[eventId]/page.tsx` yet. `CopyButton.tsx` is a small client component for the clipboard button. Tests: `lib/rsvp-chase.test.ts` (note: `vitest.config.ts` only includes `tests/**` and `src/**`, so widen it to include `lib/**` for this file to run).
