# Importing the Appilico anniversary links (INV-14)

**Status: not done.** The database holds no `LegacySlug` rows and there is no import script yet, so every old Appilico link answers 404 today. This page describes the remaining task; the backlog row is INV-14 in [`ROADMAP.md`](../../ROADMAP.md).

## What already exists

- **Table.** `LegacySlug` in `packages/db/prisma/schema.prisma`: `legacyPath` (unique), `partyId` (cascade on delete) and `source` (`APPILICO_ANNIVERSARY` or `APPILICO_E`). Ids use the `lgs_` prefix.
- **API.** `POST /v1/public/legacy/resolve` with `{ path }` returns `{ eventSlug, guestToken }` or `404` (`resolveLegacy` in `apps/api/src/modules/guest-site/service.ts`). The path is trimmed, cut at `?` or `#`, has repeated and trailing slashes removed, and is matched exactly and in lower case; a leading `/legacy` is also tried without the prefix. A row resolves only when its party is not deleted and its link is not revoked, on a published invitation of an event that is not deleted.
- **Invitation routes.** `/legacy/[...path]`, `/anniversary/[slug]` and `/e/[eventSlug]/[guestSlug]` call that operation (`lib/public/legacy.ts`) and redirect to `/i/{eventSlug}/{guestToken}`. Anything unknown is a real 404. These paths are `noindex` and disallowed in `robots.txt`.

## What is left

1. **Write the import script** (for example `apps/api/src/cli/import-legacy.ts`, run with `pnpm with-env pnpm --filter @managevent/api <script>`). Input: the anniversary repo's guest and content data and its `links-export.csv`, read from a path outside git; real guest data is never committed.
2. **Create the event through the normal path.** The owner's account owns the event; parties and guests get new `stableId`s and tokens from `apps/api/src/lib/guest-tokens.ts`. Old tokens are not recomputed and the old salt is not used (it was committed in the legacy repo, see root `AGENTS.md` §3).
3. **Create one `LegacySlug` per old link:** `legacyPath` is the original path (`/anniversary/<slug>` with source `APPILICO_ANNIVERSARY`, `/e/<event>/<guest>` with source `APPILICO_E`), pointing at the new party.
4. **Turn forwarding off** on the imported invitation (`allowForwarding: false`, editable in Studio Settings): the old slugs are known-public, so the owner may also reissue links.
5. **Point the old domain here.** On the Appilico website, rewrite or redirect `/anniversary/:path*` and `/e/:path*` to `https://invitation.managevent.com.au/legacy/...`.
6. **Run it once against production**, after OPS-01, and check that every row of `links-export.csv` answers 200 and an unknown slug answers 404.
7. **Archive the two old repositories** (read-only) after a 30-day overlap.

## Open point

D-12 in `docs/architecture/OPEN_DECISIONS.md` (token format for imported events) is still open; settle it before writing the script. The behaviour of old links is specified in `WEBSITE.md` §B6.4.
