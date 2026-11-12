/**
 * Headcount snapshots: the bridge from RSVP data to catering and logistics.
 *
 * Every change to who is coming (a guest RSVP, a host edit) stores one `EventHeadcount` row inside
 * the same transaction and, after the commit, enqueues `headcount.changed` so the worker can
 * recompute recommendations. The snapshot holds counts only: no names and no free-text notes.
 */
import { decryptField, generateId, type Prisma } from "@managevent/db";
import { DietaryTagEnum } from "@managevent/validators";
import type { z } from "zod";
import type { DbTx } from "../../lib/deps.js";
import type { JobQueue } from "../../lib/queue.js";

/** Keys of the strict `DietaryCountsSchema`: every dietary tag except `NONE`. */
export const DIETARY_COUNT_KEYS = [
  "HALAL",
  "VEGETARIAN",
  "VEGAN",
  "GLUTEN_FREE",
  "DAIRY_FREE",
  "KOSHER",
  "NUT_ALLERGY",
  "SHELLFISH_ALLERGY",
  "OTHER_ALLERGY",
] as const;

export type DietaryTag = z.infer<typeof DietaryTagEnum>;
export type DietaryCountKey = (typeof DIETARY_COUNT_KEYS)[number];
export type DietaryCounts = Record<DietaryCountKey, number>;

const COUNT_KEY_SET: ReadonlySet<string> = new Set(DIETARY_COUNT_KEYS);

export interface HeadcountTotals {
  adultsYes: number;
  childrenYes: number;
  maybe: number;
  no: number;
  pending: number;
  dietaryCounts: DietaryCounts;
}

/** One guest as the headcount sees it. `status: null` means there is no Rsvp row yet. */
export interface HeadcountGuestInput {
  isChild: boolean;
  status: "PENDING" | "YES" | "NO" | "MAYBE" | null;
  dietary: readonly string[];
}

export function emptyDietaryCounts(): DietaryCounts {
  return {
    HALAL: 0,
    VEGETARIAN: 0,
    VEGAN: 0,
    GLUTEN_FREE: 0,
    DAIRY_FREE: 0,
    KOSHER: 0,
    NUT_ALLERGY: 0,
    SHELLFISH_ALLERGY: 0,
    OTHER_ALLERGY: 0,
  };
}

/**
 * Pure headcount maths. Guests without an Rsvp row count as pending; dietary tags are counted for
 * attending (`YES`) guests only, once per guest per tag, and `NONE` is never counted.
 */
export function computeHeadcountTotals(guests: readonly HeadcountGuestInput[]): HeadcountTotals {
  const totals: HeadcountTotals = {
    adultsYes: 0,
    childrenYes: 0,
    maybe: 0,
    no: 0,
    pending: 0,
    dietaryCounts: emptyDietaryCounts(),
  };

  for (const guest of guests) {
    switch (guest.status) {
      case "YES": {
        if (guest.isChild) totals.childrenYes += 1;
        else totals.adultsYes += 1;
        for (const tag of new Set(guest.dietary)) {
          if (COUNT_KEY_SET.has(tag)) totals.dietaryCounts[tag as DietaryCountKey] += 1;
        }
        break;
      }
      case "MAYBE":
        totals.maybe += 1;
        break;
      case "NO":
        totals.no += 1;
        break;
      default:
        totals.pending += 1;
    }
  }
  return totals;
}

/**
 * Reads the dietary tags from an `Rsvp.dietaryEncrypted` value loaded through a relation (the
 * encryption extension only decrypts top-level `rsvp` queries). Unknown values are dropped.
 */
export function readDietaryTags(dietaryEncrypted: string | null | undefined): DietaryTag[] {
  if (!dietaryEncrypted) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(decryptField(dietaryEncrypted));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const tags: DietaryTag[] = [];
  for (const value of parsed) {
    const tag = DietaryTagEnum.safeParse(value);
    if (tag.success && !tags.includes(tag.data)) tags.push(tag.data);
  }
  return tags;
}

/**
 * Counts non-deleted guests of non-deleted parties (`adultsYes`, `childrenYes`, `maybe`, `no`,
 * `pending`; a guest without an Rsvp row is pending), stores an `EventHeadcount` row with strict
 * dietary counts over `YES` guests, and returns its id. Call inside the write transaction.
 */
export async function recordHeadcountSnapshot(
  tx: DbTx,
  eventId: string,
  trigger: "RSVP" | "HOST_EDIT",
): Promise<{ id: string }> {
  // One snapshot at a time per event. Without this, two parties responding at the same moment
  // would each count without the other's uncommitted change, and the later snapshot (the one
  // logistics acts on) could be short. The lock is released when the transaction ends; under
  // READ COMMITTED the count below then sees everything committed before the lock was granted.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`headcount:${eventId}`}, 0))::text AS "locked"`;

  const guests = await tx.guest.findMany({
    where: { deletedAt: null, party: { deletedAt: null, invitation: { eventId } } },
    select: {
      isChild: true,
      rsvp: { select: { status: true, dietaryEncrypted: true } },
    },
  });

  const totals = computeHeadcountTotals(
    guests.map((guest) => ({
      isChild: guest.isChild,
      status: guest.rsvp?.status ?? null,
      dietary: guest.rsvp?.status === "YES" ? readDietaryTags(guest.rsvp.dietaryEncrypted) : [],
    })),
  );

  const id = generateId("hc_");
  await tx.eventHeadcount.create({
    data: {
      id,
      eventId,
      // Stamped here, while the lock is held, so snapshots of one event are ordered by when
      // their count was taken. The worker decides which recommendation set is current from
      // this order (`headcount.changed`).
      takenAt: new Date(),
      adultsYes: totals.adultsYes,
      childrenYes: totals.childrenYes,
      maybe: totals.maybe,
      no: totals.no,
      pending: totals.pending,
      dietaryCountsJson: totals.dietaryCounts as Prisma.InputJsonValue,
      trigger,
    },
  });
  return { id };
}

/**
 * Enqueues `headcount.changed` with payload `{ eventId, headcountId }` and singleton key
 * `headcount.changed:${headcountId}`. Call after the transaction commits.
 */
export async function enqueueHeadcountChanged(
  queue: JobQueue,
  eventId: string,
  headcountId: string,
): Promise<void> {
  await queue.enqueue(
    "headcount.changed",
    { eventId, headcountId },
    { singletonKey: `headcount.changed:${headcountId}` },
  );
}
