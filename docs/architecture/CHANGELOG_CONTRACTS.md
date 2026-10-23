# Contract changelog

Step 2 plans (2026-10-23): additive `getInvitationPlan(plan, mode)` and optional
mode arguments on entitlement helpers grant memorial Premium access for zero cents.
Agency-only logistics fulfilment remains agency-only. Premium celebration price
confirmed at 6900 AUD cents inclusive of GST.

## Step 2: Encrypted Health Storage (2026-10-23)

Breaking database contract: remove `Rsvp.dietary` and `Rsvp.allergySeverity`.
API health inputs remain typed; callers must use `encryptRsvpWriteData()` before
persistence. API/worker consumers regenerate Prisma. Migration
`20261023010000_encrypted_health_only` refuses legacy plaintext rows without a
ciphertext mirror. Backfill with the application key before migration; never
edit the initial migration. Worker snapshots accept validated counts only and
reject cross-event snapshot references.

Record every change to `packages/db`, `validators`, `types`, `auth`, `payments`, `i18n` keys (renames or removals only) and `ui` tokens here, newest first.

| Date       | PR     | Package                     | Change                                                                                               | Breaking? | Migration notes |
| ---------- | ------ | --------------------------- | ---------------------------------------------------------------------------------------------------- | --------- | --------------- |
| 2026-10-23 | FND-16 | `@managevent/ai`            | Server-side `@google/genai` client, versioned prompts, Zod schemas, quotas, PII & memorial guards    | No        | Initial release |
| 2026-10-23 | FND-14 | `@managevent/api-client`    | Typed API client generated from `apps/api` OpenAPI 3.1 spec with `generate` & `generate:check`       | No        | Initial release |
| 2026-10-23 | FND-13 | `@managevent/notifications` | Resend & Twilio wrappers, Spam Act consent/suppression/quiet-hours checks, EN/FA templates           | No        | Initial release |
| 2026-10-23 | FND-13 | `@managevent/storage`       | Cloudflare R2 signed upload/download URLs, public/private bucket selection, variant descriptors      | No        | Initial release |
| 2026-10-23 | FND-10 | `@managevent/logistics`     | RSVP headcount -> catering, allergen, cake, seating, hire and RSA staffing recommendation engine     | No        | Initial release |
| 2026-10-23 | FND-09 | `@managevent/pricing`       | Ceremony Builder estimator (`WEBSITE.md` §A6.4), price list `2026.10.1`, ceremony family fixtures    | No        | Initial release |
| 2026-10-23 | FND-08 | `@managevent/payments`      | AUD cents, 10% GST per-line half-up rounding, ATO TaxInvoice, plans/entitlements, Stripe test wrap   | No        | Initial release |
| 2026-10-23 | FND-07 | `@managevent/auth`          | Better Auth config, `PERMISSIONS.md` matrix (22 permissions), `requirePermission()`, scoping helpers | No        | Initial release |
| 2026-10-23 | FND-06 | `@managevent/ui`            | Celebration & Memorial tokens, 7 invitation themes, `ExperienceModeProvider`, base components        | No        | Initial release |
| 2026-10-23 | FND-05 | `@managevent/i18n`          | EN/FA dictionaries (11 namespaces), `t()`, `getDir()`, Jalali/Gregorian dates, `getExperienceMode()` | No        | Initial release |
| 2026-10-23 | FND-04 | `@managevent/types`         | Inferred domain types, branded entity ID types (`EventId`, `UserId`, etc.) and type guards           | No        | Initial release |
| 2026-10-23 | FND-03 | `@managevent/validators`    | MVP API input/output Zod schemas, `/content` schemas, and AU primitives (cents, phone, ABN)          | No        | Initial release |
| 2026-10-23 | FND-02 | `@managevent/db`            | Prisma schema (`DATA_MODEL.md`), prefixed UUIDv7 IDs, AES-256-GCM field encryption, Perth seed       | No        | Initial release |
| 2026-10-23 | FND-01 | `@managevent/config`        | Initial tsconfig, ESLint flat config, Prettier, Tailwind v4 preset, Vitest preset, redaction         | No        | Initial release |
| —          | —      | —                           | Initial structure                                                                                    | —         | —               |
