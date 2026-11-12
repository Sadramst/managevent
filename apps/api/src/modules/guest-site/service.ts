/**
 * Guest micro-site service: link resolution, the guest-safe view, the RSVP transaction, passes,
 * the calendar file, wishes, the public demo list and legacy link resolution.
 *
 * The guest link is the credential. It is matched exactly against the stored token; an unknown
 * link is a neutral 404, a revoked one is 410, and an unpublished invitation is only visible to a
 * signed-in host of that event (as a read-only preview).
 */
import { createHmac } from "node:crypto";
import { type AuthActor, AuthorizationError, requirePermission } from "@managevent/auth";
import { encryptRsvpWriteData, generateId } from "@managevent/db";
import { getInvitationPlan, type InvitationPlanEntitlements } from "@managevent/payments";
import {
  type DemoInvitation,
  DemoInvitationSchema,
  type DemoList,
  type GuestCalendar,
  type GuestInvitationView,
  GuestInvitationViewSchema,
  type GuestPassesView,
  GuestPassesViewSchema,
  type GuestRsvpHealth,
  type GuestRsvpResult,
  GuestRsvpResultSchema,
  type GuestRsvpSubmit,
  GuestTokenSchema,
  type GuestWishResult,
  type GuestWishSubmit,
  hasHealthInformation,
  INVITATION_TEMPLATES,
  type LegacyResolveResult,
  LegacyResolveResultSchema,
  SafeEventSlugSchema,
} from "@managevent/validators";
import { guestActor, requireEventAccess } from "../../lib/access.js";
import type { ApiDeps, DbTx } from "../../lib/deps.js";
import { getPublicAppUrl } from "../../lib/env.js";
import { ApiProblem, isUniqueViolation, notFound } from "../../lib/errors.js";
import { generateStableId, getGuestTokenPepper } from "../../lib/guest-tokens.js";
import { fromLocalized, toLocalized } from "../../lib/localized.js";
import { utcToZonedWallTime } from "../../lib/time.js";
import { passesEnabled, syncPassesForParty } from "../checkin/pass.js";
import { enqueueHeadcountChanged, recordHeadcountSnapshot } from "../headcount/service.js";
import { buildInvitationIcs } from "./ics.js";
import { minimiseRsvpSubmission } from "./minimise.js";
import {
  countPartyWishes,
  findLatestHeadcountId,
  findLegacyLink,
  findPartyById,
  findPartyByToken,
  findRsvpSubmission,
  findWishByIdempotencyKey,
  listDemoInvitations,
  listWallWishes,
  lockParty,
  type PartyLinkRow,
  recordRsvpSubmission,
} from "./repo.js";
import {
  computeRsvpState,
  findPrimaryGuest,
  isRsvpClosed,
  readInvitationContent,
  readPresentation,
  readRsvpConfig,
  toAccessEvent,
  toGuestInvitationView,
  toGuestPasses,
  toPartyView,
  toRsvpView,
} from "./view.js";

/** Most entries one party may leave in a wishing well or tribute book. */
export const MAX_WISHES_PER_PARTY = 20;

/**
 * Stored on the `EVENT_UPDATES` ConsentRecord. The RSVP contract carries a `consentGranted: true`
 * flag for contact details but not the wording, so the record states what was agreed to.
 */
const CONTACT_CONSENT_RECORD_TEXT =
  "Guest agreed to be contacted with updates about this event (RSVP contact details consent).";

export interface GuestLink {
  party: PartyLinkRow;
  /** True when a host is looking at an unpublished invitation. */
  preview: boolean;
  /** True for sample invitations: every write is refused. */
  demo: boolean;
  plan: InvitationPlanEntitlements;
}

const linkRevoked = () =>
  new ApiProblem(410, "LINK_REVOKED", "This invitation link is no longer active");
const demoReadOnly = () =>
  new ApiProblem(403, "DEMO_READ_ONLY", "This is a sample invitation; responses are not saved");
const previewReadOnly = () =>
  new ApiProblem(403, "PREVIEW_READ_ONLY", "Publish the invitation before responding to it");

function validationProblem(field: string, message: string): ApiProblem {
  return new ApiProblem(400, "VALIDATION_ERROR", "Request validation failed", {
    formErrors: [],
    fieldErrors: { [field]: [message] },
  });
}

/** The encrypted columns for a health block. Plain values never reach the database. */
function healthWriteData(health: GuestRsvpHealth) {
  const encrypted = encryptRsvpWriteData({
    dietary: health.dietary,
    allergyNotes: health.allergyNotes?.trim() || null,
    allergySeverity: health.allergySeverity ?? null,
    accessibilityNotes: health.accessibilityNotes?.trim() || null,
  });
  return {
    dietaryEncrypted: encrypted.dietaryEncrypted ?? null,
    allergyNotes: encrypted.allergyNotes,
    allergySeverityEncrypted: encrypted.allergySeverityEncrypted ?? null,
    accessibilityNotes: encrypted.accessibilityNotes,
  };
}

/**
 * Written for a guest who is not coming: no catering or access arrangements are needed, so
 * whatever an earlier "yes" left on file is removed (not kept as ciphertext).
 */
const CLEARED_HEALTH_COLUMNS = {
  dietaryEncrypted: null,
  allergyNotes: null,
  allergySeverityEncrypted: null,
  accessibilityNotes: null,
} as const;

/** JSON with object keys in a fixed order, so equal requests always serialise the same way. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * Identifies an RSVP request body without storing it. Keyed with the server-side pepper, because
 * the body holds health answers and a plain hash of a small answer set could be guessed back.
 */
export function hashRsvpSubmission(body: GuestRsvpSubmit): string {
  return createHmac("sha256", getGuestTokenPepper())
    .update(`rsvp-submission-v1:${canonicalJson(body)}`)
    .digest("hex");
}

/** Candidate `LegacySlug.legacyPath` values for a requested path (`/anniversary/<slug>`, ...). */
export function legacyPathCandidates(rawPath: string): string[] {
  let path = rawPath.trim();
  const cut = path.search(/[?#]/);
  if (cut !== -1) path = path.slice(0, cut);
  if (/[\u0000-\u001f\\]/.test(path) || path.includes("..")) return [];
  path = `/${path}`.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  if (path.length < 2) return [];
  const candidates = new Set<string>([path, path.toLowerCase()]);
  // The invitation app serves imported links under `/legacy/...`; rows store the original path.
  if (path.toLowerCase().startsWith("/legacy/")) {
    const stripped = path.slice("/legacy".length);
    candidates.add(stripped);
    candidates.add(stripped.toLowerCase());
  }
  return [...candidates];
}

export class GuestSiteService {
  constructor(private readonly deps: ApiDeps) {}

  /**
   * Resolves `{eventSlug}/{guestToken}` to its party.
   *
   * - malformed slug or token, or no exact match → 404
   * - unpublished invitation → 404, unless the session actor may read the event (preview)
   * - matched through a superseded token, a revoked link or a removed party → 410 `LINK_REVOKED`
   */
  async resolveLink(
    actor: AuthActor | null,
    rawEventSlug: string,
    rawGuestToken: string,
  ): Promise<GuestLink> {
    const eventSlug = rawEventSlug.trim().toLowerCase();
    const token = rawGuestToken.trim().toLowerCase();
    if (
      !SafeEventSlugSchema.safeParse(eventSlug).success ||
      !GuestTokenSchema.safeParse(token).success
    ) {
      throw notFound();
    }

    const party = await findPartyByToken(this.deps.db, eventSlug, token);
    if (!party) throw notFound();

    const invitation = party.invitation;
    let preview = false;
    if (invitation.publishedAt === null) {
      // A draft does not exist for the public, whatever the state of the link.
      if (!actor?.userId) throw notFound();
      try {
        await requireEventAccess(this.deps, actor, invitation.eventId, "event:read");
      } catch (err) {
        if (err instanceof ApiProblem || err instanceof AuthorizationError) throw notFound();
        throw err;
      }
      preview = true;
    }

    if (party.token !== token || party.tokenRevokedAt !== null || party.deletedAt !== null) {
      throw linkRevoked();
    }

    return {
      party,
      preview,
      demo: invitation.isDemo,
      plan: getInvitationPlan(invitation.plan, invitation.event.experienceMode),
    };
  }

  /** `GET .../status`: the link is live. Used by the web app before it renders anything. */
  async getStatus(actor: AuthActor | null, eventSlug: string, guestToken: string) {
    await this.resolveLink(actor, eventSlug, guestToken);
    return { state: "ACTIVE" as const };
  }

  async getView(
    actor: AuthActor | null,
    eventSlug: string,
    guestToken: string,
  ): Promise<GuestInvitationView> {
    const link = await this.resolveLink(actor, eventSlug, guestToken);
    const wishes = await listWallWishes(this.deps.db, link.party.invitationId);
    // Parsing strips anything the schema does not name, so a mapper mistake cannot leak a field.
    return GuestInvitationViewSchema.parse(
      toGuestInvitationView({
        party: link.party,
        plan: link.plan,
        preview: link.preview,
        demo: link.demo,
        wishes,
        now: this.deps.now(),
      }),
    );
  }

  /**
   * The RSVP transaction (contract section C). A repeat of a request (same `Idempotency-Key`,
   * same body) returns the current state without writing anything, however many other
   * submissions the party has made in between. The same key with a different body is refused
   * with `409 CONFLICT`: it is never silently dropped and never applied over newer answers.
   */
  async submitRsvp(input: {
    actor: AuthActor | null;
    eventSlug: string;
    guestToken: string;
    body: GuestRsvpSubmit;
    idempotencyKey: string;
    ip: string | null;
  }): Promise<GuestRsvpResult> {
    const link = await this.resolveLink(input.actor, input.eventSlug, input.guestToken);
    if (link.demo) throw demoReadOnly();
    if (link.preview) throw previewReadOnly();

    const partyId = link.party.id;
    requirePermission(guestActor(partyId), "rsvp:submit", { partyId });

    const eventId = link.party.invitation.eventId;
    const now = this.deps.now();

    const outcome = await this.deps.db.$transaction(
      (tx) =>
        this.writeRsvp(tx, {
          partyId,
          body: input.body,
          key: input.idempotencyKey,
          now,
          ip: input.ip,
        }),
      { maxWait: 10_000, timeout: 20_000 },
    );

    // After the commit. A lost enqueue is healed by the next replay or the next change.
    await enqueueHeadcountChanged(this.deps.queue, eventId, outcome.headcountId);

    const party = await findPartyById(this.deps.db, partyId);
    if (!party) throw notFound();
    const state = computeRsvpState({
      demo: false,
      preview: false,
      rsvpDeadline: party.invitation.rsvpDeadline,
      startsAt: party.invitation.event.startsAt,
      now: this.deps.now(),
    });
    return GuestRsvpResultSchema.parse({
      replayed: outcome.replayed,
      party: toPartyView(party),
      rsvp: toRsvpView(party, state),
      headcountSnapshotId: outcome.headcountId,
      passes: passesEnabled({ invitation: party.invitation, event: party.invitation.event })
        ? toGuestPasses(party)
        : [],
    });
  }

  private async writeRsvp(
    tx: DbTx,
    input: { partyId: string; body: GuestRsvpSubmit; key: string; now: Date; ip: string | null },
  ): Promise<{ replayed: boolean; headcountId: string }> {
    const { partyId, key, now } = input;

    await lockParty(tx, partyId);
    const party = await findPartyById(tx, partyId);
    if (!party) throw notFound();
    if (party.deletedAt !== null || party.tokenRevokedAt !== null) throw linkRevoked();

    const invitation = party.invitation;
    const event = invitation.event;

    // Idempotent replay, decided from the append-only submission ledger under the party lock.
    // (The key on the Rsvp rows is no use for this: every later submission overwrites it.)
    const bodyHash = hashRsvpSubmission(input.body);
    const earlier = await findRsvpSubmission(tx, partyId, key);
    if (earlier) {
      if (earlier.bodyHash !== bodyHash) {
        throw new ApiProblem(
          409,
          "CONFLICT",
          "This Idempotency-Key was already used for a different response",
        );
      }
      const headcountId =
        earlier.headcountId ??
        (await findLatestHeadcountId(tx, event.id)) ??
        (await recordHeadcountSnapshot(tx, event.id, "RSVP")).id;
      return { replayed: true, headcountId };
    }

    if (isRsvpClosed({ rsvpDeadline: invitation.rsvpDeadline, startsAt: event.startsAt, now })) {
      throw new ApiProblem(409, "RSVP_CLOSED", "RSVPs for this event are closed");
    }

    // ── Validation against the party ─────────────────────────────────────────
    const config = readRsvpConfig(invitation.rsvpConfigJson, event.experienceMode);
    // From here on only what the host's RSVP settings ask for exists (see `minimise.ts`).
    const body = minimiseRsvpSubmission(input.body, config);
    const guestIds = new Set(party.guests.map((guest) => guest.id));
    for (const member of body.members) {
      if (!guestIds.has(member.guestId)) {
        throw validationProblem("members", "Every guest must belong to this invitation");
      }
      if (member.status === "MAYBE" && !config.allowMaybe) {
        throw validationProblem("members", "This invitation does not accept a maybe");
      }
    }
    if (body.plusOnes.length > 0) {
      if (!party.allowPlusOnes) {
        throw validationProblem("plusOnes", "This invitation does not allow additional guests");
      }
      if (party.guests.length + body.plusOnes.length > party.maxSeats) {
        throw validationProblem("plusOnes", "There are not enough seats for the additional guests");
      }
      if (!party.childrenAllowed && body.plusOnes.some((plusOne) => plusOne.isChild)) {
        throw validationProblem("plusOnes", "This invitation does not include children");
      }
    }

    // ── Plus-ones ────────────────────────────────────────────────────────────
    // DECISION-NEEDED: the contract (section C, "Guest cap") applies the plan's guest limit to
    // host adds and imports only, never to guest-added plus-ones, so on FREE the event total is
    // bounded only by each party's `maxSeats`. Whether plus-ones should count against an
    // event-level ceiling on FREE is a product and contract decision; it is left as specified.
    const healthByGuest = new Map<string, GuestRsvpHealth>();
    const responses: Array<{
      guestId: string;
      status: "YES" | "NO" | "MAYBE";
      health: GuestRsvpHealth | undefined;
    }> = body.members.map((member) => ({
      guestId: member.guestId,
      status: member.status,
      health: member.health,
    }));

    for (const plusOne of body.plusOnes) {
      const guestId = generateId("gst_");
      await tx.guest.create({
        data: {
          id: guestId,
          partyId,
          stableId: generateStableId(),
          name: toLocalized(plusOne.name),
          isChild: plusOne.isChild,
          isPlusOne: true,
        },
      });
      responses.push({ guestId, status: "YES", health: plusOne.health });
    }

    // ── Rsvp rows ────────────────────────────────────────────────────────────
    const primary = findPrimaryGuest(party.guests);
    const messageToHost = body.messageToHost?.trim() || null;
    const partyNotes = { songRequests: body.songRequests, messageToHost };

    for (const response of responses) {
      const shared = {
        status: response.status,
        respondedAt: now,
        source: "WEB" as const,
        idempotencyKey: `${key}:${response.guestId}`,
        ...(response.status === "NO"
          ? CLEARED_HEALTH_COLUMNS
          : response.health
            ? healthWriteData(response.health)
            : {}),
        ...(response.guestId === primary?.id ? partyNotes : {}),
      };
      await tx.rsvp.upsert({
        where: { guestId: response.guestId },
        create: { id: generateId("rsvp_"), guestId: response.guestId, songRequests: [], ...shared },
        update: shared,
      });
      if (hasHealthInformation(response.health) && response.health) {
        healthByGuest.set(response.guestId, response.health);
      }
    }

    // Song requests and the message live on the primary guest's row even when that guest is not
    // part of this submission.
    if (primary && !responses.some((response) => response.guestId === primary.id)) {
      if (primary.rsvp) {
        await tx.rsvp.update({ where: { guestId: primary.id }, data: partyNotes });
      } else if (partyNotes.songRequests.length > 0 || partyNotes.messageToHost !== null) {
        await tx.rsvp.create({
          data: {
            id: generateId("rsvp_"),
            guestId: primary.id,
            status: "PENDING",
            respondedAt: now,
            source: "WEB",
            idempotencyKey: `${key}:${primary.id}`,
            ...partyNotes,
          },
        });
      }
    }

    // ── Consent records ──────────────────────────────────────────────────────
    const ip = input.ip;
    if (healthByGuest.size > 0) {
      const consent = body.healthConsent;
      // The schema guarantees this; never store health information without the consent wording.
      if (!consent) throw validationProblem("healthConsent", "Consent is required");
      for (const guestId of healthByGuest.keys()) {
        await tx.consentRecord.create({
          data: {
            id: generateId("cns_"),
            subjectType: "GUEST",
            subjectId: guestId,
            purpose: "HEALTH_DATA_CATERING",
            granted: true,
            textShown: consent.textShown,
            locale: body.locale,
            at: now,
            ip,
          },
        });
      }
    }

    if (body.contact && primary) {
      const consentId = generateId("cns_");
      await tx.consentRecord.create({
        data: {
          id: consentId,
          subjectType: "GUEST",
          subjectId: primary.id,
          purpose: "EVENT_UPDATES",
          granted: true,
          textShown: CONTACT_CONSENT_RECORD_TEXT,
          locale: body.locale,
          at: now,
          ip,
        },
      });
      await tx.guest.update({
        where: { id: primary.id },
        data: {
          ...(body.contact.email ? { email: body.contact.email.toLowerCase() } : {}),
          ...(body.contact.phone ? { phone: body.contact.phone.replace(/[\s-]/g, "") } : {}),
          contactConsentId: consentId,
        },
      });
    }

    // ── Passes and headcount ─────────────────────────────────────────────────
    await syncPassesForParty(tx, { invitation, event: toAccessEvent(event) }, partyId);
    const headcount = await recordHeadcountSnapshot(tx, event.id, "RSVP");
    await recordRsvpSubmission(tx, { partyId, key, bodyHash, headcountId: headcount.id, at: now });
    return { replayed: false, headcountId: headcount.id };
  }

  /** Passes of the party's attending guests. Issues missing passes lazily when entitled. */
  async getPasses(
    actor: AuthActor | null,
    eventSlug: string,
    guestToken: string,
  ): Promise<GuestPassesView> {
    const link = await this.resolveLink(actor, eventSlug, guestToken);
    const enabled = link.plan.qrPassesAndCheckin;
    let party = link.party;

    // Samples and previews are read-only, so nothing is issued for them.
    if (enabled && !link.demo && !link.preview) {
      const partyId = party.id;
      const access = { invitation: party.invitation, event: toAccessEvent(party.invitation.event) };
      const needsSync = party.guests.some((guest) =>
        guest.rsvp?.status === "YES"
          ? guest.passes.length === 0
          : guest.passes.some((pass) => pass.checkedInAt === null),
      );
      if (needsSync) {
        await this.deps.db.$transaction(async (tx) => {
          await lockParty(tx, partyId);
          await syncPassesForParty(tx, access, partyId);
        });
        party = (await findPartyById(this.deps.db, partyId)) ?? party;
      }
    }

    const invitation = party.invitation;
    const event = invitation.event;
    const title = fromLocalized(event.title);
    const content = readInvitationContent(invitation.contentJson, title);
    return GuestPassesViewSchema.parse({
      enabled,
      event: {
        title,
        startsAt: event.startsAt.toISOString(),
        startsAtLocal: utcToZonedWallTime(event.startsAt, event.timeZone),
        timeZone: event.timeZone,
        venueName: content.venue?.name ?? null,
      },
      themeId: readPresentation(invitation, event.experienceMode).themeId,
      experienceMode: event.experienceMode,
      party: { displayName: fromLocalized(party.displayName), tableLabel: party.tableLabel },
      passes: enabled ? toGuestPasses(party) : [],
    });
  }

  /** One `VEVENT` in UTC. Carries the invite link but never a guest name. */
  async getCalendar(
    actor: AuthActor | null,
    eventSlug: string,
    guestToken: string,
  ): Promise<GuestCalendar> {
    const { party } = await this.resolveLink(actor, eventSlug, guestToken);
    const invitation = party.invitation;
    const event = invitation.event;
    const title = fromLocalized(event.title);
    const content = readInvitationContent(invitation.contentJson, title);
    const inviteUrl = `${getPublicAppUrl("INVITATION")}/i/${invitation.eventSlug}/${party.token}`;
    const location = content.venue
      ? [content.venue.name, content.venue.address]
          .filter((part) => part.trim().length > 0)
          .join(", ")
      : null;

    return {
      filename: `${invitation.eventSlug}.ics`,
      ics: buildInvitationIcs({
        uid: `${event.id}-${party.id}@managevent.com.au`,
        stamp: this.deps.now(),
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        summary: title,
        description: [content.headline, content.hosts, inviteUrl].join("\n\n"),
        location,
        url: inviteUrl,
      }),
    };
  }

  /** A wishing-well or tribute-book entry. Always starts `PENDING`; hosts approve it. */
  async submitWish(input: {
    actor: AuthActor | null;
    eventSlug: string;
    guestToken: string;
    body: GuestWishSubmit;
    idempotencyKey: string | null;
  }): Promise<{ created: boolean; result: GuestWishResult }> {
    const link = await this.resolveLink(input.actor, input.eventSlug, input.guestToken);
    if (link.demo) throw demoReadOnly();
    if (link.preview) throw previewReadOnly();

    const party = link.party;
    if (party.invitation.wellMode === "NONE") {
      throw new ApiProblem(409, "CONFLICT", "This invitation does not accept messages");
    }

    const idempotencyKey = input.idempotencyKey ? `${party.id}:${input.idempotencyKey}` : null;
    const replay = async (db: DbTx) => {
      if (!idempotencyKey) return null;
      const existing = await findWishByIdempotencyKey(db, idempotencyKey);
      if (!existing || existing.partyId !== party.id) return null;
      return {
        created: false,
        result: {
          id: existing.id,
          moderation: existing.moderation,
          visibility: existing.visibility,
        },
      };
    };
    const replayed = await replay(this.deps.db);
    if (replayed) return replayed;

    const visibility = input.body.shareOnWall ? ("WALL" as const) : ("HOSTS_ONLY" as const);
    try {
      return await this.deps.db.$transaction(async (tx) => {
        // Count and insert under the party lock: otherwise posts sent together would each see
        // room under the limit and the party would end up over it.
        await lockParty(tx, party.id);
        const again = await replay(tx);
        if (again) return again;
        if ((await countPartyWishes(tx, party.id)) >= MAX_WISHES_PER_PARTY) {
          throw new ApiProblem(
            429,
            "RATE_LIMITED",
            "This invitation has reached its message limit",
          );
        }
        // The client encrypts the message at rest when it is for the hosts only.
        const entry = await tx.wellEntry.create({
          data: {
            id: generateId("wel_"),
            invitationId: party.invitationId,
            partyId: party.id,
            authorName: input.body.authorName,
            message: input.body.message,
            visibility,
            moderation: "PENDING",
            idempotencyKey,
          },
          select: { id: true, moderation: true, visibility: true },
        });
        return { created: true, result: entry };
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        const concurrent = await replay(this.deps.db);
        if (concurrent) return concurrent;
      }
      throw err;
    }
  }

  /** Published sample invitations, one per template, in catalogue order. */
  async listDemos(): Promise<DemoList> {
    const rows = await listDemoInvitations(this.deps.db);
    const items: DemoInvitation[] = [];
    for (const row of rows) {
      const guestToken = row.parties[0]?.token;
      if (!guestToken) continue;
      const title = fromLocalized(row.event.title);
      const content = readInvitationContent(row.contentJson, title);
      const item = DemoInvitationSchema.safeParse({
        templateSlug: row.templateSlug,
        themeId: row.themeId,
        experienceMode: row.event.experienceMode,
        title,
        hosts: content.hosts,
        headline: content.headline,
        eventSlug: row.eventSlug,
        guestToken,
      });
      if (item.success) items.push(item.data);
    }
    const order = (slug: string) => {
      const index = INVITATION_TEMPLATES.findIndex((template) => template.slug === slug);
      return index === -1 ? INVITATION_TEMPLATES.length : index;
    };
    items.sort((a, b) => order(a.templateSlug) - order(b.templateSlug));
    return { items };
  }

  /** Maps an imported legacy path to the live link it stands for, or 404. */
  async resolveLegacy(path: string): Promise<LegacyResolveResult> {
    const candidates = legacyPathCandidates(path);
    if (candidates.length === 0) throw notFound();
    const link = await findLegacyLink(this.deps.db, candidates);
    if (!link) throw notFound();
    const result = LegacyResolveResultSchema.safeParse({
      eventSlug: link.eventSlug,
      guestToken: link.token,
    });
    if (!result.success) throw notFound();
    return result.data;
  }
}
