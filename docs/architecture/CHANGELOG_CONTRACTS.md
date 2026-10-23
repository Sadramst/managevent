# Contract changelog

Record every change to `packages/db`, `validators`, `types`, `auth`, `payments`, `i18n` keys (renames or removals only) and `ui` tokens here, newest first.

| Date       | PR     | Package                  | Change                                                                                         | Breaking? | Migration notes |
| ---------- | ------ | ------------------------ | ---------------------------------------------------------------------------------------------- | --------- | --------------- |
| 2026-10-23 | FND-03 | `@managevent/validators` | MVP API input/output Zod schemas, `/content` schemas, and AU primitives (cents, phone, ABN)    | No        | Initial release |
| 2026-10-23 | FND-02 | `@managevent/db`         | Prisma schema (`DATA_MODEL.md`), prefixed UUIDv7 IDs, AES-256-GCM field encryption, Perth seed | No        | Initial release |
| 2026-10-23 | FND-01 | `@managevent/config`     | Initial tsconfig, ESLint flat config, Prettier, Tailwind v4 preset, Vitest preset, redaction   | No        | Initial release |
| —          | —      | —                        | Initial structure                                                                              | —         | —               |
