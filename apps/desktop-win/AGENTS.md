# AGENTS.md: apps/desktop-win

> Inherits **all** rules from the root `AGENTS.md`. The rules below add to them.

## What this is

**Windows app: back-office and venue kiosk (Tauri v2)**

- **Domain:** MSI / MSIX
- **Local port:** 1420
- **Phase:** Phase 6. **Backlog:** WIN-01 … WIN-06 (see `ROADMAP.md`)

(1) **Back-office:** warehouse and hire inventory with barcodes, the 2D floorplan and seating editor, batch printing of QR place cards and welcome boards. (2) **Venue kiosk and Live Display Controller:** offline door check-in, plus second-screen or projector control for slideshows, tribute reels and the moderated photo wall.

## Specification

ROADMAP Phase 6, ARCHITECTURE §11, WEBSITE.md §§B8, B10.

## Stack

Tauri v2 (Rust core) and a React + TypeScript (Vite) frontend using `packages/ui` tokens and components, `i18n`, `validators` and `api-client`. Rust: SQLite (local store), printing, HID barcode input, multi-window and multi-monitor, updater.

## Depends on (contracts; do not modify from this app)

`ui`, `i18n`, `validators`, `types`, `api-client`, `config`

## Proposed layout

```text
src/                 # React UI (routes: inventory, floorplan, print, kiosk, display)
src-tauri/
  src/main.rs  src/commands/(db|print|display|scanner|sync).rs
  tauri.conf.json  capabilities/
```

## Rules specific to this app

- Use a least-privilege Tauri capabilities config. No shell access from the UI. Commands are validated on the Rust side.
- Kiosk mode: full-screen, no navigation outside check-in, staff PIN to exit.
- Display controller: the media cache is pre-downloaded. Content is only approved items. Memorial reels use gentle transitions.
- Updates are signed, and the update manifest signature is verified.

## Environment variables

VITE_API_URL, updater public key. The names are listed in the root `.env.example`.

## Tests required

Vitest (UI logic), Rust unit tests (`cargo test`), a manual kiosk test script in `docs/` before each release.

## Status

⬜ Not scaffolded. The first issue scaffolds it using the current stable framework version (pin exact versions).
