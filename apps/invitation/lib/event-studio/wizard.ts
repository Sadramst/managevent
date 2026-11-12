/**
 * State, validation and request building for the new-invitation wizard (`/studio/new`).
 *
 * Pure and safe for client components: it imports types only. The checks mirror
 * `HostEventCreateSchema` and `HostPartyCreateSchema` so a host sees a plain message beside the
 * field before anything is sent; the API validates again. A unit test holds the two in step.
 */
import type { HostEventCreateInput, HostPartyCreateInput } from "@managevent/validators";
import { isRealDate, isTime } from "./local-date";

export const WIZARD_STEPS = ["template", "basics", "guests", "review"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

/** How many households the wizard takes. The Guests tab has no such limit. */
export const WIZARD_MAX_HOUSEHOLDS = 12;
export const MAX_PEOPLE_PER_HOUSEHOLD = 20;

export interface WizardBasics {
  title: string;
  hosts: string;
  honoureeName: string;
  date: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  venueName: string;
  venueAddress: string;
}

export interface HouseholdRow {
  /** Stable row key; also the idempotency key of the create request, so a retry is safe. */
  key: string;
  name: string;
  /** Free text: the people in the household, separated by commas or new lines. */
  people: string;
}

export interface WizardErrorCopy {
  titleRequired: string;
  titleTooLong: string;
  hostsRequired: string;
  hostsTooLong: string;
  honoureeTooLong: string;
  dateRequired: string;
  dateInvalid: string;
  datePast: string;
  timeRequired: string;
  endBeforeStart: string;
  venueNameRequired: string;
  venueNameTooLong: string;
  venueAddressTooLong: string;
}

export interface HouseholdErrorCopy {
  nameRequired: string;
  nameTooLong: string;
  personTooLong: string;
  tooManyPeople: string;
}

export type BasicsErrors = Partial<Record<keyof WizardBasics, string>>;
export type HouseholdErrors = Record<string, { name?: string; people?: string }>;

/** The day after a `YYYY-MM-DD` date. */
export function nextDay(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/**
 * The end of an event as a local date-time. An end time earlier than the start is read as the
 * small hours of the next day (a reception that runs past midnight). Null when there is no end
 * time, or when the pieces do not make a date-time.
 */
export function endLocal(date: string, startTime: string, endTime: string): string | null {
  if (!isRealDate(date) || !isTime(startTime) || !isTime(endTime)) return null;
  return `${endTime < startTime ? nextDay(date) : date}T${endTime}`;
}

export function validateBasics(
  basics: WizardBasics,
  options: { today: string },
  copy: WizardErrorCopy,
): BasicsErrors {
  const errors: BasicsErrors = {};
  const title = basics.title.trim();
  if (title.length === 0) errors.title = copy.titleRequired;
  else if (title.length > 160) errors.title = copy.titleTooLong;

  const hosts = basics.hosts.trim();
  if (hosts.length === 0) errors.hosts = copy.hostsRequired;
  else if (hosts.length > 160) errors.hosts = copy.hostsTooLong;

  if (basics.honoureeName.trim().length > 120) errors.honoureeName = copy.honoureeTooLong;

  if (basics.date.length === 0) errors.date = copy.dateRequired;
  else if (!isRealDate(basics.date)) errors.date = copy.dateInvalid;
  else if (basics.date < options.today) errors.date = copy.datePast;

  if (!isTime(basics.startTime)) errors.startTime = copy.timeRequired;
  if (basics.endTime.length > 0) {
    if (!isTime(basics.endTime) || basics.endTime === basics.startTime) {
      errors.endTime = copy.endBeforeStart;
    }
  }

  const venueName = basics.venueName.trim();
  const venueAddress = basics.venueAddress.trim();
  if (venueName.length === 0 && venueAddress.length > 0) {
    errors.venueName = copy.venueNameRequired;
  } else if (venueName.length > 160) {
    errors.venueName = copy.venueNameTooLong;
  }
  if (venueAddress.length > 300) errors.venueAddress = copy.venueAddressTooLong;

  return errors;
}

/** Splits "Linh Nguyen, Tom Nguyen" (commas, semicolons or new lines) into names. */
export function parsePeople(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter((name) => name.length > 0);
}

/** A row the host has not typed anything into. Blank rows are ignored, never sent. */
export function isBlankHousehold(row: HouseholdRow): boolean {
  return row.name.trim().length === 0 && row.people.trim().length === 0;
}

export function validateHouseholds(
  rows: HouseholdRow[],
  copy: HouseholdErrorCopy,
): HouseholdErrors {
  const errors: HouseholdErrors = {};
  for (const row of rows) {
    if (isBlankHousehold(row)) continue;
    const rowErrors: { name?: string; people?: string } = {};
    const name = row.name.trim();
    if (name.length === 0) rowErrors.name = copy.nameRequired;
    else if (name.length > 120) rowErrors.name = copy.nameTooLong;
    const people = parsePeople(row.people);
    if (people.length > MAX_PEOPLE_PER_HOUSEHOLD) rowErrors.people = copy.tooManyPeople;
    else if (people.some((person) => person.length > 120)) rowErrors.people = copy.personTooLong;
    if (rowErrors.name || rowErrors.people) errors[row.key] = rowErrors;
  }
  return errors;
}

/** How many guests a row adds: the people named, or one person when only the name is given. */
export function householdGuestCount(row: HouseholdRow): number {
  if (isBlankHousehold(row)) return 0;
  return Math.max(parsePeople(row.people).length, 1);
}

export function countHouseholds(rows: HouseholdRow[]): { households: number; guests: number } {
  const filled = rows.filter((row) => !isBlankHousehold(row));
  return {
    households: filled.length,
    guests: filled.reduce((total, row) => total + householdGuestCount(row), 0),
  };
}

/** The body of `POST /v1/events`. Call only after `validateBasics` came back clean. */
export function toEventCreateInput(input: {
  ceremonySlug: string;
  templateSlug: string;
  memorial: boolean;
  basics: WizardBasics;
}): HostEventCreateInput {
  const { basics } = input;
  const ends = basics.endTime ? endLocal(basics.date, basics.startTime, basics.endTime) : null;
  const venueName = basics.venueName.trim();
  const honoureeName = basics.honoureeName.trim();
  return {
    title: basics.title.trim(),
    ceremonySlug: input.ceremonySlug as HostEventCreateInput["ceremonySlug"],
    templateSlug: input.templateSlug as HostEventCreateInput["templateSlug"],
    startsAtLocal: `${basics.date}T${basics.startTime}`,
    ...(ends ? { endsAtLocal: ends } : {}),
    timeZone: basics.timeZone,
    hosts: basics.hosts.trim(),
    ...(input.memorial && honoureeName ? { honoureeName } : {}),
    ...(venueName ? { venue: { name: venueName, address: basics.venueAddress.trim() } } : {}),
  };
}

export interface FirstParty {
  idempotencyKey: string;
  input: HostPartyCreateInput;
}

/** One `POST /v1/events/{id}/parties` body per filled row. */
export function toFirstParties(rows: HouseholdRow[]): FirstParty[] {
  return rows
    .filter((row) => !isBlankHousehold(row))
    .map((row) => ({
      idempotencyKey: row.key,
      input: {
        displayName: row.name.trim(),
        guests: parsePeople(row.people).map((name) => ({ name })),
      },
    }));
}

/** A random key for a list row. `crypto.randomUUID` needs a secure context, so it has a fallback. */
export function rowKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const part = () => Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${part()}-${part()}-${Date.now().toString(36)}`;
}
