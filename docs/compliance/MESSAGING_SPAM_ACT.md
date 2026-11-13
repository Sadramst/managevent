# Messaging: Spam Act 2003, SMS and WhatsApp

> Verify the current ACMA requirements when SMS is implemented.

## Classification

- **Invitations, RSVP reminders and day-of updates** are sent on the host's behalf to their invitees. We require the host's attestation that recipients expect them, and each one still identifies us and offers an opt-out.
- **Marketing** (our offers to enquirers and customers) needs express consent: an unticked checkbox whose wording is stored in a `ConsentRecord`.

## Every message must

- Identify the sender (Managevent, and the host's name for invitations).
- Include a working opt-out (email: a link; SMS: "Reply STOP"). Honour it at once; suppressions apply per channel to every event.
- Be sent only between 8am and 8pm in the recipient's local time, except day-of operational messages.

## What is implemented (email only)

| Rule                  | Where                                                                                                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing consent     | Enquiry form checkbox → `ConsentRecord` purpose `MARKETING_EMAIL`, written with the lead (`apps/api/src/modules/crm/repo.ts`)                                                                                    |
| Host attestation      | Every campaign stores `Campaign.consentAttestationUserId` (`apps/api/src/modules/messaging/service.ts`)                                                                                                          |
| Opt-out               | Signed unsubscribe link in every invitation email; `/unsubscribe` on `invitation.` records an `Unsubscribe` row; the worker re-checks it before each send (`apps/worker/src/jobs/email-campaign.ts`)             |
| Sender identification | Email footer `emails.unsubscribeFooter` in `packages/i18n` ("Managevent (Appilico) · Perth WA")                                                                                                                  |
| Quiet hours           | Reminders that would go out before 8am or after 8pm at the event are not sent; the campaign is marked failed and the host can resend. Automated reminder sequences (INV-19) enforce the same quiet hours window. |

Email goes through Resend directly from `apps/api` and `apps/worker`, only when `RESEND_API_KEY` is set. `packages/notifications` (which wraps Resend and Twilio with the same checks) is not used by any app yet.

## SMS (planned, INV-08)

- The alphanumeric sender id `Managevent` must be registered with the ACMA SMS Sender ID Register (BIZ-05). Verify the timeline and process.
- Bulk sends need the same host attestation as email campaigns.

## WhatsApp (planned, INV-08)

- Business-initiated messages through Twilio use **approved templates** only, in English (BIZ-05). Opt-outs are honoured and recorded.
- Click-to-send `wa.me` links, sent from the host's own phone, are outside our sending infrastructure. The Share tab of the studio offers them today.
