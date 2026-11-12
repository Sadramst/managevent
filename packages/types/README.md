# @managevent/types

Shared domain types inferred from `@managevent/validators`, branded entity IDs (`EventId`, `UserId`, `LeadId`, …), `AudCents`, and runtime type guards (`isBrandedId`, `asBrandedId`, `isAudCents`). Rules: [`AGENTS.md`](AGENTS.md).

## Usage

```ts
import { asBrandedId, type EventId, type LeadCreate } from "@managevent/types";

const eventId: EventId = asBrandedId("evt_0192b400-0000-7000-8000-000000000001", "evt_"); // throws on a wrong prefix
```
