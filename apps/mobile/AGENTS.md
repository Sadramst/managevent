# AGENTS.md: apps/mobile

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Mobile app: iOS and Android**

- **Domain:** App Store / Google Play
- **Local port:** 8081
- **Status:** Planned. Nothing is built; this folder holds only this spec, `CLAUDE.md` and a placeholder `package.json`. `packages/ui-native` is a placeholder too.
- **Backlog:** MOB-01 to MOB-07 (see [`ROADMAP.md`](../../ROADMAP.md))

One app with role-based modes. **Customer mode:** event home, live RSVP push notifications, guest list, planner chat, quick photo sharing. **Crew mode:** roster, offline event pack, fast QR check-in scanner, guest, table and dietary lookup, setup and delivery checklists with photo evidence.

## Specification

The MOB rows in `ROADMAP.md`, `ARCHITECTURE.md` §11 (offline), `WEBSITE.md` §B8 (passes).

## What already exists to build on

- Signed QR passes (`MV1.{passId}.{sig}`) issued by the API, and the check-in routes `GET /v1/events/{eventId}/check-in` and `POST .../check-in/scans` (replay-safe by `clientUuid`), already used by the web door check-in in `apps/invitation` (see `apps/api/README.md`).
- Better Auth sessions (30 days; the API also accepts a bearer token). Door crew (`CHECKIN_CREW`) can use the check-in routes only.
- No offline event pack or push endpoint exists yet (MOB-03, MOB-06).

## Stack

Expo (current SDK at scaffold), Expo Router, NativeWind (tokens from `packages/ui`), `packages/ui-native`, expo-sqlite, expo-camera (QR), expo-notifications, expo-secure-store.

## Depends on (contracts; do not modify from this app)

`ui` (tokens), `ui-native`, `i18n`, `validators`, `types`, `api-client`, `config`

## Proposed layout

```text
app/
  (auth)/  (customer)/events/[eventId]/…  (crew)/roster/  (crew)/event/[eventId]/(scan|lookup|checklists)
lib/offline/  (event pack store, scan queue, sync)
```

## Rules specific to this app

- **pnpm and Metro:** configure `node-linker=hoisted` for this workspace (an app-level `.npmrc`) or use Expo's monorepo guidance for the current SDK. Verify before the first commit.
- Tokens live in secure storage only. Event packs are encrypted at rest and wiped 48h after the event.
- The scanner works fully offline. Scans queue with a client UUID. Duplicate detection runs locally first.
- Copy is English (`en-AU`) only for now. Use logical layout props so another locale can be added later.
- Store listings and privacy labels in English. Camera permission strings must explain the QR use.

## Environment variables

`EXPO_PUBLIC_API_URL` and the EAS project id. Neither is in the root `.env.example` yet; MOB-01 adds them.

## Tests required

Jest or Vitest for logic. Maestro flows: login → scan offline → sync. Test on a low-end Android device.

## Status

Planned, not scaffolded. MOB-01 scaffolds it using the current stable Expo SDK (pin exact versions).
