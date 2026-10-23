# Incident & Notifiable Data Breach Runbook (`infra/INCIDENT_RUNBOOK.md`)

> Reference: Australian Privacy Act 1988 — Notifiable Data Breaches (NDB) scheme and `docs/compliance/PRIVACY.md`.

## 1. Immediate containment (0–4 hours)

1. **Page `SUPER_ADMIN` on call.**
2. **Isolate affected credentials or tokens:**
   - If a guest link is compromised, set `Party.tokenRevokedAt = now()` and reissue with a new suffix.
   - If `PII_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, or `GUEST_TOKEN_PEPPER` is suspected exposed, rotate immediately in Fly.io / Vercel secrets and invalidate active sessions in `Session`.
3. **Preserve evidence:** snapshot `AuditLog` and redacted structured logs in `ap-southeast-2`.

## 2. Assessment (within 30 days max; target 72 hours)

1. Identify which records were accessed (`User`, `Guest`, `Rsvp` encrypted dietary/allergy fields, `Payment`, `VendorDocument`).
2. Verify whether field-level AES-256-GCM encryption (`enc:v1:...`) remained intact.
3. Determine whether the breach is likely to result in serious harm to any individual.

## 3. Notification (if eligible data breach)

1. Prepare statement for the **Office of the Australian Information Commissioner (OAIC)**.
2. Notify affected individuals in English and Farsi with actionable remediation steps.
3. Record the incident in the Admin Breach Register (`AuditLog`).
