/**
 * Fills `{placeholders}` in a copy string. The same behaviour as `fillCopy` in
 * `@managevent/i18n`, kept here so client components can use it without pulling the i18n
 * package (and its dictionaries) into the browser bundle.
 */
export function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token: string) => {
    const value = params[token];
    return value !== undefined ? String(value) : match;
  });
}

/** Picks the singular or plural template by count, then fills `{count}`. */
export function fillCount(
  count: number,
  one: string,
  many: string,
  params: Record<string, string | number> = {},
): string {
  return fill(count === 1 ? one : many, { ...params, count });
}
