// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY.
// Run `pnpm --filter @managevent/api-client generate` to regenerate from @managevent/api OpenAPI spec.

export const GENERATED_API_VERSION = "0.1.0" as const;

export const GENERATED_OPERATIONS = [
  {
    method: "GET",
    path: "/health",
    summary: "API health check",
    tags: ["System"],
  },
  {
    method: "GET",
    path: "/v1/leads",
    summary: "List leads in the CRM inbox (requires PLANNER_STAFF or SUPER_ADMIN)",
    tags: ["CRM"],
  },
  {
    method: "POST",
    path: "/v1/leads",
    summary: "Submit a new ceremony enquiry or Builder lead",
    tags: ["CRM"],
  },
] as const;

export type GeneratedOperation = (typeof GENERATED_OPERATIONS)[number];
