# @managevent/notifications

Spam Act 2003 send checks (consent, channel suppression, 8am to 8pm quiet hours in the recipient's local time), plain-text English templates, and email (`ResendNotificationClient`) and SMS/WhatsApp (`TwilioNotificationClient`) clients that run those checks before calling a transport you inject.

> **Not used by any app yet.** Today's email is sent by Resend adapters in `apps/api` and `apps/worker`. SMS and WhatsApp sending is INV-08 in [`ROADMAP.md`](../../ROADMAP.md). Rules: [`AGENTS.md`](AGENTS.md).

## Usage

```ts
import { ResendNotificationClient, type EmailTransport } from "@managevent/notifications";

const transport: EmailTransport = createRealResendTransport(); // you provide it
const client = new ResendNotificationClient({ transport });

const result = await client.sendTemplatedEmail({
  to: "sara@example.com",
  locale: "en",
  templateKey: "lead.auto_reply",
  category: "TRANSACTIONAL",
  variables: { guestName: "Sara" },
  consentVerified: true,
});
// result: { sent, providerId?, recipientHash, blockedReason? }
```

- Templates: `lead.auto_reply`, `invitation.send`, `rsvp.reminder`, `event.day_of_update`.
- Categories: suppression applies to every category. Consent is required for everything except `TRANSACTIONAL`. Quiet hours apply to `MARKETING` and `INVITATION_REMINDER`, using `recipientUtcOffsetMinutes` (Perth when omitted).
- A blocked send returns `sent: false` with `MISSING_CONSENT`, `SUPPRESSED_UNSUBSCRIBED` or `QUIET_HOURS`.
- Without a transport, a send that passes the checks throws `NotificationTransportNotConfiguredError`. Nothing is faked.
- Sender addresses come from `EMAIL_FROM_TRANSACTIONAL` and `EMAIL_FROM_INVITATIONS`; SMS and WhatsApp senders from `SMS_SENDER_ID` and `TWILIO_WHATSAPP_SENDER`.
