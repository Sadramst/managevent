# @managevent/i18n

Typed English (`en`, en-AU) dictionary across all 11 platform namespaces, `t()`, `getDir()`, deterministic Gregorian date formatters, and `getExperienceMode()`.

## Usage

```ts
import { t, getDir, formatCeremonyDate, getExperienceMode } from "@managevent/i18n";

const label = t("en", "common.planMyCeremony");
const dir = getDir("en"); // "ltr"
const dateText = formatCeremonyDate("2026-10-23T08:30:00.000Z", "en");
const mode = getExperienceMode("celebration-of-life"); // "MEMORIAL"
```

## Notes

- The site is English-only (`en`, en-AU). `ENABLED_LOCALES` is `["en"]`; there is no `fa` locale and no Jalali calendar.
- Launch-page copy lives in `src/launch.ts` and is merged into the `marketing` namespace. The venue enquiry keys `launchVenueAsk`, `launchVenueNote` and `launchVenuePrefill` are additive (`contract-change`). `{venue}` is a placeholder.
- `getExperienceMode()` strips any query or hash from a route, then matches whole path segments (`memorials`, or a memorial ceremony slug). Trailing slashes are tolerated.
