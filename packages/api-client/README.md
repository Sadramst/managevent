# @managevent/api-client

Typed API client generated from `@managevent/api` OpenAPI 3.1 specification, supporting cross-subdomain SSO cookies, bearer tokens, and the unified error model.

## Scripts

```bash
pnpm --filter @managevent/api-client generate        # Regenerate src/generated.ts
pnpm --filter @managevent/api-client generate:check  # Verify committed client matches OpenAPI spec
```

## Usage

```ts
import { createApiClient } from "@managevent/api-client";

const api = createApiClient({ baseUrl: "http://localhost:4000" });
const lead = await api.createLead({
  source: "BUILDER",
  name: "Sara",
  email: "sara@example.com",
});
```

## Resources

Every API module has a resource object on the client. Inputs are validated with the request schema
from `@managevent/validators` before anything is sent, and responses with the response schema.

```ts
import { createApiClient, isApiError } from "@managevent/api-client";

// In a Next.js server component or server action: forward the visitor's cookie and IP.
const api = createApiClient({
  baseUrl: process.env.API_URL ?? "http://localhost:4000",
  cookie,
  forwardedFor,
  userAgent,
});

const me = await api.me.get(); // never throws 401: `me.user` is null when signed out
const { items } = await api.events.list();

try {
  await api.events.publish(eventId);
} catch (err) {
  if (isApiError(err, "PUBLISH_REQUIREMENTS_NOT_MET")) {
    // err.details.missing: ("HEADLINE" | "HOSTS" | "VENUE" | "START_IN_FUTURE")[]
  } else if (isApiError(err, "NETWORK_ERROR")) {
    // the API could not be reached (status 0)
  } else {
    throw err;
  }
}
```

Resources: `me`, `events`, `billing`, `guestSite`, `checkIn`, `well`, `guestList`, `responses`,
`messaging`, `leads`. Requests are sent with `cache: "no-store"`. `RequestOptions.idempotencyKey`
becomes the `Idempotency-Key` header.
