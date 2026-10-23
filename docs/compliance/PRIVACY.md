# Privacy (engineering and policy notes)

> Not legal advice. The public privacy policy must be drafted and reviewed by a lawyer. This file tells engineers what the product must do.

## Position

We comply with the Australian Privacy Principles (APPs) **regardless of whether the small-business exemption might apply**:

- We handle health-related information (dietary requirements and allergies).
- Customers expect it.
- Privacy law reform in Australia is ongoing.

Check the status of the reforms at launch.

## Principles in the product

1. **Collection minimisation (APP 3):**
   - Guests are asked only for what the host turned on.
   - Dietary and allergy data is optional, has a purpose statement next to it, and the consent text is recorded (`ConsentRecord: HEALTH_DATA_CATERING`).
2. **Notice (APP 5):** a short collection notice appears on every form, plus a link to the privacy policy (EN and FA).
3. **Use and disclosure (APP 6):**
   - Dietary data goes to the caterer for that event only, as counts plus per-table flags for severe allergies. Never for marketing.
4. **Cross-border (APP 8):** offshore processors are listed (ADR-0008). Never send guest PII or health data to AI providers.
5. **Security (APP 11):**
   - Field-level encryption for 🔒 fields, TLS everywhere, least-privilege RBAC, MFA for staff, and an audit log.
   - Retention and deletion follow the `DATA_MODEL.md` schedule, enforced by scheduled worker jobs.
6. **Access and correction (APP 12/13):**
   - Users can export and correct their data in `app.`.
   - Guests can correct their RSVP through their link, or ask the host or us.
7. **Children:** guests may be children, but children never hold accounts. Hosts enter children's details. Keep children's data to the minimum (name and dietary needs).

## Breach response (Notifiable Data Breaches)

1. Contain the breach.
2. Assess within 30 days whether serious harm is likely.
3. If it is, notify the OAIC and affected individuals.
4. Keep a breach register in the admin.

Owner: SUPER_ADMIN on call. The runbook is in `infra/INCIDENT_RUNBOOK.md` (to be written in FND-15).

## Photos

- Photo wall uploads are visible only after host approval.
- EXIF location data is stripped.
- Gallery and marketing use of any photo requires a `PHOTO_PUBLICATION` consent record.
