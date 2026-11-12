# Vendor verification

**Planned, not built.** The vendor portal (VEN-01, VEN-02) collects these documents and the staff verification queue (ADM-04) reviews them. The database already has `VendorDocument` (with `verifiedByUserId` and `verifiedAt`) and `VendorStatus`; ABN Lookup (`packages/integrations`) is a placeholder. Until then, check partners by hand against this table before booking them.

| Check                                       | How                                                                                       | Required for                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| ABN active and name match                   | ABN Lookup web services; store a snapshot                                                 | All                                                    |
| GST registration status                     | ABN Lookup                                                                                | All (affects invoicing)                                |
| Public liability certificate of currency    | Upload, then staff review of the insurer, cover (≥ $20M for venue-facing work) and expiry | All on-site vendors                                    |
| Food safety (registration, FSS certificate) | Upload and review                                                                         | Caterers, cake makers                                  |
| Liquor licence and RSA                      | Upload and review                                                                         | Bar services                                           |
| Working with Children Check (WA)            | Upload and verify on the WA WWC online check                                              | Kids' entertainers and anyone doing child-related work |
| Pyrotechnics or drone licences              | Upload and review                                                                         | Where offered                                          |
| Portfolio and references                    | Review                                                                                    | All                                                    |

- **Expiry:** reminders 30 and 7 days before a document expires; the vendor is suspended from new bookings when a required document lapses. The worker declares a `vendor.compliance_expiry_check` schedule with no handler yet (ADM-04).
- **Decisions:** approve or reject with a reason, written to `AuditLog`.
- Documents are stored privately (R2 private bucket, D-04).
