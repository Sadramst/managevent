# AGENTS.md: apps/mobile

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Mobile app: iOS and Android**

- **Domain:** App Store / Google Play
- **Local port:** 8081
- **Phase:** Phase 5. **Backlog:** MOB-01 … MOB-07 (see `ROADMAP.md`)

One app with role-based modes. **Customer mode:** event home, live RSVP push notifications, guest list, planner chat, quick photo sharing. **Crew mode:** roster, offline event pack, fast QR check-in scanner, guest, table and dietary lookup, setup and delivery checklists with photo evidence.

## Specification

ROADMAP Phase 5, ARCHITECTURE §11 (offline), WEBSITE.md §B8 (passes).

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
- RTL: `I18nManager` with an app-restart flow when switching to or from Farsi. Test both directions.
- Store listings and privacy labels in EN and FA. Camera permission strings must explain the QR use.

## Environment variables

EXPO_PUBLIC_API_URL, EAS project id. The names are listed in the root `.env.example`.

## Tests required

Jest or Vitest for logic. Maestro flows: login → scan offline → sync. Test on a low-end Android device.

## Status

⬜ Not scaffolded. The first issue scaffolds it using the current stable framework version (pin exact versions).
