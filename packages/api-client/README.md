# @managevent/api-client

Typed client for `@managevent/api`. Every API module has a resource object; inputs are validated with the request schema from `@managevent/validators` before anything is sent, and responses with the response schema. `src/generated.ts` is generated from the API's OpenAPI 3.1 document.

Used server-side by `apps/marketing` and `apps/invitation`. Rules: [`AGENTS.md`](AGENTS.md).

## Scripts

```bash
pnpm --filter @managevent/api-client generate        # regenerate src/generated.ts after an API route change
pnpm --filter @managevent/api-client generate:check  # fail if the committed file is stale (CI runs this)
```

## Usage

```ts
import { createApiClient, isApiError } from "@managevent/api-client";

// In a Next.js server component, server action or route handler: forward the visitor's cookie and IP.
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

- Resources: `me`, `events`, `billing`, `guestSite`, `checkIn`, `well`, `guestList`, `responses`, `messaging`, `leads`.
- Requests are sent with `cache: "no-store"`. `RequestOptions.idempotencyKey` becomes the `Idempotency-Key` header.
- Auth is the forwarded `cookie`, or `bearerToken` for non-browser callers.
- When `forwardedFor` is set, the client also sends `API_PROXY_SECRET` from the server environment so the API trusts the forwarded address. Never build a client with that secret in the browser.
