# @managevent/config

Shared tooling presets and privacy-preserving log redaction for the Managevent monorepo. Rules: [`AGENTS.md`](AGENTS.md).

## Exports

| Import                                                           | What it is                                                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@managevent/config`                                             | Barrel export of everything below except the tsconfig files and `tailwind.css`.                                                                                          |
| `@managevent/config/eslint`                                      | `createEslintConfig()` (flat config) and the `managevent/no-physical-direction-classes` rule (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`). |
| `@managevent/config/prettier`                                    | `prettierConfig`.                                                                                                                                                        |
| `@managevent/config/vitest`                                      | `createVitestConfig()` and `baseVitestConfig`.                                                                                                                           |
| `@managevent/config/tailwind`, `@managevent/config/tailwind.css` | Tailwind v4 palette tokens for Celebration and Memorial mode (`[data-experience-mode="memorial"]`).                                                                      |
| `@managevent/config/redact`                                      | `redactForLog`, `redactUrl`, `isSensitiveKey`, `REDACTED_FIELD_NAMES`, `REDACTED_PLACEHOLDER`.                                                                           |
| `@managevent/config/tsconfig/*`                                  | `base.json`, `node.json`, `nextjs.json`, `react-library.json`, `expo.json`.                                                                                              |

## Usage

```ts
import { redactForLog } from "@managevent/config/redact";

const safe = redactForLog({
  eventId: "evt_0192",
  email: "guest@example.com", // becomes "[REDACTED]"
  url: "/i/sara-ali-engage/sara-family-g9qtmt", // becomes "/i/sara-ali-engage/[REDACTED]"
});
```
