# Vendor verification

| Check                                       | How                                                                                              | Required for                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| ABN active and name match                   | ABN Lookup web services (`packages/integrations/abn`). Store a snapshot.                         | All                                                    |
| GST registration status                     | ABN Lookup                                                                                       | All (affects invoicing)                                |
| Public liability certificate of currency    | Upload, plus admin review of the insurer, cover amount (≥ $20M for venue-facing work) and expiry | All on-site vendors                                    |
| Food safety (registration, FSS certificate) | Upload and review                                                                                | Caterers, cake makers                                  |
| Liquor licence and RSA                      | Upload and review                                                                                | Bar services                                           |
| Working with Children Check (WA)            | Upload and verify on the WA WWC online check                                                     | Kids' entertainers and anyone doing child-related work |
| Pyrotechnics or drone licences              | Upload and review                                                                                | Where offered                                          |
| Portfolio and references                    | Review                                                                                           | All                                                    |

- **Expiry:** reminders 30 and 7 days before expiry. The vendor is auto-suspended from new bookings when a required document expires.
- **Decisions:** approve or reject with a reason. Everything is written to `AuditLog`.
