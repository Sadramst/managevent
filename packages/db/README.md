# @managevent/db

Database schema (`prisma/schema.prisma`), Prisma client, prefixed UUIDv7 ID generator, AES-256-GCM field-level encryption extension for sensitive health/tribute fields, and Perth placeholder seed loader.

> **Important:** Only `apps/api` and `apps/worker` may import this package.

Data model specification: [`DATA_MODEL.md`](DATA_MODEL.md).

## Usage

```ts
import { db, generateId, encryptField } from "@managevent/db";

const eventId = generateId("evt_");
const lead = await db.lead.create({
  data: {
    id: generateId("lead_"),
    source: "BUILDER",
    name: "Sara",
    email: "sara@example.com",
  },
});
```
