# AGENTS.md: packages/notifications

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Email, SMS, WhatsApp and push**. Resend and Twilio wrappers, Expo push, bilingual templates (React Email for email), quiet-hours checks, unsubscribe and suppression checks.

- **Built by:** FND-13 (see `ROADMAP.md`)
- **Consumers:** see the "Depends on" section in each app's `AGENTS.md`.

## Rules

- Every send checks consent and suppression first. Templates exist in EN and FA.
- Used by `apps/worker` (and the API for synchronous transactional sends only).

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
