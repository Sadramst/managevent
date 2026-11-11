/** Escapes RFC 5545 TEXT values: backslash first, then newlines, then separators. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[,;]/g, "\\$&");
}

/** UTC basic format (YYYYMMDDTHHMMSSZ): the correct instant for any event time zone. */
export function formatIcsDate(isoString: string): string {
  return new Date(isoString)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}
