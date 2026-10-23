# ADR-0007: Expo for iOS/Android, Tauri v2 for Windows

- **Mobile:** a single Expo app (the SDK at scaffold time; 58 as of October 2026) with Expo Router and NativeWind.
  - Roles switch the navigation tree: customer mode or crew mode.
  - It uses EAS Build and Submit. OTA updates (EAS Update) only change JavaScript and assets; any native change needs a store release.
- **Desktop:** Tauri v2 with a React and TypeScript frontend that reuses `packages/ui` tokens, `i18n`, `validators` and `api-client`. The Rust core handles SQLite, printing, the barcode-scanner HID, multi-monitor display control and the auto-updater.
- **Why not Electron:** Tauri produces much smaller installers and uses less memory on cheap venue laptops and mini-PCs, and it gives native access to printing and displays.
- **Why not .NET MAUI:** we want one language (TypeScript) for the UI across every surface.
