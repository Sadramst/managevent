# ADR-0006: IDs, money and time

- **IDs:** prefixed string IDs (for example `evt_01J…`) using UUIDv7 for sortability. The prefix list lives in `packages/db/DATA_MODEL.md`.
- **Money:** integer cents, always paired with `currency` (currently always `AUD`).
  - Store `amountExGstCents`, `gstCents` and `amountIncGstCents` on every invoiceable line.
  - GST maths lives only in `packages/payments`.
- **Time:**
  - Store UTC (`timestamptz`) and keep an IANA `timeZone` on every Event. The default is `Australia/Perth` (UTC+8, no daylight saving). Other states have daylight saving, so never assume a fixed offset.
  - Show event times in the event's time zone, never the viewer's.
  - Farsi UI can show Jalali (Solar Hijri) dates alongside Gregorian ones, via `packages/i18n`.
  - Format on the server with deterministic formatters to avoid hydration mismatches. This is a lesson from `anniversary-invitation`.
