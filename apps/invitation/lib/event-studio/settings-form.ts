/**
 * Form state and checks for the Settings tab: the reply deadline, the wishing well or tribute
 * book, and the words in the invitation link.
 *
 * Pure and safe for client components (types only from other packages). The checks mirror
 * `WellConfigSchema`, `EventSlugWordsSchema` and the Memorial Mode rules in the API; the API
 * validates again. A unit test holds them in step.
 */
import type { WellConfig } from "@managevent/validators";
import { checkHttpsUrl, type FormErrors } from "./content-form";
import { isRealDate, isTime } from "./local-date";

// ─── Reply deadline ─────────────────────────────────────────────────────────

export type DeadlineResult =
  { ok: true; value: string | null } | { ok: false; error: "incomplete" | "after-event" };

/**
 * Both inputs blank means "no deadline". Otherwise both are needed, and the deadline must fall
 * before the event starts (`startsAtLocal`, same time zone, so plain text comparison is right).
 */
export function readDeadline(date: string, time: string, startsAtLocal: string): DeadlineResult {
  if (date.length === 0 && time.length === 0) return { ok: true, value: null };
  if (!isRealDate(date) || !isTime(time)) return { ok: false, error: "incomplete" };
  const value = `${date}T${time}`;
  if (value >= startsAtLocal) return { ok: false, error: "after-event" };
  return { ok: true, value };
}

// ─── Wishing well and tribute book ──────────────────────────────────────────

export interface WellForm {
  enabled: boolean;
  message: string;
  payId: string;
  bsb: string;
  accountNumber: string;
  accountName: string;
  registryUrl: string;
  donationUrl: string;
  tributePrompt: string;
}

export interface WellErrorCopy {
  bsb: string;
  accountNumber: string;
  url: string;
  /** "Use {max} characters or fewer." */
  tooLong: string;
}

export const WELL_LIMITS = {
  message: 600,
  payId: 120,
  accountName: 120,
  tributePrompt: 300,
} as const;

export function toWellForm(wellMode: string, config: WellConfig): WellForm {
  return {
    enabled: wellMode !== "NONE",
    message: config.message ?? "",
    payId: config.payId ?? "",
    bsb: config.bsb ?? "",
    accountNumber: config.accountNumber ?? "",
    accountName: config.accountName ?? "",
    registryUrl: config.registryUrl ?? "",
    donationUrl: config.donationUrl ?? "",
    tributePrompt: config.tributePrompt ?? "",
  };
}

export function validateWellForm(
  form: WellForm,
  memorial: boolean,
  copy: WellErrorCopy,
): FormErrors {
  const errors: FormErrors = {};
  const tooLong = (max: number) => copy.tooLong.replace("{max}", String(max));
  const checkUrl = (field: "registryUrl" | "donationUrl") => {
    const value = form[field].trim();
    if (value.length > 0 && checkHttpsUrl(value) !== "ok") errors[field] = copy.url;
  };

  if (form.message.trim().length > WELL_LIMITS.message) {
    errors.message = tooLong(WELL_LIMITS.message);
  }
  checkUrl("donationUrl");

  if (memorial) {
    if (form.tributePrompt.trim().length > WELL_LIMITS.tributePrompt) {
      errors.tributePrompt = tooLong(WELL_LIMITS.tributePrompt);
    }
    return errors;
  }

  if (form.payId.trim().length > WELL_LIMITS.payId) errors.payId = tooLong(WELL_LIMITS.payId);
  const bsb = form.bsb.trim();
  if (bsb.length > 0 && !/^\d{3}-?\d{3}$/.test(bsb)) errors.bsb = copy.bsb;
  const accountNumber = form.accountNumber.trim();
  if (accountNumber.length > 0 && !/^\d{4,10}$/.test(accountNumber)) {
    errors.accountNumber = copy.accountNumber;
  }
  if (form.accountName.trim().length > WELL_LIMITS.accountName) {
    errors.accountName = tooLong(WELL_LIMITS.accountName);
  }
  checkUrl("registryUrl");
  return errors;
}

/**
 * The `wellMode` and `wellConfig` to save. A memorial invitation never carries bank or registry
 * details, and a celebration never carries a tribute prompt. Switching the well off keeps the
 * details, so switching it back on does not mean typing them again.
 */
export function fromWellForm(
  form: WellForm,
  memorial: boolean,
): { wellMode: "NONE" | "WISHING_WELL" | "TRIBUTE_BOOK"; wellConfig: WellConfig } {
  const text = (value: string) => value.trim();
  const config: WellConfig = {};
  if (text(form.message)) config.message = text(form.message);
  if (text(form.donationUrl)) config.donationUrl = text(form.donationUrl);
  if (memorial) {
    if (text(form.tributePrompt)) config.tributePrompt = text(form.tributePrompt);
  } else {
    if (text(form.payId)) config.payId = text(form.payId);
    if (text(form.bsb)) config.bsb = text(form.bsb);
    if (text(form.accountNumber)) config.accountNumber = text(form.accountNumber);
    if (text(form.accountName)) config.accountName = text(form.accountName);
    if (text(form.registryUrl)) config.registryUrl = text(form.registryUrl);
  }
  const wellMode = !form.enabled ? "NONE" : memorial ? "TRIBUTE_BOOK" : "WISHING_WELL";
  return { wellMode, wellConfig: config };
}

// ─── Invitation link words ──────────────────────────────────────────────────

/** `anna-and-tom-x7k2` → words `anna-and-tom`, suffix `x7k2`. */
export function splitEventSlug(eventSlug: string): { words: string; suffix: string } {
  const cut = eventSlug.lastIndexOf("-");
  if (cut <= 0) return { words: eventSlug, suffix: "" };
  return { words: eventSlug.slice(0, cut), suffix: eventSlug.slice(cut + 1) };
}

/** Tidies typing into link words: lowercase, spaces and underscores to hyphens. */
export function normaliseSlugWords(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function checkSlugWords(words: string): "ok" | "required" | "invalid" | "too-long" {
  if (words.length === 0) return "required";
  if (words.length > 60) return "too-long";
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(words) ? "ok" : "invalid";
}
