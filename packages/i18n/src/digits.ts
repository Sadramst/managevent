/**
 * Persian digit conversion, character normalisation (`ی` and `ک`), and RTL/LTR isolate helpers.
 */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/**
 * Converts Latin (`0-9`) and Arabic-Indic (`٠-٩`) digits in a string or number to Persian digits (`۰-۹`).
 * Used for Farsi display copy (counts, dates, step numbers).
 * Do NOT use on prices, phone numbers or copyable codes (`WEBSITE.md` §A4).
 */
export function toPersianDigits(input: string | number): string {
  return String(input)
    .replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number.parseInt(d, 10)] ?? d)
    .replace(/[\u0660-\u0669]/g, (d) => PERSIAN_DIGITS[d.charCodeAt(0) - 0x0660] ?? d);
}

/**
 * Converts Persian (`۰-۹`) and Arabic-Indic (`٠-٩`) digits to Latin digits (`0-9`).
 * Used for prices, phone numbers, PINs, tokens, and numeric form parsing.
 */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Normalises Arabic script variants (`ي` U+064A, `ى` U+0649, `ك` U+0643, `ة` U+0629)
 * into canonical Persian characters (`ی` U+06CC, `ک` U+06A9, `ه` U+0647) per `docs/design/I18N_RTL.md`.
 */
export function normalizePersianText(input: string): string {
  return input
    .replace(/[\u064A\u0649]/g, "\u06CC") // Arabic Yeh / Alef Maksura -> Persian Yeh (ی)
    .replace(/\u0643/g, "\u06A9") // Arabic Kaf -> Persian Kaf (ک)
    .replace(/[\u0660-\u0669]/g, (d) => PERSIAN_DIGITS[d.charCodeAt(0) - 0x0660] ?? d);
}

/**
 * Wraps a Latin string (such as a formatted price `$1,250` or phone number `+61 412 345 678`)
 * in Unicode Left-to-Right Isolate markers (`U+2066 ... U+2069`) so it never scrambles inside RTL Farsi text.
 */
export function isolateLtr(value: string): string {
  return `\u2066${value}\u2069`;
}
