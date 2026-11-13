# @managevent/db

Prisma schema ([`prisma/schema.prisma`](prisma/schema.prisma)) and migrations, the Prisma client with an AES-256-GCM field-encryption extension for health and private tribute fields, the prefixed UUIDv7 ID generator, and the catalogue seed from `content/`.

> Only `apps/api` and `apps/worker` may import this package. Rules: [`AGENTS.md`](AGENTS.md). Schema explained: [`DATA_MODEL.md`](DATA_MODEL.md).

## Commands

Run from the repo root. The root scripts load the root `.env` through `scripts/with-env.mjs`.

```bash
pnpm db:local:detach   # local PostgreSQL 16 on port 5432, no Docker (scripts/dev-db.mjs)
pnpm db:migrate        # prisma migrate deploy
pnpm db:seed           # ceremonies, Perth venues, packages, price list 2026.10.1, tax invoice sequence
pnpm db:drift-check    # fail if the database and schema.prisma differ (CI runs it)
pnpm db:generate       # regenerate the Prisma client (also runs on install)
```

Demo invitations are not part of this seed: `pnpm with-env pnpm --filter @managevent/api seed:demo` creates them.

Environment: `DATABASE_URL`, `DIRECT_URL` (both point at the same database locally) and `PII_ENCRYPTION_KEY` (32 bytes, base64; required when `NODE_ENV=production`).

## Migrations

| Migration                              | What it does                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `20261023000000_init`                  | The full schema.                                                                                                         |
| `20261023010000_encrypted_health_only` | Drops the plaintext dietary and severity columns; refuses if a row still has plaintext without ciphertext.               |
| `20261111000000_remove_persian`        | Data only: moves rows that used the removed `fa` locale or `persian-azure` theme to English and `emerald-botanic`.       |
| `20261112000000_invitation_platform`   | `Lead.notes`, `Invitation.isDemo`, link reissue on `Party`, `Pass.revokedAt`, idempotency keys, `WebhookEvent`, indexes. |
| `20261113000000_site_settings`         | `SiteSetting`: staff-editable public contact email, phone and enquiry-alert address.                                     |

## Usage

```ts
import { db, generateId } from "@managevent/db";

const lead = await db.lead.create({
  data: {
    id: generateId("lead_"),
    source: "CONTACT_FORM",
    name: "Sara",
    email: "sara@example.com",
  },
});
```

`db` is a shared client with the encryption extension. Use `createDbClient({ datasourceUrl, encryptionKey })` for a separate one (tests, CLIs). On `Rsvp` rows the extension turns `dietary` and `allergySeverity` into the encrypted columns and decrypts them on read; nested reads (`include`) must call `decryptRsvpRecord()` themselves.
