# AGENTS.md: packages/notifications

> Inherits **all** rules from the root `AGENTS.md`. **This package is a shared contract.** Changes that affect consumers need the `contract-change` label (root `AGENTS.md` §6).

## What this is

**Send compliance and message clients for email, SMS and WhatsApp.** Spam Act checks (`evaluateSendCompliance`: consent, channel suppression, 8am to 8pm quiet hours), plain-text English templates, address hashing, and `ResendNotificationClient` / `TwilioNotificationClient`, which run the checks and then call an injected transport.

- **Status:** built and unit-tested, but **no app uses it yet**. The email that works today (invitations, reminders, enquiry auto-reply) is sent by Resend adapters inside `apps/api` and `apps/worker`.
- **Planned:** SMS and WhatsApp sending through Twilio (INV-08), and push notifications (MOB-06). There is no push code here yet.

## Rules

- Every send checks consent and suppression first, and marketing and reminder sends respect quiet hours in the recipient's local time.
- The clients ship no real transport. Without one they fail closed with `NotificationTransportNotConfiguredError`; never add a default that pretends to send.
- Store and log recipients only as `hashRecipientAddress()` hashes.
- Templates are en-AU.

## Done means

- Public API exported from `src/index.ts` with TSDoc comments.
- Unit tests (Vitest), and a README usage example.
- No app-specific code; this package must stay generic to the platform.
