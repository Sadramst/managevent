# @managevent/config

Shared tooling presets and privacy-preserving log redaction utilities for the Managevent monorepo.

## Exports

- `@managevent/config`: Barrel export of all presets and redaction helpers.
- `@managevent/config/eslint`: Flat ESLint config builder + `managevent/no-physical-direction-classes` rule blocking `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`.
- `@managevent/config/prettier`: Canonical Prettier configuration.
- `@managevent/config/vitest`: Vitest preset builder (`createVitestConfig`).
- `@managevent/config/tailwind` & `@managevent/config/tailwind.css`: Tailwind v4 theme tokens (Celebration & Memorial palettes).
- `@managevent/config/redact`: `redactForLog`, `redactUrl`, `isSensitiveKey`, and `REDACTED_FIELD_NAMES`.
- `@managevent/config/tsconfig/*`: TypeScript presets (`base.json`, `node.json`, `nextjs.json`, `react-library.json`, `expo.json`).

## Usage

```ts
import { redactForLog, createEslintConfig } from "@managevent/config";

const safeLog = redactForLog({
  eventId: "evt_0192",
  email: "guest@example.com",
  url: "/i/sara-ali-aghd/sara-family-g9qtmt",
});
```
