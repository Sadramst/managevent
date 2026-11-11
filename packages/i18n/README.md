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
