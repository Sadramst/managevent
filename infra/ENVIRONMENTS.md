# Environments

| Env        | Web                           | API                     | DB                               | Stripe / Twilio    |
| ---------- | ----------------------------- | ----------------------- | -------------------------------- | ------------------ |
| local      | `localhost:3000–3004`         | `localhost:4000`        | Docker Postgres 16               | Test mode or mocks |
| preview    | Vercel preview per PR         | Shared staging API      | Staging DB (a branch DB if Neon) | Test               |
| staging    | `*.staging.managevent.com.au` | `api.staging…`          | Staging DB (Sydney)              | Test               |
| production | `*.managevent.com.au`         | `api.managevent.com.au` | Prod DB (Sydney) with PITR       | **Live**           |

## Ports (local)

marketing 3000 · invitation 3001 · portal 3002 · vendors 3003 · admin 3004 · api 4000 · desktop dev 1420 · Expo 8081

## Secrets

- **Web apps:** Vercel environment variables. **API and worker:** Fly secrets (or AWS Secrets Manager). **Mobile:** EAS secrets. **CI:** GitHub Actions secrets.
- **Never** in the repo. `.env.example` lists the names only.
- Rotate keys every 12 months, or immediately if one is exposed.
