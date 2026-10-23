# @managevent/types

Shared domain types inferred from `@managevent/validators`, branded entity IDs (`EventId`, `UserId`, `LeadId`, etc.), and runtime type guards (`isBrandedId`, `asBrandedId`, `isAudCents`).

## Usage

```ts
import { asBrandedId, type EventId, type LeadCreate } from "@managevent/types";

const eventId: EventId = asBrandedId("evt_0192b400-0000-7000-8000-000000000001", "evt_");
```
