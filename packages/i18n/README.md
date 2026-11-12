# @managevent/i18n

The typed English (en-AU) dictionary across 11 namespaces (`common`, `marketing`, `invitation`, `portal`, `vendors`, `admin`, `mobile`, `desktop`, `ceremonies`, `legal`, `emails`), `t()`, `getDir()`, deterministic Gregorian date formatters, page copy modules, and `getExperienceMode()`. Rules: [`AGENTS.md`](AGENTS.md).

## Usage

```ts
import { formatCeremonyDate, getDir, getExperienceMode, t } from "@managevent/i18n";

const label = t("en", "common.planMyCeremony"); // "Plan my ceremony"
const dir = getDir("en"); // "ltr"
const dateText = formatCeremonyDate("2026-10-23T08:30:00.000Z", "en"); // "23 October 2026" (Perth)
const mode = getExperienceMode("celebration-of-life"); // "MEMORIAL"
```

## Modules

| Module                                                | Getter                                             | Used by                                   |
| ----------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| `dictionaries.ts` (+ `launch.ts` merged in)           | `t(locale, "namespace.key")`                       | apps and packages                         |
| `site-pages.ts`, `ceremony-pages.ts`                  | `getSitePages`, `getCeremonyPages`                 | `apps/marketing` www pages                |
| `admin-pages.ts`                                      | `getAdminPages`                                    | `apps/marketing` staff console (`/admin`) |
| `invitation-shell.ts`, `invitation-public.ts`         | `getInvitationShell`, `getInvitationPublic`        | `apps/invitation` chrome and public pages |
| `invitation-studio.ts`, `invitation-studio-guests.ts` | `getInvitationStudio`, `getInvitationStudioGuests` | `apps/invitation` host studio             |
| `invitation-guest.ts`                                 | `getInvitationGuest`, `guestVoice`                 | `apps/invitation` guest site              |

`fillCopy()` replaces `{placeholder}` tokens in a copy string.

## Notes

- English only: `ENABLED_LOCALES` is `["en"]`.
- `getExperienceMode()` accepts a ceremony slug, a route, or `{ ceremonySlug, family, experienceMode }`. For a route it drops any query or hash, then matches whole path segments (`memorials`, or a slug in `MEMORIAL_CEREMONY_SLUGS`); trailing slashes and locale prefixes are tolerated. `family: "SOLEMN"` or `experienceMode: "MEMORIAL"` also give `MEMORIAL`.
