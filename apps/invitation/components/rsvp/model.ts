/**
 * The reply form's state and rules, with no React and no network: what the form starts with,
 * what must be answered, and the body sent to the API.
 *
 * The form is drawn from the host's `rsvpConfig`. Anything the host did not ask for is neither
 * shown nor sent (the API would drop it anyway: `apps/api/src/modules/guest-site/minimise.ts`).
 * Health values are never sent back by the API, so a guest with details on file either keeps
 * them (no `health` in the body) or replaces them.
 */
import type {
  GuestPartyView,
  GuestRsvpHealth,
  GuestRsvpSubmitInput,
  GuestRsvpView,
  RsvpConfig,
} from "@managevent/validators";

export type AttendChoice = "YES" | "NO" | "MAYBE";
export type DietaryTag = GuestRsvpHealth["dietary"][number];
export type AllergySeverity = NonNullable<GuestRsvpHealth["allergySeverity"]>;

/** The order the tags are offered in. `NONE` is exclusive and comes last. */
export const DIETARY_TAGS: readonly DietaryTag[] = [
  "VEGETARIAN",
  "VEGAN",
  "HALAL",
  "KOSHER",
  "GLUTEN_FREE",
  "DAIRY_FREE",
  "NUT_ALLERGY",
  "SHELLFISH_ALLERGY",
  "OTHER_ALLERGY",
  "NONE",
];

export const ALLERGY_SEVERITIES: readonly AllergySeverity[] = [
  "MILD",
  "MODERATE",
  "SEVERE_ANAPHYLAXIS",
];

const ALLERGY_TAGS: ReadonlySet<DietaryTag> = new Set([
  "NUT_ALLERGY",
  "SHELLFISH_ALLERGY",
  "OTHER_ALLERGY",
]);

export const MAX_SONGS = 3;
export const MAX_SONG_LENGTH = 160;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_NOTES_LENGTH = 500;
export const MAX_NAME_LENGTH = 120;
const MAX_PLUS_ONES = 10;

export interface HealthDraft {
  dietary: DietaryTag[];
  allergySeverity: AllergySeverity | "";
  allergyNotes: string;
  accessibilityNotes: string;
}

export interface MemberDraft {
  guestId: string;
  name: string;
  isChild: boolean;
  isPlusOne: boolean;
  status: AttendChoice | null;
  /** Details are stored for this guest. The values are never sent to the browser. */
  healthOnFile: boolean;
  /** False while a guest with details on file is keeping them. */
  editHealth: boolean;
  health: HealthDraft;
}

export interface PlusOneDraft {
  /** Stable key for React and for error ids; never sent. */
  key: string;
  name: string;
  isChild: boolean;
  health: HealthDraft;
}

export interface RsvpDraft {
  members: MemberDraft[];
  plusOnes: PlusOneDraft[];
  songs: string[];
  message: string;
  email: string;
  phone: string;
  contactConsent: boolean;
  healthConsent: boolean;
}

/** What this invitation asks for and allows. */
export interface RsvpRules {
  allowMaybe: boolean;
  askDietary: boolean;
  askAccessibility: boolean;
  askSongs: boolean;
  askMessage: boolean;
  askContact: boolean;
  /** How many more people this party may add (0 when plus-ones are off). */
  plusOneLimit: number;
  childrenAllowed: boolean;
}

export function rulesFor(
  config: RsvpConfig,
  party: GuestPartyView,
  rsvp: GuestRsvpView,
): RsvpRules {
  return {
    allowMaybe: config.allowMaybe,
    askDietary: config.askDietary,
    askAccessibility: config.askAccessibility,
    askSongs: config.songPrompt !== "HIDDEN",
    askMessage: config.askMessage,
    askContact: config.askContact,
    plusOneLimit: party.allowPlusOnes
      ? Math.min(Math.max(rsvp.seatsRemaining, 0), MAX_PLUS_ONES)
      : 0,
    childrenAllowed: party.childrenAllowed,
  };
}

export function emptyHealth(): HealthDraft {
  return { dietary: [], allergySeverity: "", allergyNotes: "", accessibilityNotes: "" };
}

/** The form as it opens: earlier answers filled in, health fields blank. */
export function initialDraft(
  party: GuestPartyView,
  rsvp: GuestRsvpView,
  rules: RsvpRules,
): RsvpDraft {
  return {
    members: party.members.map((member) => ({
      guestId: member.guestId,
      name: member.name,
      isChild: member.isChild,
      isPlusOne: member.isPlusOne,
      status:
        member.status === "YES" || member.status === "NO"
          ? member.status
          : member.status === "MAYBE" && rules.allowMaybe
            ? "MAYBE"
            : null,
      healthOnFile: member.healthOnFile,
      editHealth: !member.healthOnFile,
      health: emptyHealth(),
    })),
    plusOnes: [],
    songs: rsvp.songRequests.length > 0 ? rsvp.songRequests.slice(0, MAX_SONGS) : [""],
    message: rsvp.messageToHost ?? "",
    email: "",
    phone: "",
    contactConsent: false,
    healthConsent: false,
  };
}

export function hasAllergyTag(health: HealthDraft): boolean {
  return health.dietary.some((tag) => ALLERGY_TAGS.has(tag));
}

/** Ticks or unticks a tag. "No dietary needs" clears the others, and any other tag clears it. */
export function toggleDietaryTag(health: HealthDraft, tag: DietaryTag): HealthDraft {
  const has = health.dietary.includes(tag);
  let dietary: DietaryTag[];
  if (has) dietary = health.dietary.filter((item) => item !== tag);
  else if (tag === "NONE") dietary = ["NONE"];
  else dietary = [...health.dietary.filter((item) => item !== "NONE"), tag];
  const next = { ...health, dietary };
  // Allergy fields only exist beside an allergy tag.
  return hasAllergyTag(next) ? next : { ...next, allergySeverity: "", allergyNotes: "" };
}

/** The health block for the API, limited to what the host asks for. */
function toHealth(health: HealthDraft, rules: RsvpRules): GuestRsvpHealth | undefined {
  if (!rules.askDietary && !rules.askAccessibility) return undefined;
  const allergy = rules.askDietary && hasAllergyTag(health);
  const allergyNotes = allergy ? health.allergyNotes.trim() : "";
  const accessibilityNotes = rules.askAccessibility ? health.accessibilityNotes.trim() : "";
  return {
    dietary: rules.askDietary ? health.dietary : [],
    ...(allergy && health.allergySeverity ? { allergySeverity: health.allergySeverity } : {}),
    ...(allergyNotes ? { allergyNotes } : {}),
    ...(accessibilityNotes ? { accessibilityNotes } : {}),
  };
}

/** Mirrors `hasHealthInformation` in `@managevent/validators` without bundling the schemas. */
function isHealthInformation(health: GuestRsvpHealth | undefined): boolean {
  if (!health) return false;
  return (
    health.dietary.some((tag) => tag !== "NONE") ||
    Boolean(health.allergyNotes) ||
    Boolean(health.allergySeverity) ||
    Boolean(health.accessibilityNotes)
  );
}

function isBlank(health: GuestRsvpHealth): boolean {
  return health.dietary.length === 0 && !isHealthInformation(health);
}

/** True when the guest could be asked for food or access details at all. */
export function asksHealth(rules: RsvpRules): boolean {
  return rules.askDietary || rules.askAccessibility;
}

/** True when this member's food and access questions should be on screen. */
export function showsHealth(member: MemberDraft, rules: RsvpRules): boolean {
  return asksHealth(rules) && (member.status === "YES" || member.status === "MAYBE");
}

/**
 * What to send for one member: nothing when they are not coming, nothing when they keep what is
 * on file, nothing when a new guest left every field blank; otherwise the block that replaces
 * what is stored.
 */
function memberHealth(member: MemberDraft, rules: RsvpRules): GuestRsvpHealth | undefined {
  if (!showsHealth(member, rules)) return undefined;
  if (member.healthOnFile && !member.editHealth) return undefined;
  const health = toHealth(member.health, rules);
  if (!health) return undefined;
  if (!member.healthOnFile && isBlank(health)) return undefined;
  return health;
}

function plusOneHealth(plusOne: PlusOneDraft, rules: RsvpRules): GuestRsvpHealth | undefined {
  const health = toHealth(plusOne.health, rules);
  return health && !isBlank(health) ? health : undefined;
}

/** True when the reply as it stands carries health information, so consent is required. */
export function carriesHealth(draft: RsvpDraft, rules: RsvpRules): boolean {
  return (
    draft.members.some((member) => isHealthInformation(memberHealth(member, rules))) ||
    draft.plusOnes.some((plusOne) => isHealthInformation(plusOneHealth(plusOne, rules)))
  );
}

export function hasContact(draft: RsvpDraft, rules: RsvpRules): boolean {
  return rules.askContact && (draft.email.trim().length > 0 || draft.phone.trim().length > 0);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function looksLikeEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

/** The same shape `AuPhoneSchema` accepts: an Australian mobile or landline number. */
export function looksLikeAuPhone(value: string): boolean {
  const compact = value.trim().replace(/[\s-]/g, "");
  return /^(\+61[23478]\d{8}|0[23478]\d{8})$/.test(compact);
}

export interface RsvpMessages {
  /** `{name}` is filled with the guest's name. */
  statusRequired: string;
  plusOneName: string;
  severityRequired: string;
  emailInvalid: string;
  phoneInvalid: string;
  contactConsent: string;
  healthConsent: string;
}

/** The id of the control an error belongs to, and the message to show beside it. */
export interface RsvpFieldError {
  field: string;
  message: string;
}

export const fieldId = {
  memberStatus: (guestId: string) => `rsvp-${guestId}-status`,
  memberSeverity: (guestId: string) => `rsvp-${guestId}-severity`,
  plusOneName: (key: string) => `rsvp-${key}-name`,
  plusOneSeverity: (key: string) => `rsvp-${key}-severity`,
  email: "rsvp-email",
  phone: "rsvp-phone",
  contactConsent: "rsvp-contact-consent",
  healthConsent: "rsvp-health-consent",
} as const;

/** Every problem with the reply, in the order the fields appear on the page. */
export function validateDraft(
  draft: RsvpDraft,
  rules: RsvpRules,
  messages: RsvpMessages,
): RsvpFieldError[] {
  const errors: RsvpFieldError[] = [];

  for (const member of draft.members) {
    if (!member.status) {
      errors.push({
        field: fieldId.memberStatus(member.guestId),
        message: messages.statusRequired.replace("{name}", member.name),
      });
      continue;
    }
    const editing = showsHealth(member, rules) && member.editHealth && rules.askDietary;
    if (editing && hasAllergyTag(member.health) && !member.health.allergySeverity) {
      errors.push({
        field: fieldId.memberSeverity(member.guestId),
        message: messages.severityRequired,
      });
    }
  }

  for (const plusOne of draft.plusOnes) {
    if (plusOne.name.trim().length === 0) {
      errors.push({ field: fieldId.plusOneName(plusOne.key), message: messages.plusOneName });
    }
    if (rules.askDietary && hasAllergyTag(plusOne.health) && !plusOne.health.allergySeverity) {
      errors.push({
        field: fieldId.plusOneSeverity(plusOne.key),
        message: messages.severityRequired,
      });
    }
  }

  if (rules.askContact) {
    const email = draft.email.trim();
    const phone = draft.phone.trim();
    if (email && !looksLikeEmail(email)) {
      errors.push({ field: fieldId.email, message: messages.emailInvalid });
    }
    if (phone && !looksLikeAuPhone(phone)) {
      errors.push({ field: fieldId.phone, message: messages.phoneInvalid });
    }
    if ((email || phone) && !draft.contactConsent) {
      errors.push({ field: fieldId.contactConsent, message: messages.contactConsent });
    }
  }

  if (carriesHealth(draft, rules) && !draft.healthConsent) {
    errors.push({ field: fieldId.healthConsent, message: messages.healthConsent });
  }

  return errors;
}

/**
 * The request body. Call it only for a draft that `validateDraft` accepts.
 * `consentText` is the wording shown beside the health consent box, stored with the reply.
 */
export function buildSubmission(
  draft: RsvpDraft,
  rules: RsvpRules,
  consentText: string,
): GuestRsvpSubmitInput {
  const members = draft.members.flatMap((member) => {
    if (!member.status) return [];
    const health = memberHealth(member, rules);
    return [{ guestId: member.guestId, status: member.status, ...(health ? { health } : {}) }];
  });

  const plusOnes = draft.plusOnes.slice(0, rules.plusOneLimit).map((plusOne) => {
    const health = plusOneHealth(plusOne, rules);
    return {
      name: plusOne.name.trim().slice(0, MAX_NAME_LENGTH),
      isChild: rules.childrenAllowed && plusOne.isChild,
      ...(health ? { health } : {}),
    };
  });

  const songRequests = rules.askSongs
    ? draft.songs
        .map((song) => song.trim().slice(0, MAX_SONG_LENGTH))
        .filter((song) => song.length > 0)
        .slice(0, MAX_SONGS)
    : [];

  const email = draft.email.trim();
  const phone = draft.phone.trim();
  const contact =
    hasContact(draft, rules) && draft.contactConsent
      ? {
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          consentGranted: true as const,
        }
      : undefined;

  return {
    members,
    plusOnes,
    songRequests,
    ...(rules.askMessage
      ? { messageToHost: draft.message.trim().slice(0, MAX_MESSAGE_LENGTH) }
      : {}),
    ...(contact ? { contact } : {}),
    ...(carriesHealth(draft, rules) && draft.healthConsent
      ? { healthConsent: { granted: true as const, textShown: consentText } }
      : {}),
    locale: "en",
  };
}

/** Which confirmation to show: someone is coming, someone is unsure, or nobody can make it. */
export function replyOutcome(members: readonly { status: string }[]): AttendChoice {
  if (members.some((member) => member.status === "YES")) return "YES";
  if (members.some((member) => member.status === "MAYBE")) return "MAYBE";
  return "NO";
}

/**
 * An `Idempotency-Key` for one submission. `crypto.randomUUID` is missing on plain http and in
 * some in-app browsers, so there is a fallback.
 */
export function newIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function")
    cryptoApi.getRandomValues(bytes);
  else bytes.forEach((_, index) => (bytes[index] = Math.floor(Math.random() * 256)));
  return `rsvp-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** The messages `failureFor` chooses between (`rsvp.errors` in the guest copy). */
export interface RsvpFailureMessages {
  generic: string;
  closed: string;
  revoked: string;
  conflict: string;
  changed: string;
  plusOnesChanged: string;
}

/**
 * What to tell a guest whose reply the API refused, and whether a reload is the way forward.
 *
 * The form checks everything it can before sending, so a `VALIDATION_ERROR` (or `NOT_FOUND`)
 * from the API means the invitation itself changed while the page was open: a person was
 * removed from the party, "not sure yet" was switched off, or the seats were reduced. No field
 * on the page is wrong, so the shared "check the highlighted fields" message would point at
 * nothing: the guest is told the invitation changed and offered a reload instead.
 */
export function failureFor(
  code: string,
  fieldErrors: Readonly<Record<string, readonly string[]>> | undefined,
  message: string,
  messages: RsvpFailureMessages,
): { message: string; reload: boolean } {
  switch (code) {
    case "RSVP_CLOSED":
      return { message: messages.closed, reload: false };
    case "LINK_REVOKED":
      return { message: messages.revoked, reload: false };
    case "CONFLICT":
      return { message: messages.conflict, reload: false };
    case "VALIDATION_ERROR":
    case "NOT_FOUND": {
      const aboutPlusOnes =
        (fieldErrors?.plusOnes?.length ?? 0) > 0 && (fieldErrors?.members?.length ?? 0) === 0;
      return {
        message: aboutPlusOnes ? messages.plusOnesChanged : messages.changed,
        reload: true,
      };
    }
    case "UNKNOWN":
    case "NETWORK_ERROR":
    case "INTERNAL_ERROR":
      return { message: messages.generic, reload: false };
    default:
      return { message, reload: false };
  }
}
