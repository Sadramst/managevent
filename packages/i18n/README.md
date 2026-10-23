# @managevent/i18n

Typed English (`en`) and Persian (`fa`) dictionaries across all 11 platform namespaces, `t()`, `getDir()`, Persian digit and `ی`/`ک` normalisation helpers, deterministic Gregorian and Jalali (Solar Hijri) date formatters, and `getExperienceMode()`.

## Usage

```ts
import { t, getDir, formatCeremonyDate, getExperienceMode } from "@managevent/i18n";

const label = t("fa", "common.planMyCeremony");
const dir = getDir("fa"); // "rtl"
const dateText = formatCeremonyDate("2026-10-23T08:30:00.000Z", "fa");
const mode = getExperienceMode("celebration-of-life"); // "MEMORIAL"
```
