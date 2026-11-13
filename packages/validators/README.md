# @managevent/validators

Zod schemas for every Managevent API operation, mirrors of the `content/schemas` JSON schemas, and domain primitives (AUD cents, AU phone, ABN modulus-89 checksum, IANA time zones, safe slugs, guest tokens and prefixed UUIDv7 IDs). Rules: [`AGENTS.md`](AGENTS.md).

| File                 | Subpath                             | What it holds                                                                                           |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `primitives.ts`      | `@managevent/validators/primitives` | Shared primitives and enums                                                                             |
| `content.ts`         | `@managevent/validators/content`    | `content/` schemas (ceremonies, cities, venues, packages, routes, testimonials)                         |
| `api.ts`             | `@managevent/validators/api`        | Error envelope, health, leads; also builder, order, payment and tax invoice shapes for planned features |
| `site-settings.ts`   | root only                           | Public site settings, staff admin settings, update payload                                              |
| `invitation-host.ts` | root only                           | `GET /v1/me`, host events and invitation, publish requirements, plan and checkout                       |
| `guest-site.ts`      | root only                           | Guest site, RSVP, passes, calendar, wishes, demos, legacy links, check-in, wish moderation              |
| `guest-list.ts`      | root only                           | Parties, guests, import, responses, messaging, unsubscribe, the staff enquiry list and detail           |

## Usage

```ts
import { AbnSchema, LeadCreateSchema } from "@managevent/validators";

const lead = LeadCreateSchema.parse({
  source: "CONTACT_FORM",
  name: "Sara Ahmadi",
  email: "sara@example.com",
}); // preferredLanguage defaults to "en"
```
