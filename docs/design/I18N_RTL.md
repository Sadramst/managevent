# Internationalisation and RTL

- **Locales:** `en` (en-AU) and `fa` (fa-IR) are live. `ar`, `zh` and `hi` are configured but disabled.
- **Library:** `packages/i18n` exports typed dictionaries, `t()`, `getDir(locale)`, formatters and `getExperienceMode()`. Namespaces: `common`, `marketing`, `invitation`, `portal`, `vendors`, `admin`, `mobile`, `desktop`, `ceremonies`, `legal`, `emails`.
- **Parity test:** every key in `en` exists in every enabled locale, and no Latin-only text appears in `fa` except allow-listed brand and product names. This mirrors the existing `i18n-parity` tests in the Appilico repos.
- **RTL:**
  - Use logical CSS only.
  - Mirror directional icons, never logos.
  - Use `<bdi>` or Unicode isolates around Latin names, prices and phone numbers inside Farsi text.
- **Digits:** Persian digits in FA display copy. Latin digits for prices, phone numbers, codes and anything people copy or paste.
- **Dates:** Gregorian in all locales. FA additionally shows Jalali. Formatters are deterministic (no `Intl` during SSR or hydration).
- **Names:** guests can have both an `en` and an `fa` name, and the greeting uses the guest's chosen language.
- **Fonts:** subset Vazirmatn for Arabic-script coverage. Test the `ی` and `ک` variants (Persian forms, not the Arabic `ي` and `ك`). Input is normalised on save.
