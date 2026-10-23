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
