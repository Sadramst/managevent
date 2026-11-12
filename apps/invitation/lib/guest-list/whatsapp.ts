/**
 * WhatsApp deep links (`https://wa.me/...`). No account or API is involved: the link opens
 * WhatsApp on the host's own phone with the message typed in, and the host presses send.
 */

/**
 * An Australian mobile number in the international form WhatsApp wants (digits only, no plus):
 * `0412 345 678` and `+61 412 345 678` both become `61412345678`.
 *
 * Returns null for anything that is not an Australian mobile (landlines cannot receive
 * WhatsApp messages), so the caller falls back to the "choose a contact" link.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const compact = phone.replace(/[\s\-()]/g, "");
  const local = /^0(4\d{8})$/.exec(compact);
  if (local) return `61${local[1]}`;
  const international = /^\+?61(4\d{8})$/.exec(compact);
  if (international) return `61${international[1]}`;
  return null;
}

/**
 * The link that opens WhatsApp with `message` ready to send. With a mobile number it opens the
 * chat with that person; without one WhatsApp asks the host to choose who to send it to.
 */
export function whatsAppUrl(phone: string | null | undefined, message: string): string {
  const number = toWhatsAppNumber(phone);
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

/**
 * True when a value looks like an Australian phone number the API will accept (the same shape
 * as `AuPhoneSchema` in `@managevent/validators`). Used for inline hints only: the API decides.
 */
export function looksLikeAuPhone(value: string): boolean {
  const compact = value.trim().replace(/[\s-]/g, "");
  return /^(\+61[23478]\d{8}|0[23478]\d{8})$/.test(compact);
}
