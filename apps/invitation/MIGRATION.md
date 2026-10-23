# Migration plan: appilico-invitations + anniversary-invitation → apps/invitation

## Sources

- `Sadramst/appilico-invitations`: Next.js 15, Tailwind v3, in-memory store, multi-tenant prototype.
- `Sadramst/anniversary-invitation`: Next.js 16, Tailwind v4, static per-guest pages, 299 tests.

## Port map

| From                                                                                                  | To                                                                                                            | Action                                                                                 |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| appilico `src/lib/themes.ts` (5 themes)                                                               | `packages/ui/themes/*`                                                                                        | Re-express as tokens. Add 2 memorial themes.                                           |
| appilico `components/invitation/ArchDecoration`, `VectorFlorals`                                      | `packages/ui/ornaments`                                                                                       | Port, make RTL-safe, add `experienceMode`                                              |
| appilico `InvitationHero`, `InvitationStory`, `VenueScheduleSection`, `CountdownTimer`, `AudioPlayer` | `apps/invitation/components/views/*`                                                                          | Port, then make server-render-first (anniversary approach)                             |
| appilico `RsvpDrawer`                                                                                 | `apps/invitation/components/rsvp/*`                                                                           | Rebuild against `validators` (`RsvpSubmit`), with per-person dietary fields            |
| appilico `dashboard/*` (GuestTable, StatsOverview, QrCodeModal, AddPartyModal, WhatsAppStudioModal)   | `apps/invitation/components/studio/*`                                                                         | Port the UI. Data comes from the API.                                                  |
| appilico `ThemeStudio`                                                                                | `studio/[eventId]/design`                                                                                     | Port                                                                                   |
| appilico `lib/pricing-plans.ts`                                                                       | `packages/payments/plans`                                                                                     | Re-model as entitlements (WEBSITE.md §B14)                                             |
| appilico `lib/csv-helper.ts`                                                                          | `packages/integrations/csv` (or `apps/api`)                                                                   | Keep the UTF-8 BOM behaviour                                                           |
| appilico `lib/slug-generator.ts` and anniversary `scripts/lib/slugs.mjs`                              | `apps/api` invitations module                                                                                 | **Change:** HMAC(pepper, event.salt + party.stableId). Keep the 31-character alphabet. |
| anniversary `lib/event.ts` (deterministic formatters), `AddToCalendar`, `.ics` embedding              | `packages/i18n` formatters, `packages/integrations/ics`                                                       | Port with the tests                                                                    |
| anniversary `LanguageProvider` (URL-based language)                                                   | `apps/invitation`                                                                                             | Port the approach                                                                      |
| anniversary `tests/e2e/*` (privacy, mobile-webview, i18n, actions)                                    | `apps/invitation/tests/e2e`                                                                                   | Port and extend                                                                        |
| anniversary `data/*.json` (guests, content)                                                           | **Not ported as files.** Imported into the DB by a one-off script (INV-14). Real guest data stays out of git. |                                                                                        |
| anniversary `links-export.csv`                                                                        | Used by the import script to create `LegacySlug` rows, then discarded                                         |                                                                                        |

## Legacy link continuity (INV-14)

1. Create the anniversary event in the DB (the owner as host). Import parties and guests with new `stableId`s.
2. For each row in `links-export.csv`, create `LegacySlug(legacyPath="/anniversary/<slug>", partyId)`.
3. Add the rewrite in the **appilico-website** project: `/anniversary/:path*` → `https://invitation.managevent.com.au/legacy/anniversary/:path*`.
4. Test that every legacy URL renders the right greeting and that the WhatsApp OG preview still works.
5. Archive both old repos (read-only) after a 30-day overlap.

## Security note

The legacy repo committed its slug salt. After migration, treat those slugs as **known-public tokens**. The imported event should keep `allowForwarding=false`, and the owner may choose to reissue links.
