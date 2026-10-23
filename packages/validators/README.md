# @managevent/validators

Zod schemas for every Managevent API endpoint, `/content` JSON schema mirrors, and domain primitives (AUD cents, AU phone, ABN modulus-89 checksum, IANA time zones, safe slugs, guest tokens, and prefixed UUIDv7 IDs).

## Usage

```ts
import { LeadCreateSchema, AbnSchema } from "@managevent/validators";

const lead = LeadCreateSchema.parse({
  source: "BUILDER",
  name: "Sara Ahmadi",
  email: "sara@example.com",
  preferredLanguage: "fa",
});
```
