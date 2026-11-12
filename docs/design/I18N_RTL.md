# Internationalisation and RTL

- **Locales:** `en` (en-AU) is the only enabled locale (`ENABLED_LOCALES` in `packages/i18n`). `ar`, `zh` and `hi` exist in the `Locale` type (`packages/types`) and `CONFIGURED_LOCALES`, but are disabled and have no dictionaries.
- **Library (`packages/i18n`):** the typed `en` dictionary with `t()` (namespaces `common`, `marketing`, `invitation`, `portal`, `vendors`, `admin`, `mobile`, `desktop`, `ceremonies`, `legal`, `emails`), page-copy modules for www, the staff console and the invitation app, `getDir(locale)`, date formatters and `getExperienceMode()`.
- **Copy:** Australian English spelling, day-first dates (`23 October 2026`; `DD/MM/YYYY` where numeric), AUD prices. Add keys in the same pull request as the UI change. Tone: [`../business/BRAND_VOICE.md`](../business/BRAND_VOICE.md).
- **Dates:** the formatters in `packages/i18n/src/dates.ts` use no `Intl`, so server and client render identical text (no hydration mismatch). Show event times in the event's time zone (ADR-0006).
- **Layout:** logical CSS only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start`, `end`), so a right-to-left language can be added without layout rework. Mirror directional icons, never logos.
- **Adding a language later:** a `contract-change` that extends the enabled-locale lists, adds the dictionary with a parity test, and keeps the language in the URL (never only in browser storage; in-app browsers can throw on `localStorage`).
