# Reference repositories

| Repo                               | What it is                                                                                                                 | What we take                                                                                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Sadramst/anniversary-invitation`  | A finished single-event static invitation (Next.js 16, Tailwind v4, EN/FA, 299 tests)                                      | The guest experience polish: server-rendered core, offline `.ics`, deterministic date formatting, URL-based language, in-app browser e2e tests, permanent hashed slugs, privacy headers, WhatsApp OG previews |
| `Sadramst/appilico-invitations`    | Early multi-tenant prototype (Next.js 15, Tailwind v3): themes, dashboard, RSVP drawer, WhatsApp studio, QR, pricing tiers | The 5 themes, dashboard and studio UX, guest table, the RSVP drawer pattern, pricing entitlement tests, the CSV helper (UTF-8 BOM)                                                                            |
| AI Studio prototype (owner's link) | Not accessible to automated tools. Spec captured in WEBSITE.md §B5 from the owner's description.                           | Gate or envelope reveal, view modes, AI wording assistant, the RSVP-to-logistics idea                                                                                                                         |

## Known issues to **not** carry over

- **Committed slug salt** (anniversary repo). Salts are now per event, stored in the DB, plus an environment pepper.
- **Token tied to name spelling.** Tokens now derive from an immutable `stableId`.
- **In-memory store** (appilico-invitations `store.ts`). Use the real API and DB.
- **Mixed Tailwind v3 and v4.** Standardise on v4 through `packages/config`.
- Part of `appilico-invitations/README.md` is UTF-16 encoded (stray bytes). Don't copy it.

## Action for the owner

Export the AI Studio app's code (download as zip) into `docs/legacy/ai-studio-export/` (it is git-ignored by default; remove the ignore if you want it committed) so agents can reference its components directly.
