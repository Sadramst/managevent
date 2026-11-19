/**
 * iCalendar (RFC 5545) output for the guest "add to calendar" link: one `VEVENT` in UTC.
 *
 * `escapeIcsText` and `formatIcsDate` are ported from the invitation app's
 * `calendar.ics/ics-helpers.ts`. Lines are folded at 75 octets and end with CRLF.
 */

/** Default length of an event without an end time. */
export const DEFAULT_EVENT_DURATION_MS = 5 * 60 * 60 * 1000;

const MAX_LINE_OCTETS = 75;

/** Escapes RFC 5545 TEXT values: backslash first, then newlines, then separators. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[,;]/g, "\\$&");
}

/** UTC basic format (`YYYYMMDDTHHMMSSZ`): the correct instant for any event time zone. */
export function formatIcsDate(value: Date | string): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Folds one content line so that no physical line is longer than 75 octets (UTF-8), as RFC 5545
 * section 3.1 requires. Continuation lines start with a single space, which counts towards their
 * 75 octets. A multi-byte character is never split.
 */
export function foldIcsLine(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= MAX_LINE_OCTETS) return line;

  const parts: string[] = [];
  let current = "";
  let currentOctets = 0;
  // The first line may use all 75 octets; later lines lose one to the leading space.
  let limit = MAX_LINE_OCTETS;

  for (const char of line) {
    const octets = Buffer.byteLength(char, "utf8");
    if (currentOctets + octets > limit) {
      parts.push(current);
      current = "";
      currentOctets = 0;
      limit = MAX_LINE_OCTETS - 1;
    }
    current += char;
    currentOctets += octets;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export interface InvitationIcsInput {
  uid: string;
  /** When the file was generated. */
  stamp: Date;
  startsAt: Date;
  /** Defaults to five hours after `startsAt`. */
  endsAt: Date | null;
  summary: string;
  description: string;
  location: string | null;
  url: string;
}

/** Strips CR/LF and control chars so a single-line ICS property cannot inject new properties. */
function stripIcsControlChars(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\r\n\u0000-\u001f\u007f]+/g, "");
}

function sanitizeIcsUrl(value: string): string | null {
  const cleaned = stripIcsControlChars(value).trim();
  if (!/^https?:\/\//i.test(cleaned)) return null;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Builds a complete `VCALENDAR` document with one `VEVENT`. */
export function buildInvitationIcs(input: InvitationIcsInput): string {
  const endsAt =
    input.endsAt && input.endsAt.getTime() > input.startsAt.getTime()
      ? input.endsAt
      : new Date(input.startsAt.getTime() + DEFAULT_EVENT_DURATION_MS);
  const safeUid = stripIcsControlChars(input.uid);
  const safeUrl = sanitizeIcsUrl(input.url);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Managevent Australia//Digital Invitations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${safeUid}`,
    `DTSTAMP:${formatIcsDate(input.stamp)}`,
    `DTSTART:${formatIcsDate(input.startsAt)}`,
    `DTEND:${formatIcsDate(endsAt)}`,
    `SUMMARY:${escapeIcsText(input.summary)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    ...(input.location ? [`LOCATION:${escapeIcsText(input.location)}`] : []),
    ...(safeUrl ? [`URL:${safeUrl}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
