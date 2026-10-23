/**
 * @managevent/i18n
 *
 * Typed EN and FA dictionaries, `t()`, `getDir()`, Persian digit and character helpers,
 * deterministic Gregorian and Jalali date formatters, and `getExperienceMode()`.
 */
import type { EnabledLocale, Locale } from "@managevent/types";
import {
  dictionaries,
  type DictionaryShape,
  enDictionary,
  faDictionary,
  I18N_NAMESPACES,
  type I18nNamespace,
  type TranslationKey,
} from "./dictionaries.js";

export {
  dictionaries,
  type DictionaryShape,
  enDictionary,
  faDictionary,
  I18N_NAMESPACES,
  type I18nNamespace,
  type TranslationKey,
};

export {
  type DateFormatOptions,
  formatCeremonyDate,
  formatGregorianDate,
  formatJalaliDate,
  gregorianToJalali,
  type JalaliDateParts,
  PERTH_UTC_OFFSET_MINUTES,
} from "./dates.js";

export { isolateLtr, normalizePersianText, toLatinDigits, toPersianDigits } from "./digits.js";

export {
  type ExperienceModeInput,
  getExperienceMode,
  MEMORIAL_CEREMONY_SLUGS,
} from "./experience-mode.js";

export const ENABLED_LOCALES: readonly EnabledLocale[] = ["en", "fa"] as const;
export const CONFIGURED_LOCALES: readonly Locale[] = ["en", "fa", "ar", "zh", "hi"] as const;

/**
 * Returns the document text direction (`"ltr"` or `"rtl"`) for a locale.
 */
export function getDir(locale: Locale): "ltr" | "rtl" {
  return locale === "fa" || locale === "ar" ? "rtl" : "ltr";
}

/**
 * Looks up a typed translation key (`"namespace.key"`) for the given locale and interpolates `{param}` placeholders.
 *
 * @param locale - `"en"` or `"fa"`.
 * @param key - Typed translation key, e.g. `"common.planMyCeremony"`.
 * @param params - Optional interpolation parameters.
 */
export function t(
  locale: EnabledLocale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dotIndex = key.indexOf(".");
  const ns = key.slice(0, dotIndex) as I18nNamespace;
  const subKey = key.slice(dotIndex + 1);

  const dict = dictionaries[locale] ?? dictionaries.en;
  const namespaceObj = dict[ns] as Record<string, string>;
  const fallbackObj = dictionaries.en[ns] as Record<string, string>;
  const template = namespaceObj[subKey] ?? fallbackObj[subKey] ?? key;

  if (!params) {
    return template;
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token: string) => {
    const val = params[token];
    return val !== undefined ? String(val) : match;
  });
}
