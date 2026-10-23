import { describe, expect, it } from "vitest";
import {
  evaluateSendCompliance,
  hashRecipientAddress,
  isQuietHours,
  type NotificationTemplateKey,
  renderNotificationTemplate,
  ResendNotificationClient,
  TwilioNotificationClient,
} from "./index.js";

describe("@managevent/notifications", () => {
  it("renders all bilingual templates in EN and FA with sender identification and unsubscribe", () => {
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
        eventTitle: "Sofreh Aghd",
        rsvpBy: "1 Dec 2026",
      });
      const fa = renderNotificationTemplate(key, "fa", {
        guestName: "سارا",
        hostName: "علی",
        eventTitle: "سفره عقد",
        rsvpBy: "۱۰ آذر ۱۴۰۵",
      });

      expect(en.subject).toContain("Managevent");
      expect(fa.subject).toContain("منج‌ایونت");
      expect(en.body.length).toBeGreaterThan(20);
      expect(fa.body.length).toBeGreaterThan(20);
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

  it("sends emails via ResendNotificationClient and SMS/WhatsApp via TwilioNotificationClient (mocked)", async () => {
    const perthNoon = new Date("2026-10-23T04:00:00.000Z");
    const resend = new ResendNotificationClient();
    const twilio = new TwilioNotificationClient();

    const emailRes = await resend.sendTemplatedEmail({
      to: "sara@example.com",
      locale: "fa",
      templateKey: "invitation.send",
      category: "INVITATION_REMINDER",
      variables: { guestName: "سارا", hostName: "علی", eventTitle: "سفره عقد" },
      consentVerified: true,
      icsAttachment: "BEGIN:VCALENDAR...",
      now: perthNoon,
    });
    expect(emailRes.sent).toBe(true);
    expect(emailRes.providerId).toMatch(/^re_mock_/);

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
    expect(smsRes.sent).toBe(true);
    expect(smsRes.providerId).toMatch(/^SM_mock_/);

    const waRes = await twilio.sendTemplatedMessage({
      channel: "WHATSAPP",
      to: "+61412345678",
      locale: "fa",
      templateKey: "invitation.send",
      category: "INVITATION_REMINDER",
      variables: { guestName: "سارا" },
      consentVerified: true,
      now: perthNoon,
    });
    expect(waRes.sent).toBe(true);
    expect(waRes.providerId).toMatch(/^WA_mock_/);
  });
});
