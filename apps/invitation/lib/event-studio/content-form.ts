/**
 * Form state for the Details editor: the invitation content as editable text, and back.
 *
 * Pure and safe for client components (types only from other packages). The checks mirror
 * `InvitationContentSchema` and `HostEventUpdateSchema`, so each problem is shown beside its
 * field before the save is sent; the API validates again. A unit test holds them in step.
 *
 * Music is not edited in the studio yet. Whatever the invitation already carries is sent back
 * untouched, because a content save is a full replace.
 */
import type { HostEventUpdate, InvitationContent } from "@managevent/validators";
import { isRealDate, isTime } from "./local-date";
import { endLocal } from "./wizard";

export const CONTENT_LIMITS = {
  headline: 160,
  subheadline: 240,
  hosts: 160,
  honoureeName: 120,
  wording: 1200,
  storyParagraph: 1200,
  storyItems: 8,
  scheduleItems: 20,
  scheduleTitle: 120,
  scheduleDescription: 400,
  scheduleLocation: 160,
  venueName: 160,
  venueAddress: 300,
  venueParking: 500,
  dressCode: 200,
  faqItems: 12,
  faqQuestion: 200,
  faqAnswer: 1000,
  galleryItems: 24,
  url: 500,
  eventTitle: 160,
} as const;

export interface TextRow {
  key: string;
  value: string;
}

export interface ScheduleRow {
  /** The stored item id (4 to 24 characters); new rows get a fresh one. */
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
}

export interface FaqRow {
  key: string;
  question: string;
  answer: string;
}

export interface ContentForm {
  headline: string;
  subheadline: string;
  hosts: string;
  honoureeName: string;
  wording: string;
  story: TextRow[];
  schedule: ScheduleRow[];
  venueName: string;
  venueAddress: string;
  venueMapsUrl: string;
  venueParking: string;
  dressCode: string;
  faq: FaqRow[];
  coverImageUrl: string;
  gallery: TextRow[];
}

export interface EventForm {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  timeZone: string;
}

export interface ContentErrorCopy {
  required: string;
  /** "Use {max} characters or fewer." */
  tooLong: string;
  dateRequired: string;
  timeRequired: string;
  endBeforeStart: string;
  url: string;
  urlTooLong: string;
  venueNameRequired: string;
  scheduleTime: string;
  scheduleTitle: string;
  faqQuestion: string;
  faqAnswer: string;
  storyEmpty: string;
}

/** Messages keyed by field path: `headline`, `schedule.<id>.title`, `gallery.<key>` ... */
export type FormErrors = Record<string, string>;

/** A short random id for a list row. Schedule ids must be 4 to 24 characters. */
export function newRowId(prefix = "r"): string {
  let random = "";
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    random = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } else {
    random = Math.random().toString(16).slice(2, 14).padEnd(12, "0");
  }
  return `${prefix}${random}`;
}

/**
 * The invitation content as form text. Row keys are positional (`story-0`, `faq-1`), so the
 * server render and the first client render agree; rows added later get random keys.
 */
export function toContentForm(content: InvitationContent): ContentForm {
  return {
    headline: content.headline,
    subheadline: content.subheadline,
    hosts: content.hosts,
    honoureeName: content.honoureeName ?? "",
    wording: content.wording,
    story: content.story.map((value, index) => ({ key: `story-${index}`, value })),
    schedule: content.schedule.map((item) => ({
      id: item.id,
      time: item.time,
      title: item.title,
      description: item.description ?? "",
      location: item.location ?? "",
    })),
    venueName: content.venue?.name ?? "",
    venueAddress: content.venue?.address ?? "",
    venueMapsUrl: content.venue?.mapsUrl ?? "",
    venueParking: content.venue?.parking ?? "",
    dressCode: content.dressCode ?? "",
    faq: content.faq.map((item, index) => ({
      key: `faq-${index}`,
      question: item.question,
      answer: item.answer,
    })),
    coverImageUrl: content.coverImageUrl ?? "",
    gallery: content.galleryImageUrls.map((value, index) => ({ key: `gallery-${index}`, value })),
  };
}

/** Whether a link would pass `HttpsUrlSchema`, and why not. */
export function checkHttpsUrl(value: string): "ok" | "invalid" | "too-long" {
  if (value.length > CONTENT_LIMITS.url) return "too-long";
  if (!value.startsWith("https://")) return "invalid";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0 ? "ok" : "invalid";
  } catch {
    return "invalid";
  }
}

function fillMax(template: string, max: number): string {
  return template.replace("{max}", String(max));
}

function hasVenueDetail(form: ContentForm): boolean {
  return (
    form.venueAddress.trim().length > 0 ||
    form.venueMapsUrl.trim().length > 0 ||
    form.venueParking.trim().length > 0
  );
}

export function validateContentForm(form: ContentForm, copy: ContentErrorCopy): FormErrors {
  const errors: FormErrors = {};
  const tooLong = (max: number) => fillMax(copy.tooLong, max);
  const checkUrl = (path: string, raw: string) => {
    const value = raw.trim();
    if (value.length === 0) return;
    const result = checkHttpsUrl(value);
    if (result === "invalid") errors[path] = copy.url;
    if (result === "too-long") errors[path] = copy.urlTooLong;
  };

  const headline = form.headline.trim();
  if (headline.length === 0) errors.headline = copy.required;
  else if (headline.length > CONTENT_LIMITS.headline) {
    errors.headline = tooLong(CONTENT_LIMITS.headline);
  }
  if (form.subheadline.trim().length > CONTENT_LIMITS.subheadline) {
    errors.subheadline = tooLong(CONTENT_LIMITS.subheadline);
  }
  const hosts = form.hosts.trim();
  if (hosts.length === 0) errors.hosts = copy.required;
  else if (hosts.length > CONTENT_LIMITS.hosts) errors.hosts = tooLong(CONTENT_LIMITS.hosts);
  if (form.honoureeName.trim().length > CONTENT_LIMITS.honoureeName) {
    errors.honoureeName = tooLong(CONTENT_LIMITS.honoureeName);
  }
  if (form.wording.trim().length > CONTENT_LIMITS.wording) {
    errors.wording = tooLong(CONTENT_LIMITS.wording);
  }

  for (const row of form.story) {
    const value = row.value.trim();
    if (value.length === 0) errors[`story.${row.key}`] = copy.storyEmpty;
    else if (value.length > CONTENT_LIMITS.storyParagraph) {
      errors[`story.${row.key}`] = tooLong(CONTENT_LIMITS.storyParagraph);
    }
  }

  for (const row of form.schedule) {
    if (!isTime(row.time)) errors[`schedule.${row.id}.time`] = copy.scheduleTime;
    const title = row.title.trim();
    if (title.length === 0) errors[`schedule.${row.id}.title`] = copy.scheduleTitle;
    else if (title.length > CONTENT_LIMITS.scheduleTitle) {
      errors[`schedule.${row.id}.title`] = tooLong(CONTENT_LIMITS.scheduleTitle);
    }
    if (row.description.trim().length > CONTENT_LIMITS.scheduleDescription) {
      errors[`schedule.${row.id}.description`] = tooLong(CONTENT_LIMITS.scheduleDescription);
    }
    if (row.location.trim().length > CONTENT_LIMITS.scheduleLocation) {
      errors[`schedule.${row.id}.location`] = tooLong(CONTENT_LIMITS.scheduleLocation);
    }
  }

  const venueName = form.venueName.trim();
  if (venueName.length === 0 && hasVenueDetail(form)) errors.venueName = copy.venueNameRequired;
  else if (venueName.length > CONTENT_LIMITS.venueName) {
    errors.venueName = tooLong(CONTENT_LIMITS.venueName);
  }
  if (form.venueAddress.trim().length > CONTENT_LIMITS.venueAddress) {
    errors.venueAddress = tooLong(CONTENT_LIMITS.venueAddress);
  }
  checkUrl("venueMapsUrl", form.venueMapsUrl);
  if (form.venueParking.trim().length > CONTENT_LIMITS.venueParking) {
    errors.venueParking = tooLong(CONTENT_LIMITS.venueParking);
  }

  if (form.dressCode.trim().length > CONTENT_LIMITS.dressCode) {
    errors.dressCode = tooLong(CONTENT_LIMITS.dressCode);
  }

  for (const row of form.faq) {
    const question = row.question.trim();
    const answer = row.answer.trim();
    if (question.length === 0) errors[`faq.${row.key}.question`] = copy.faqQuestion;
    else if (question.length > CONTENT_LIMITS.faqQuestion) {
      errors[`faq.${row.key}.question`] = tooLong(CONTENT_LIMITS.faqQuestion);
    }
    if (answer.length === 0) errors[`faq.${row.key}.answer`] = copy.faqAnswer;
    else if (answer.length > CONTENT_LIMITS.faqAnswer) {
      errors[`faq.${row.key}.answer`] = tooLong(CONTENT_LIMITS.faqAnswer);
    }
  }

  checkUrl("coverImageUrl", form.coverImageUrl);
  for (const row of form.gallery) {
    if (row.value.trim().length === 0) errors[`gallery.${row.key}`] = copy.url;
    else checkUrl(`gallery.${row.key}`, row.value);
  }

  return errors;
}

/**
 * The content to save: the form, trimmed, laid over the stored content. Fields the studio does
 * not edit (music, the schema version) are carried through unchanged. Call only after
 * `validateContentForm` came back clean.
 */
export function fromContentForm(form: ContentForm, original: InvitationContent): InvitationContent {
  const venueName = form.venueName.trim();
  const mapsUrl = form.venueMapsUrl.trim();
  const parking = form.venueParking.trim();
  const honoureeName = form.honoureeName.trim();
  const dressCode = form.dressCode.trim();
  const coverImageUrl = form.coverImageUrl.trim();

  return {
    version: original.version,
    headline: form.headline.trim(),
    subheadline: form.subheadline.trim(),
    hosts: form.hosts.trim(),
    ...(honoureeName ? { honoureeName } : {}),
    wording: form.wording.trim(),
    story: form.story.map((row) => row.value.trim()).filter((value) => value.length > 0),
    schedule: form.schedule.map((row) => {
      const description = row.description.trim();
      const location = row.location.trim();
      return {
        id: row.id,
        time: row.time,
        title: row.title.trim(),
        ...(description ? { description } : {}),
        ...(location ? { location } : {}),
      };
    }),
    venue: venueName
      ? {
          name: venueName,
          address: form.venueAddress.trim(),
          ...(mapsUrl ? { mapsUrl } : {}),
          ...(parking ? { parking } : {}),
        }
      : null,
    ...(dressCode ? { dressCode } : {}),
    faq: form.faq.map((row) => ({ question: row.question.trim(), answer: row.answer.trim() })),
    coverImageUrl: coverImageUrl || null,
    galleryImageUrls: form.gallery
      .map((row) => row.value.trim())
      .filter((value) => value.length > 0),
    music: original.music,
  };
}

export function validateEventForm(form: EventForm, copy: ContentErrorCopy): FormErrors {
  const errors: FormErrors = {};
  const title = form.title.trim();
  if (title.length === 0) errors["event.title"] = copy.required;
  else if (title.length > CONTENT_LIMITS.eventTitle) {
    errors["event.title"] = fillMax(copy.tooLong, CONTENT_LIMITS.eventTitle);
  }
  if (!isRealDate(form.date)) errors["event.date"] = copy.dateRequired;
  if (!isTime(form.startTime)) errors["event.startTime"] = copy.timeRequired;
  if (form.endTime.length > 0 && (!isTime(form.endTime) || form.endTime === form.startTime)) {
    errors["event.endTime"] = copy.endBeforeStart;
  }
  return errors;
}

/**
 * The `PATCH /v1/events/{id}` body for what changed between two event forms, or null when
 * nothing did. Only changed fields are sent, so an untouched multi-day end is left alone.
 */
export function eventUpdateFrom(form: EventForm, baseline: EventForm): HostEventUpdate | null {
  const update: HostEventUpdate = {};
  if (form.title.trim() !== baseline.title.trim()) update.title = form.title.trim();
  const startChanged = form.date !== baseline.date || form.startTime !== baseline.startTime;
  if (startChanged) update.startsAtLocal = `${form.date}T${form.startTime}`;
  if (startChanged || form.endTime !== baseline.endTime) {
    update.endsAtLocal = form.endTime ? endLocal(form.date, form.startTime, form.endTime) : null;
  }
  if (form.timeZone !== baseline.timeZone) update.timeZone = form.timeZone;
  return Object.keys(update).length > 0 ? update : null;
}

/** Moves the item at `index` one place towards the start (-1) or the end (+1). */
export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  const next = [...items];
  if (target < 0 || target >= next.length) return next;
  const [item] = next.splice(index, 1);
  if (item !== undefined) next.splice(target, 0, item);
  return next;
}
