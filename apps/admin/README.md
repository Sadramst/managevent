# `@managevent/admin`

Admin & Planner Command Centre domain and workflow engine for Managevent (`admin.managevent.com.au` and `/admin` in `apps/marketing`).

## Capabilities

- **CRM Lead Pipeline (`createAdminLeadRecord`, `transitionLeadStage`)**: Validates staff roles (`PLANNER_STAFF`, `SUPER_ADMIN`), derives `ExperienceMode` (`CELEBRATION` vs `MEMORIAL`) via `getExperienceMode()`, and emits immutable `AdminAuditRecord` entries on every stage transition.
- **ATO GST & Marketplace Commission (`computeAdminPipelineFinancials`)**: Computes active gross pipeline (inc. GST), net ex-GST revenue, 10% GST liability, and 12% Marketplace vendor commission in integer AUD cents via `@managevent/payments`.
- **APP 3 Sensitive Health Data Protection (`maskDietaryHealthSummary`, `revealDietaryHealthSummary`)**: Masks guest dietary and allergy counts by default and emits an audit log entry whenever a coordinator reveals dietary notes for catering run-sheets.

## UI Surface

The interactive Planner & Admin Command Centre UI is served at `/admin` (and `/fa/admin`) via [`apps/marketing/app/[locale]/admin/page.tsx`](../marketing/app/[locale]/admin/page.tsx) and [`apps/marketing/components/admin-dashboard.tsx`](../marketing/components/admin-dashboard.tsx).
