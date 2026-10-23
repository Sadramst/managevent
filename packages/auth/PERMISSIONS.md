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
| `checkin:scan`                             | —                     | —                                   | —                                                              | all           | roster                      | all          |
| `media:upload`                             | own                   | self (wall, tribute)                | org (portfolio)                                                | all           | roster (evidence photos)    | all          |
| `media:moderate`                           | own                   | —                                   | —                                                              | all           | —                           | all          |
| `lead:read` / `lead:write`                 | —                     | —                                   | —                                                              | all           | —                           | all          |
| `user:manage_roles`                        | —                     | —                                   | org (members)                                                  | —             | —                           | all          |
| `audit:read`                               | —                     | —                                   | —                                                              | —             | —                           | all          |

Co-host sub-roles: `OWNER` (everything under "own", including payments), `EDITOR` (guests, content, RSVP; no payments), `VIEWER` (read only; no health detail).
