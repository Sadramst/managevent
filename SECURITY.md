# Security Policy

## Reporting a vulnerability

Email **security@managevent.com.au** (placeholder: create this mailbox before launch). Do not open public issues for security problems.

## Ground rules

- This repository must stay **private**. Never commit secrets, salts, API keys, certificates, signing keys, `.env` files or real guest data.
- Secrets live in the Vercel, Supabase/Neon, Fly.io, EAS and GitHub Actions secret stores. See `infra/ENVIRONMENTS.md`.
- If a secret is committed by mistake, **rotate it immediately**. Rewriting git history is not enough.
- Data breaches involving personal information may be notifiable under the Notifiable Data Breaches scheme. See `docs/compliance/PRIVACY.md` §Breach response.
