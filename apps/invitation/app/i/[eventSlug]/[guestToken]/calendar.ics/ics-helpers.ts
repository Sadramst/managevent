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

/**
 * Folds a single content line per RFC 5545 §3.1.
 * Lines longer than 75 octets are split with CRLF followed by a single space.
 */
export function foldIcsLine(line: string, maxOctets = 75): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= maxOctets) {
    return line;
  }

  const parts: string[] = [];
  let remaining = line;
  let isFirst = true;

  while (remaining.length > 0) {
    const limit = isFirst ? maxOctets : maxOctets - 1;
    let sliceLen = remaining.length;
    while (sliceLen > 0 && encoder.encode(remaining.slice(0, sliceLen)).length > limit) {
      sliceLen--;
    }
    if (sliceLen === 0) {
      sliceLen = 1;
    }
    const chunk = remaining.slice(0, sliceLen);
    parts.push(isFirst ? chunk : ` ${chunk}`);
    remaining = remaining.slice(sliceLen);
    isFirst = false;
  }

  return parts.join("\r\n");
}
