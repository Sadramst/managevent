# Permission matrix (contract)

Format: `resource:action`. Scopes: **own** (owner or co-host of the event), **org** (the vendor's own organisation), **roster** (assigned crew, event day ±1), **all**.

| Permission                                 | CUSTOMER_HOST         | GUEST (token)                       | VENDOR                                                         | PLANNER_STAFF | CHECKIN_CREW                | SUPER_ADMIN  |
| ------------------------------------------ | --------------------- | ----------------------------------- | -------------------------------------------------------------- | ------------- | --------------------------- | ------------ |
| `event:read`                               | own                   | own invitation only (public fields) | org bookings (limited)                                         | all           | roster (limited)            | all          |
| `event:update`                             | own (owner or editor) | —                                   | —                                                              | all           | —                           | all          |
| `guest:read`                               | own                   | self and party                      | — (counts only)                                                | all           | roster (name, table, flags) | all          |
| `guest:write`                              | own (owner or editor) | self (RSVP)                         | —                                                              | all           | —                           | all          |
| `rsvp:submit`                              | own (on behalf)       | self and party                      | —                                                              | all           | —                           | all          |
| `health:read` (dietary and allergy detail) | own                   | self                                | caterer on the booking: per-table counts and severe flags only | all (logged)  | roster: flags only          | all (logged) |
| `order:read`                               | own                   | —                                   | org lines only                                                 | all           | —                           | all          |
| `order:apply_recommendation`               | own (owner)           | —                                   | —                                                              | all           | —                           | all          |
| `payment:create`                           | own                   | —                                   | —                                                              | all           | —                           | all          |
| `payment:refund`                           | —                     | —                                   | —                                                              | —             | —                           | all          |
| `payout:release`                           | —                     | —                                   | —                                                              | —             | —                           | all          |
| `vendor:verify`                            | —                     | —                                   | —                                                              | all           | —                           | all          |
| `vendor_service:write`                     | —                     | —                                   | org                                                            | all           | —                           | all          |
| `booking:respond`                          | —                     | —                                   | org                                                            | all           | —                           | all          |
| `inventory:write`                          | —                     | —                                   | —                                                              | all           | —                           | all          |
| `checkin:scan`                             | own (owner or editor) | —                                   | —                                                              | all           | roster                      | all          |
| `media:upload`                             | own                   | self (wall, tribute)                | org (portfolio)                                                | all           | roster (evidence photos)    | all          |
| `media:moderate`                           | own                   | —                                   | —                                                              | all           | —                           | all          |
| `lead:read` / `lead:write`                 | —                     | —                                   | —                                                              | all           | —                           | all          |
| `user:manage_roles`                        | —                     | —                                   | org (members)                                                  | —             | —                           | all          |
| `audit:read`                               | —                     | —                                   | —                                                              | —             | —                           | all          |

Co-host sub-roles: `OWNER` (everything under "own", including payments), `EDITOR` (guests, content, RSVP, door check-in; no payments), `VIEWER` (read only; no health detail, no check-in).

**Roster scope is the door, and only the door.** `CHECKIN_CREW` holds `event:read`, `guest:read` and `health:read` at roster scope so the check-in roster and scan results can show names, tables, dietary tags and the severe-allergy flag. It is not a grant for any other surface: the API accepts a roster-scope decision only in its check-in module and answers `403` to door crew on the guest list, the export, the responses, the dietary matrix, messaging and the event itself. A consumer that calls `checkPermission` for another surface must treat `scope: "roster"` as denied.

**A guest link is a write credential.** Whoever holds a party's link can answer for that party, so the link (token, invite path, preview path) is only shown to callers with `guest:write`. `guest:read` alone (a `VIEWER` co-host) reads the list without links. Dietary and severe-allergy counts are health information and need `health:read`, also where they appear on a `guest:read` page.

**Magic links never replace two-factor.** An account with two-factor enabled, or with a role in `MFA_REQUIRED_ROLES`, is not sent a sign-in link and cannot verify one.

`checkin:scan` for `CUSTOMER_HOST` lets a self-serve host run the door of their own event. It is still gated by the invitation plan (`qrPassesAndCheckin`) in the API.
