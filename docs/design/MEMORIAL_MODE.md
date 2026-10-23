# Memorial Mode

**What triggers it:** the `experienceMode = MEMORIAL` field. It comes from the ceremony type (`funeral-coordination`, `memorial-service`, `celebration-of-life`, `wake`) via `getExperienceMode()` in `packages/i18n`. Always use that helper. Never hand-roll the check.

| Aspect                      | Celebration              | Memorial                                          |
| --------------------------- | ------------------------ | ------------------------------------------------- |
| Palette                     | Ivory, gold and burgundy | Alabaster, slate, bronze and ink                  |
| Motion                      | Full (gate, dial)        | Gentle fades only                                 |
| Invitation gate             | Seal, ribbon or arch     | Plain fade, "Open"                                |
| Music                       | Theme default, on tap    | Off by default. Optional soft track, on tap.      |
| Countdown                   | "12 days to go"          | Date and time only                                |
| RSVP extras                 | Song requests            | Optional "A song that reminds you of them"        |
| Wishing well                | Gift message plus PayID  | **Tribute book** (messages and photos, moderated) |
| Photo wall auto-approve     | Host option              | Not available                                     |
| Copy tone                   | Joyful                   | Gentle, brief                                     |
| Upsells, discounts, urgency | Allowed (honest ones)    | **None**                                          |
| AI wording                  | Tone options             | Memorial prompt only, and never invents facts     |
| Confetti, sparkles, emoji   | Allowed sparingly        | Never                                             |

**Tests:** every app has a Playwright test that renders a memorial fixture and asserts that no celebration tokens, no confetti component, no countdown and no upsell are present.
