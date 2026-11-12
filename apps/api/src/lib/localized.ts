/**
 * Localised text is stored as `{ en: string }` JSON (`Event.title`, `Party.displayName`,
 * `Guest.name`). DTOs expose a plain string.
 */
export const toLocalized = (s: string) => ({ en: s });

export const fromLocalized = (j: unknown): string => {
  if (typeof j === "string") return j;
  if (typeof j !== "object" || j === null || Array.isArray(j)) return "";
  const record = j as Record<string, unknown>;
  if (typeof record.en === "string") return record.en;
  for (const value of Object.values(record)) {
    if (typeof value === "string") return value;
  }
  return "";
};
