# Internationalisation and RTL

- **Locales:** `en` (en-AU) is the only live locale. `ar`, `zh` and `hi` stay configured in the `Locale` type but are disabled.
- **Library:** `packages/i18n` exports typed dictionaries, `t()`, `getDir(locale)`, formatters and `getExperienceMode()`. Namespaces: `common`, `marketing`, `invitation`, `portal`, `vendors`, `admin`, `mobile`, `desktop`, `ceremonies`, `legal`, `emails`.
- **Copy:** Australian English spelling, `DD/MM/YYYY` dates, AUD prices. Add keys to `en` in the same PR as the UI change.
- **Adding a language later:** extend the `Locale` and enabled-locale lists through a `contract-change`, add a parity test for the new locale, and keep the language in the URL (never only in storage).
- **Layout:** use logical CSS only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start`, `end`) so a right-to-left language can be added without layout rework. Mirror directional icons, never logos.
- **Dates:** formatters are deterministic (no `Intl` during SSR or hydration).
