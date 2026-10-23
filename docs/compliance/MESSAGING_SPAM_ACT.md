# Messaging: Spam Act 2003, SMS and WhatsApp

> Verify the current ACMA requirements at implementation time.

## Classification

- **Invitations, RSVP reminders and day-of updates** are sent on behalf of the host to their invitees. We treat them as messages requiring the host's attestation that recipients expect them. Each one still includes our identification and an opt-out.
- **Marketing** (our offers to leads and customers) requires express consent (an unticked checkbox, recorded in `ConsentRecord`) or clearly inferred consent where the law allows.

## Every message must

- Identify the sender (Managevent, and the host's name for invitations).
- Include a functional unsubscribe or opt-out (SMS: "Reply STOP"; email: a link). Honour it within the legal period. We aim for immediately, and suppressions are global per channel.
- Be sent only between 8am and 8pm in the recipient's local time, except day-of operational messages.

## SMS

- The alphanumeric sender id `Managevent` must be registered as required by the ACMA SMS Sender ID Register. Verify the timeline and process.
- Bulk sends require `Campaign.consentAttestationUserId` (the host ticks "These people expect to hear from me about this event").

## WhatsApp (Twilio)

- Business-initiated messages use **approved templates** only, in both EN and FA.
- Opt-outs are honoured and recorded.
- Click-to-send `wa.me` links (sent from the host's own phone) are outside our sending infrastructure and are always available.
