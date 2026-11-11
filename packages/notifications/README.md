# @managevent/notifications

Resend (email) and Twilio (SMS & WhatsApp) wrappers with Australian Spam Act 2003 compliance (consent verification, global channel suppression, 8am–8pm quiet hours in recipient local time, and English templates).

## Usage

```ts
import { ResendNotificationClient } from "@managevent/notifications";

const client = new ResendNotificationClient();
await client.sendTemplatedEmail({
  to: "sara@example.com",
  locale: "en",
  templateKey: "lead.auto_reply",
  category: "TRANSACTIONAL",
  variables: { guestName: "Sara" },
  consentVerified: true,
});
```
