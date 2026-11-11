# @managevent/invitation

Invitations: `invitation.managevent.com.au` (local port `3001`)

The **Host Studio** (create, design, AI wording, guests, share, responses, photo wall, wishing well or tribute book, settings) and the **guest micro-site** (gate reveal, Story, Timeline and Gallery views, RSVP, QR pass, photo wall, calendar and maps). It merges `appilico-invitations` and `anniversary-invitation`. See [MIGRATION.md](../../MIGRATION.md).

## Status

✅ **Built and tested locally (`INV-01` … `INV-15`).**

- **Host Studio (`/studio`)**: Multi-step create flow, AI wording assistant (`@managevent/ai`), guest & party management, Share Studio (`wa.me`, QR codes, email invitations), responses dashboard with UTF-8 BOM CSV export, and Premium Event Pass (`$69 AUD incl. GST`, free for Memorial Mode).
- **Guest Micro-site (`/i/[eventSlug]/[guestToken]`)**: Server-rendered core event details (works without JavaScript), reduced-motion-aware envelope gate reveal, Story/Timeline/Gallery views, idempotent RSVP form with encrypted dietary & allergy capture (`headcount.changed`), signed QR passes, moderated Photo Wall, and Wishing Well / Tribute Book.
- **Memorial Mode**: Automatic calm palette (`#F4F3EF` / `#1C222B` / `#5B6B7A`), respectful wording, Tribute Book in place of Wishing Well, and zero celebratory motion or upsells.
- **Deployment Config**: Includes `apps/invitation/vercel.json` pinned to Sydney (`"regions": ["syd1"]`).
