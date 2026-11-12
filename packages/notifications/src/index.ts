/**
 * @managevent/notifications
 *
 * Resend (email) and Twilio (SMS & WhatsApp) wrappers with Australian Spam Act 2003 compliance:
 * - Express / attested consent checks
 * - Global per-channel suppression (unsubscribe) checks
 * - Quiet-hours enforcement (8:00 AM – 8:00 PM in recipient time zone, default `Australia/Perth`)
 * - `en` (en-AU) templates with sender identification and opt-out instructions
 */
import { createHash } from "node:crypto";
import { PERTH_UTC_OFFSET_MINUTES } from "@managevent/i18n";
import type { EnabledLocale, MessageChannel } from "@managevent/types";

export type NotificationCategory = "TRANSACTIONAL" | "INVITATION_REMINDER" | "MARKETING" | "DAY_OF";

export type NotificationTemplateKey =
  "lead.auto_reply" | "invitation.send" | "rsvp.reminder" | "event.day_of_update";

export interface RenderedTemplate {
  subject: string;
  body: string;
}

export interface TemplateVariables {
  guestName?: string;
  hostName?: string;
  eventTitle?: string;
  link?: string;
  rsvpBy?: string;
  unsubscribeUrl?: string;
}

const TEMPLATES: Readonly<
  Record<
    NotificationTemplateKey,
    Readonly<Record<EnabledLocale, { subject: string; body: string }>>
  >
> = {
  "lead.auto_reply": {
    en: {
      subject: "We have received your enquiry — Managevent Perth",
      body: "Dear {guestName}, thank you for contacting Managevent. A Perth coordinator will respond within 1 business hour.\n\nManagevent (Appilico) · Unsubscribe: {unsubscribeUrl}",
    },
  },
  "invitation.send": {
    en: {
      subject: "You are invited to {eventTitle} — from {hostName} via Managevent",
      body: "Dear {guestName}, {hostName} warmly invites you to {eventTitle}. View your personal invitation and RSVP by {rsvpBy}: {link}\n\nSent by Managevent on behalf of {hostName}. Unsubscribe: {unsubscribeUrl} or reply STOP.",
    },
  },
  "rsvp.reminder": {
    en: {
      subject: "Friendly RSVP reminder for {eventTitle} — Managevent",
      body: "Dear {guestName}, a gentle reminder from {hostName} to RSVP for {eventTitle} by {rsvpBy}: {link}\n\nManagevent · Unsubscribe: {unsubscribeUrl} or reply STOP.",
    },
  },
  "event.day_of_update": {
    en: {
      subject: "Day-of update for {eventTitle} — Managevent",
      body: "Dear {guestName}, update for {eventTitle} from {hostName}: {link}\n\nManagevent · Reply STOP to opt out.",
    },
  },
};

/**
 * Renders a notification template in `en` with variable interpolation.
 */
export function renderNotificationTemplate(
  templateKey: NotificationTemplateKey,
  locale: EnabledLocale,
  vars: TemplateVariables,
): RenderedTemplate {
  const tpl = TEMPLATES[templateKey][locale];
  const mergedVars: Record<string, string> = {
    guestName: vars.guestName ?? "Guest",
    hostName: vars.hostName ?? "Managevent Host",
    eventTitle: vars.eventTitle ?? "Ceremony",
    link: vars.link ?? "https://invitation.managevent.com.au",
    rsvpBy: vars.rsvpBy ?? "",
    unsubscribeUrl: vars.unsubscribeUrl ?? "https://www.managevent.com.au/unsubscribe",
  };

  const interpolate = (str: string) =>
    str.replace(/\{([a-zA-Z0-9_]+)\}/g, (m, k: string) => mergedVars[k] ?? m);

  return {
    subject: interpolate(tpl.subject),
    body: interpolate(tpl.body),
  };
}

/**
 * Hashes an email address or phone number using SHA-256 for privacy-preserving suppression and analytics logs.
 */
export function hashRecipientAddress(address: string): string {
  return createHash("sha256").update(address.trim().toLowerCase()).digest("hex");
}

/**
 * Checks whether a timestamp falls inside the allowed local sending window (08:00 to 20:00)
 * in the recipient's time zone (`docs/compliance/MESSAGING_SPAM_ACT.md`).
 *
 * Returns `true` if `now` is in quiet hours (before 08:00 or at/after 20:00 local time).
 */
export function isQuietHours(
  now: Date,
  recipientUtcOffsetMinutes: number = PERTH_UTC_OFFSET_MINUTES,
): boolean {
  const localMs = now.getTime() + recipientUtcOffsetMinutes * 60_000;
  const localHour = new Date(localMs).getUTCHours();
  return localHour < 8 || localHour >= 20;
}

export interface SendComplianceGuardInput {
  channel: Extract<MessageChannel, "EMAIL" | "SMS" | "WHATSAPP">;
  recipientAddress: string;
  category: NotificationCategory;
  /** Whether the recipient granted consent (`ConsentRecord`) or the host attested consent (`consentAttestationUserId`). */
  consentVerified: boolean;
  /** Set of SHA-256 hashed addresses that have unsubscribed on this channel. */
  suppressedAddressHashes: ReadonlySet<string>;
  now?: Date;
  recipientUtcOffsetMinutes?: number;
}

export interface SendComplianceDecision {
  allowed: boolean;
  recipientHash: string;
  blockedReason?: "MISSING_CONSENT" | "SUPPRESSED_UNSUBSCRIBED" | "QUIET_HOURS";
}

/**
 * Evaluates Spam Act 2003 consent, global channel suppression, and quiet-hours rules before sending.
 */
export function evaluateSendCompliance(input: SendComplianceGuardInput): SendComplianceDecision {
  const recipientHash = hashRecipientAddress(input.recipientAddress);

  if (input.suppressedAddressHashes.has(recipientHash)) {
    return {
      allowed: false,
      recipientHash,
      blockedReason: "SUPPRESSED_UNSUBSCRIBED",
    };
  }

  if (!input.consentVerified && input.category !== "TRANSACTIONAL") {
    return {
      allowed: false,
      recipientHash,
      blockedReason: "MISSING_CONSENT",
    };
  }

  // Marketing and RSVP reminders must obey 8am–8pm quiet hours; transactional and day-of operational updates are exempt
  if (input.category === "MARKETING" || input.category === "INVITATION_REMINDER") {
    const now = input.now ?? new Date();
    if (isQuietHours(now, input.recipientUtcOffsetMinutes ?? PERTH_UTC_OFFSET_MINUTES)) {
      return {
        allowed: false,
        recipientHash,
        blockedReason: "QUIET_HOURS",
      };
    }
  }

  return {
    allowed: true,
    recipientHash,
  };
}

/**
 * Thrown by a client that was built without a transport. Nothing is faked: until a real Resend or
 * Twilio transport is passed in, every send that passes the compliance checks fails loudly.
 */
export class NotificationTransportNotConfiguredError extends Error {
  readonly channel: "EMAIL" | "SMS" | "WHATSAPP";

  constructor(channel: "EMAIL" | "SMS" | "WHATSAPP") {
    super(`No ${channel} transport is configured; nothing was sent`);
    this.name = "NotificationTransportNotConfiguredError";
    this.channel = channel;
  }
}

export interface EmailTransport {
  send(params: {
    from: string;
    to: string;
    subject: string;
    text: string;
    icsAttachment?: string;
  }): Promise<{ providerId: string }>;
}

export interface MessagingTransport {
  sendSms(params: { senderId: string; to: string; body: string }): Promise<{ providerId: string }>;
  sendWhatsAppTemplate(params: {
    from: string;
    to: string;
    templateKey: NotificationTemplateKey;
    locale: EnabledLocale;
    body: string;
  }): Promise<{ providerId: string }>;
}

/**
 * Email client: compliance checks, then the injected transport (Resend). Without a transport it
 * fails closed with `NotificationTransportNotConfiguredError`.
 */
export class ResendNotificationClient {
  private readonly transport: EmailTransport;
  private readonly transactionalFrom: string;
  private readonly invitationsFrom: string;

  constructor(options?: {
    transport?: EmailTransport;
    transactionalFrom?: string;
    invitationsFrom?: string;
  }) {
    this.transactionalFrom =
      options?.transactionalFrom ??
      process.env.EMAIL_FROM_TRANSACTIONAL ??
      "Managevent <hello@managevent.com.au>";
    this.invitationsFrom =
      options?.invitationsFrom ??
      process.env.EMAIL_FROM_INVITATIONS ??
      "Managevent Invitations <invite@invitation.managevent.com.au>";
    this.transport =
      options?.transport ??
      ({
        send() {
          return Promise.reject(new NotificationTransportNotConfiguredError("EMAIL"));
        },
      } satisfies EmailTransport);
  }

  async sendTemplatedEmail(params: {
    to: string;
    locale: EnabledLocale;
    templateKey: NotificationTemplateKey;
    category: NotificationCategory;
    variables: TemplateVariables;
    consentVerified: boolean;
    suppressedAddressHashes?: ReadonlySet<string>;
    icsAttachment?: string;
    now?: Date;
    recipientUtcOffsetMinutes?: number;
  }): Promise<{
    sent: boolean;
    providerId?: string;
    recipientHash: string;
    blockedReason?: SendComplianceDecision["blockedReason"];
  }> {
    const decision = evaluateSendCompliance({
      channel: "EMAIL",
      recipientAddress: params.to,
      category: params.category,
      consentVerified: params.consentVerified,
      suppressedAddressHashes: params.suppressedAddressHashes ?? new Set(),
      ...(params.now ? { now: params.now } : {}),
      ...(params.recipientUtcOffsetMinutes !== undefined
        ? { recipientUtcOffsetMinutes: params.recipientUtcOffsetMinutes }
        : {}),
    });

    if (!decision.allowed) {
      return {
        sent: false,
        recipientHash: decision.recipientHash,
        ...(decision.blockedReason ? { blockedReason: decision.blockedReason } : {}),
      };
    }

    const rendered = renderNotificationTemplate(
      params.templateKey,
      params.locale,
      params.variables,
    );
    const from =
      params.templateKey === "invitation.send" || params.templateKey === "rsvp.reminder"
        ? this.invitationsFrom
        : this.transactionalFrom;

    const res = await this.transport.send({
      from,
      to: params.to,
      subject: rendered.subject,
      text: rendered.body,
      ...(params.icsAttachment ? { icsAttachment: params.icsAttachment } : {}),
    });

    return {
      sent: true,
      providerId: res.providerId,
      recipientHash: decision.recipientHash,
    };
  }
}

/**
 * SMS and WhatsApp client enforcing sender ID (`Managevent`), consent attestation, suppression
 * and quiet hours, then the injected transport (Twilio). Without a transport it fails closed with
 * `NotificationTransportNotConfiguredError`.
 */
export class TwilioNotificationClient {
  private readonly transport: MessagingTransport;
  private readonly smsSenderId: string;
  private readonly whatsappSender: string;

  constructor(options?: {
    transport?: MessagingTransport;
    smsSenderId?: string;
    whatsappSender?: string;
  }) {
    this.smsSenderId = options?.smsSenderId ?? process.env.SMS_SENDER_ID ?? "Managevent";
    this.whatsappSender =
      options?.whatsappSender ?? process.env.TWILIO_WHATSAPP_SENDER ?? "whatsapp:+61400000000";
    this.transport =
      options?.transport ??
      ({
        sendSms() {
          return Promise.reject(new NotificationTransportNotConfiguredError("SMS"));
        },
        sendWhatsAppTemplate() {
          return Promise.reject(new NotificationTransportNotConfiguredError("WHATSAPP"));
        },
      } satisfies MessagingTransport);
  }

  async sendTemplatedMessage(params: {
    channel: "SMS" | "WHATSAPP";
    to: string;
    locale: EnabledLocale;
    templateKey: NotificationTemplateKey;
    category: NotificationCategory;
    variables: TemplateVariables;
    consentVerified: boolean;
    suppressedAddressHashes?: ReadonlySet<string>;
    now?: Date;
    recipientUtcOffsetMinutes?: number;
  }): Promise<{
    sent: boolean;
    providerId?: string;
    recipientHash: string;
    blockedReason?: SendComplianceDecision["blockedReason"];
  }> {
    const decision = evaluateSendCompliance({
      channel: params.channel,
      recipientAddress: params.to,
      category: params.category,
      consentVerified: params.consentVerified,
      suppressedAddressHashes: params.suppressedAddressHashes ?? new Set(),
      ...(params.now ? { now: params.now } : {}),
      ...(params.recipientUtcOffsetMinutes !== undefined
        ? { recipientUtcOffsetMinutes: params.recipientUtcOffsetMinutes }
        : {}),
    });

    if (!decision.allowed) {
      return {
        sent: false,
        recipientHash: decision.recipientHash,
        ...(decision.blockedReason ? { blockedReason: decision.blockedReason } : {}),
      };
    }

    const rendered = renderNotificationTemplate(
      params.templateKey,
      params.locale,
      params.variables,
    );

    const res =
      params.channel === "SMS"
        ? await this.transport.sendSms({
            senderId: this.smsSenderId,
            to: params.to,
            body: rendered.body,
          })
        : await this.transport.sendWhatsAppTemplate({
            from: this.whatsappSender,
            to: params.to,
            templateKey: params.templateKey,
            locale: params.locale,
            body: rendered.body,
          });

    return {
      sent: true,
      providerId: res.providerId,
      recipientHash: decision.recipientHash,
    };
  }
}
