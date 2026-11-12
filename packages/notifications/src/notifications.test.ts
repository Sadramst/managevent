import { describe, expect, it } from "vitest";
import {
  type EmailTransport,
  evaluateSendCompliance,
  hashRecipientAddress,
  isQuietHours,
  NotificationTransportNotConfiguredError,
  type NotificationTemplateKey,
  renderNotificationTemplate,
  ResendNotificationClient,
  TwilioNotificationClient,
} from "./index.js";

describe("@managevent/notifications", () => {
  it("renders all templates in EN with sender identification and unsubscribe", () => {
    const keys: NotificationTemplateKey[] = [
      "lead.auto_reply",
      "invitation.send",
      "rsvp.reminder",
      "event.day_of_update",
    ];

    for (const key of keys) {
      const en = renderNotificationTemplate(key, "en", {
        guestName: "Sara",
        hostName: "Ali",
        eventTitle: "Engagement Party",
        rsvpBy: "1 Dec 2026",
      });

      expect(en.subject).toContain("Managevent");
      expect(en.body.length).toBeGreaterThan(20);
    }
  });

  it("enforces quiet hours (8am–8pm Perth time), consent, and suppression rules", () => {
    // 2026-10-23T04:00:00Z is 12:00 PM (noon) in Perth (UTC+8) -> NOT quiet hours
    const perthNoon = new Date("2026-10-23T04:00:00.000Z");
    expect(isQuietHours(perthNoon, 480)).toBe(false);

    // 2026-10-23T14:00:00Z is 10:00 PM in Perth (UTC+8) -> IS quiet hours
    const perthNight = new Date("2026-10-23T14:00:00.000Z");
    expect(isQuietHours(perthNight, 480)).toBe(true);

    const suppressedSet = new Set([hashRecipientAddress("unsub@example.com")]);

    // Blocked by suppression even for transactional
    const supDecision = evaluateSendCompliance({
      channel: "EMAIL",
      recipientAddress: "UNSUB@example.com",
      category: "TRANSACTIONAL",
      consentVerified: true,
      suppressedAddressHashes: suppressedSet,
      now: perthNoon,
    });
    expect(supDecision.allowed).toBe(false);
    expect(supDecision.blockedReason).toBe("SUPPRESSED_UNSUBSCRIBED");

    // Blocked by missing consent for marketing/reminder
    const noConsent = evaluateSendCompliance({
      channel: "SMS",
      recipientAddress: "+61412345678",
      category: "INVITATION_REMINDER",
      consentVerified: false,
      suppressedAddressHashes: suppressedSet,
      now: perthNoon,
    });
    expect(noConsent.allowed).toBe(false);
    expect(noConsent.blockedReason).toBe("MISSING_CONSENT");

    // Blocked by quiet hours for reminder at 10pm Perth time
    const quietBlocked = evaluateSendCompliance({
      channel: "SMS",
      recipientAddress: "+61412345678",
      category: "INVITATION_REMINDER",
      consentVerified: true,
      suppressedAddressHashes: suppressedSet,
      now: perthNight,
    });
    expect(quietBlocked.allowed).toBe(false);
    expect(quietBlocked.blockedReason).toBe("QUIET_HOURS");

    // Day-of operational message allowed during quiet hours when consent is verified
    const dayOfAllowed = evaluateSendCompliance({
      channel: "SMS",
      recipientAddress: "+61412345678",
      category: "DAY_OF",
      consentVerified: true,
      suppressedAddressHashes: suppressedSet,
      now: perthNight,
    });
    expect(dayOfAllowed.allowed).toBe(true);
  });

  it("fails closed without a transport instead of faking a provider id", async () => {
    const perthNoon = new Date("2026-10-23T04:00:00.000Z");
    const resend = new ResendNotificationClient();
    const twilio = new TwilioNotificationClient();

    await expect(
      resend.sendTemplatedEmail({
        to: "sara@example.com",
        locale: "en",
        templateKey: "invitation.send",
        category: "INVITATION_REMINDER",
        variables: { guestName: "Sara" },
        consentVerified: true,
        now: perthNoon,
      }),
    ).rejects.toBeInstanceOf(NotificationTransportNotConfiguredError);

    for (const channel of ["SMS", "WHATSAPP"] as const) {
      await expect(
        twilio.sendTemplatedMessage({
          channel,
          to: "+61412345678",
          locale: "en",
          templateKey: "rsvp.reminder",
          category: "INVITATION_REMINDER",
          variables: { guestName: "Sara" },
          consentVerified: true,
          now: perthNoon,
        }),
      ).rejects.toMatchObject({ name: "NotificationTransportNotConfiguredError", channel });
    }

    // A send the compliance rules block never reaches the transport, configured or not.
    const blocked = await resend.sendTemplatedEmail({
      to: "sara@example.com",
      locale: "en",
      templateKey: "rsvp.reminder",
      category: "INVITATION_REMINDER",
      variables: {},
      consentVerified: false,
      now: perthNoon,
    });
    expect(blocked).toMatchObject({ sent: false, blockedReason: "MISSING_CONSENT" });
  });

  it("sends through the injected transports with the rendered template", async () => {
    const perthNoon = new Date("2026-10-23T04:00:00.000Z");
    const emails: Parameters<EmailTransport["send"]>[0][] = [];
    const resend = new ResendNotificationClient({
      transport: {
        send(p) {
          emails.push(p);
          return Promise.resolve({ providerId: "re_1" });
        },
      },
      invitationsFrom: "Invites <invite@example.com>",
    });
    const sms: string[] = [];
    const whatsapp: string[] = [];
    const twilio = new TwilioNotificationClient({
      transport: {
        sendSms(p) {
          sms.push(p.senderId);
          return Promise.resolve({ providerId: "SM_1" });
        },
        sendWhatsAppTemplate(p) {
          whatsapp.push(p.templateKey);
          return Promise.resolve({ providerId: "WA_1" });
        },
      },
      smsSenderId: "Managevent",
    });

    const emailRes = await resend.sendTemplatedEmail({
      to: "sara@example.com",
      locale: "en",
      templateKey: "invitation.send",
      category: "INVITATION_REMINDER",
      variables: { guestName: "Sara", hostName: "Ali", eventTitle: "Engagement Party" },
      consentVerified: true,
      icsAttachment: "BEGIN:VCALENDAR...",
      now: perthNoon,
    });
    expect(emailRes).toMatchObject({ sent: true, providerId: "re_1" });
    expect(emails[0]).toMatchObject({
      from: "Invites <invite@example.com>",
      to: "sara@example.com",
      icsAttachment: "BEGIN:VCALENDAR...",
    });
    expect(emails[0]?.subject).toContain("Engagement Party");

    const smsRes = await twilio.sendTemplatedMessage({
      channel: "SMS",
      to: "+61412345678",
      locale: "en",
      templateKey: "rsvp.reminder",
      category: "INVITATION_REMINDER",
      variables: { guestName: "Sara", eventTitle: "Wedding" },
      consentVerified: true,
      now: perthNoon,
    });
    expect(smsRes).toMatchObject({ sent: true, providerId: "SM_1" });
    expect(sms).toEqual(["Managevent"]);

    const waRes = await twilio.sendTemplatedMessage({
      channel: "WHATSAPP",
      to: "+61412345678",
      locale: "en",
      templateKey: "invitation.send",
      category: "INVITATION_REMINDER",
      variables: { guestName: "Sara" },
      consentVerified: true,
      now: perthNoon,
    });
    expect(waRes).toMatchObject({ sent: true, providerId: "WA_1" });
    expect(whatsapp).toEqual(["invitation.send"]);
  });
});
