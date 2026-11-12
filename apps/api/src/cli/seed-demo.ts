/**
 * Seeds the six sample invitations (`pnpm --filter @managevent/api seed:demo`).
 *
 * Idempotent: every sample is found by its fixed event slug and updated in place, so running it
 * again refreshes the wording and moves the event date forward without creating duplicates or
 * changing any guest link. The per-event salt is generated on first create only.
 *
 * The sample host has no credential account, so nobody can sign in as them, and the API answers
 * `403 DEMO_READ_ONLY` to every write on a sample.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateId, type Prisma } from "@managevent/db";
import { getExperienceMode } from "@managevent/i18n";
import {
  INVITATION_TEMPLATES,
  InvitationContentSchema,
  RsvpConfigSchema,
  WellConfigSchema,
} from "@managevent/validators";
import { type ApiDeps, createDefaultDeps, type DbTx } from "../lib/deps.js";
import { buildPartyToken, generateEventSalt, generateStableId } from "../lib/guest-tokens.js";
import { toLocalized } from "../lib/localized.js";
import { utcToZonedWallTime, zonedWallTimeToUtc } from "../lib/time.js";
import { assertRsvpConfigAllowed, assertWellAllowed } from "../modules/events/rules.js";
import { DEMO_EVENTS, DEMO_OWNER, DEMO_PARTY, type DemoEventDefinition } from "./demo-content.js";

const DEMO_TIME_ZONE = "Australia/Perth";
const DAYS_AHEAD = 120;
const START_TIME = "16:00";
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface DemoSeedResult {
  eventSlug: string;
  eventId: string;
  created: boolean;
  /** `/i/{eventSlug}/{guestToken}`: the page the templates gallery links to. */
  guestPath: string;
}

/** 4 pm Perth time, 120 days after `now`. */
export function demoStartsAt(now: Date): Date {
  const localDate = utcToZonedWallTime(
    new Date(now.getTime() + DAYS_AHEAD * DAY_MS),
    DEMO_TIME_ZONE,
  ).slice(0, 10);
  return zonedWallTimeToUtc(`${localDate}T${START_TIME}`, DEMO_TIME_ZONE);
}

async function upsertDemoOwner(tx: DbTx): Promise<string> {
  const existing = await tx.user.findUnique({
    where: { email: DEMO_OWNER.email },
    select: { id: true },
  });
  if (existing) {
    await tx.user.update({
      where: { id: existing.id },
      data: { name: DEMO_OWNER.name, roles: ["CUSTOMER_HOST"], deletedAt: null },
    });
    return existing.id;
  }
  const id = generateId("usr_");
  await tx.user.create({
    data: { id, email: DEMO_OWNER.email, name: DEMO_OWNER.name, roles: ["CUSTOMER_HOST"] },
  });
  return id;
}

async function upsertDemoParty(
  tx: DbTx,
  invitation: { id: string; eventSlug: string; salt: string },
  tableLabel: string | null,
): Promise<string> {
  // Derived from the slug, so a re-run finds the same party and the link never changes.
  const stableId = generateStableId(`demo-party:${invitation.eventSlug}`);
  const maxSeats = DEMO_PARTY.guests.length;

  let party = await tx.party.findUnique({
    where: { invitationId_stableId: { invitationId: invitation.id, stableId } },
    select: { id: true, token: true },
  });
  if (party) {
    await tx.party.update({
      where: { id: party.id },
      data: {
        displayName: toLocalized(DEMO_PARTY.displayName),
        maxSeats,
        allowPlusOnes: false,
        childrenAllowed: true,
        tableLabel,
        deletedAt: null,
        tokenRevokedAt: null,
      },
    });
  } else {
    party = await tx.party.create({
      data: {
        id: generateId("pty_"),
        invitationId: invitation.id,
        stableId,
        displayName: toLocalized(DEMO_PARTY.displayName),
        token: buildPartyToken(DEMO_PARTY.displayName, invitation.salt, stableId, 0),
        maxSeats,
        allowPlusOnes: false,
        childrenAllowed: true,
        tags: [],
        tableLabel,
      },
      select: { id: true, token: true },
    });
  }

  for (const [index, guest] of DEMO_PARTY.guests.entries()) {
    const guestStableId = generateStableId(`demo-guest:${invitation.eventSlug}:${index}`);
    const existing = await tx.guest.findFirst({
      where: { partyId: party.id, stableId: guestStableId },
      select: { id: true },
    });
    const data = { name: toLocalized(guest.name), isChild: guest.isChild, isPlusOne: false };
    if (existing) {
      await tx.guest.update({ where: { id: existing.id }, data: { ...data, deletedAt: null } });
    } else {
      await tx.guest.create({
        data: { id: generateId("gst_"), partyId: party.id, stableId: guestStableId, ...data },
      });
    }
  }
  return party.token;
}

async function upsertDemoEvent(
  tx: DbTx,
  ownerUserId: string,
  definition: DemoEventDefinition,
  now: Date,
): Promise<DemoSeedResult> {
  const template = INVITATION_TEMPLATES.find((entry) => entry.slug === definition.templateSlug);
  if (!template) throw new Error(`Unknown template ${definition.templateSlug}`);
  const experienceMode = getExperienceMode({ ceremonySlug: definition.ceremonySlug });
  if (template.mode !== experienceMode) {
    throw new Error(`Template ${template.slug} does not suit a ${definition.ceremonySlug} event`);
  }

  // The same checks a host's own edits go through, so a sample can never show something a real
  // invitation could not.
  const content = InvitationContentSchema.parse(definition.content);
  const rsvpConfig = RsvpConfigSchema.parse(definition.rsvpConfig);
  const wellConfig = WellConfigSchema.parse(definition.wellConfig);
  assertRsvpConfigAllowed(experienceMode, rsvpConfig);
  assertWellAllowed(experienceMode, definition.wellMode, wellConfig);

  const startsAt = demoStartsAt(now);
  const endsAt = new Date(startsAt.getTime() + definition.durationHours * HOUR_MS);
  const rsvpDeadline = new Date(startsAt.getTime() - definition.rsvpDeadlineDaysBefore * DAY_MS);

  const eventData = {
    ownerUserId,
    title: toLocalized(definition.title),
    ceremonySlug: definition.ceremonySlug,
    experienceMode,
    status: "LIVE",
    startsAt,
    endsAt,
    timeZone: DEMO_TIME_ZONE,
    deletedAt: null,
  } satisfies Prisma.EventUncheckedUpdateInput;

  const invitationData = {
    templateSlug: template.slug,
    themeId: template.defaultThemeId,
    gateStyle: template.defaultGateStyle,
    contentJson: content as Prisma.InputJsonValue,
    languages: ["en"],
    defaultLanguage: "en",
    plan: "PREMIUM",
    pinHash: null,
    rsvpDeadline,
    rsvpConfigJson: rsvpConfig as Prisma.InputJsonValue,
    allowForwarding: true,
    wallEnabled: false,
    wallAutoApprove: false,
    wellMode: definition.wellMode,
    wellConfigJson: wellConfig as Prisma.InputJsonValue,
    isDemo: true,
    deletedAt: null,
  } satisfies Prisma.InvitationUncheckedUpdateInput;

  const existing = await tx.invitation.findUnique({
    where: { eventSlug: definition.eventSlug },
    select: { id: true, eventId: true, salt: true, publishedAt: true },
  });

  let invitation: { id: string; eventId: string; salt: string };
  if (existing) {
    await tx.event.update({ where: { id: existing.eventId }, data: eventData });
    await tx.invitation.update({
      where: { id: existing.id },
      // Keep the first publish time; only a sample that somehow lost it is published again.
      data: { ...invitationData, publishedAt: existing.publishedAt ?? now },
    });
    invitation = existing;
  } else {
    const eventId = generateId("evt_");
    await tx.event.create({ data: { id: eventId, ...eventData } });
    invitation = await tx.invitation.create({
      data: {
        id: generateId("inv_"),
        eventId,
        eventSlug: definition.eventSlug,
        salt: generateEventSalt(),
        publishedAt: now,
        ...invitationData,
      },
      select: { id: true, eventId: true, salt: true },
    });
  }

  const coHost = await tx.coHost.findUnique({
    where: { eventId_userId: { eventId: invitation.eventId, userId: ownerUserId } },
    select: { id: true },
  });
  if (coHost) {
    await tx.coHost.update({ where: { id: coHost.id }, data: { role: "OWNER" } });
  } else {
    await tx.coHost.create({
      data: {
        id: generateId("coh_"),
        eventId: invitation.eventId,
        userId: ownerUserId,
        role: "OWNER",
      },
    });
  }

  const guestToken = await upsertDemoParty(
    tx,
    { id: invitation.id, eventSlug: definition.eventSlug, salt: invitation.salt },
    definition.tableLabel,
  );

  return {
    eventSlug: definition.eventSlug,
    eventId: invitation.eventId,
    created: !existing,
    guestPath: `/i/${definition.eventSlug}/${guestToken}`,
  };
}

export async function seedDemo(deps: Pick<ApiDeps, "db" | "now">): Promise<DemoSeedResult[]> {
  const now = deps.now();
  const results: DemoSeedResult[] = [];
  // One transaction per sample: a failure leaves the others complete and nothing half-written.
  const ownerUserId = await deps.db.$transaction((tx) => upsertDemoOwner(tx));
  for (const definition of DEMO_EVENTS) {
    results.push(
      await deps.db.$transaction((tx) => upsertDemoEvent(tx, ownerUserId, definition, now)),
    );
  }
  return results;
}

async function main(): Promise<void> {
  const deps = createDefaultDeps();
  try {
    const results = await seedDemo(deps);
    for (const result of results) {
      console.info(`${result.created ? "created" : "updated"}  ${result.guestPath}`);
    }
    console.info(`Seeded ${results.length} sample invitations.`);
  } catch (err) {
    process.exitCode = 1;
    console.error(
      `Sample seed failed: ${err instanceof Error ? `${err.name}: ${err.message}` : "unknown error"}`,
    );
  } finally {
    await deps.db.$disconnect();
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isMainModule) {
  await main();
}
