/**
 * `headcount.changed` job (`ARCHITECTURE.md` §6):
 * Reads the `EventHeadcount` snapshot and active `Order` lines, computes recommendations via
 * `@managevent/logistics`, marks older open sets as `SUPERSEDED`, and persists a new `RecommendationSet`.
 *
 * Jobs do not arrive in snapshot order: the API enqueues after its commit, a job can be retried
 * after a newer one has run, and two workers can run at once. So the write is one transaction
 * under the event's headcount lock (the lock the API takes to record a snapshot), and only the
 * event's NEWEST snapshot may hold the `OPEN` set. A job for an older snapshot stores its set as
 * `SUPERSEDED` and leaves the current one alone.
 */
import { db, type ExtendedDbClient, generateId, Prisma } from "@managevent/db";
import {
  generateLogisticsRecommendations,
  type LogisticsOrderLineSnapshot,
} from "@managevent/logistics";
import { DietaryCountsSchema, EventHeadcountIdSchema, EventIdSchema } from "@managevent/validators";
import { z } from "zod";
import type { JobDefinition } from "../registry.js";

export const HeadcountChangedJobSchema = z.object({
  eventId: EventIdSchema,
  headcountId: EventHeadcountIdSchema,
  alcoholServed: z.boolean().default(false),
});

export type HeadcountChangedJobData = z.infer<typeof HeadcountChangedJobSchema>;

export interface HeadcountChangedJobResult {
  recommendationSetId: string;
  rulesVersion: string;
  itemCount: number;
}

export function createHeadcountChangedJob(options?: {
  dbClient?: ExtendedDbClient;
}): JobDefinition<typeof HeadcountChangedJobSchema, HeadcountChangedJobResult> {
  const client = options?.dbClient ?? db;

  return {
    name: "headcount.changed",
    schema: HeadcountChangedJobSchema,
    dedupeKey: (payload) => `headcount.changed:${payload.headcountId}`,
    retryPolicy: {
      retryLimit: 3,
      retryDelaySec: 5,
      retryBackoff: true,
      deadLetterQueue: "dlq.headcount.changed",
    },
    handler: async (payload): Promise<HeadcountChangedJobResult> => {
      // Idempotency check: if a RecommendationSet already exists for this headcountId, return it
      const existingRec = await client.recommendationSet.findFirst({
        where: { basedOnHeadcountId: payload.headcountId },
      });
      if (existingRec) {
        const existingItems = Array.isArray(existingRec.itemsJson) ? existingRec.itemsJson : [];
        return {
          recommendationSetId: existingRec.id,
          rulesVersion: existingRec.rulesVersion,
          itemCount: existingItems.length,
        };
      }

      const headcount = await client.eventHeadcount.findUniqueOrThrow({
        where: { id: payload.headcountId },
      });
      if (headcount.eventId !== payload.eventId) {
        throw new Error("Headcount snapshot does not belong to the requested event");
      }

      const activeOrder = await client.order.findFirst({
        where: {
          eventId: payload.eventId,
          deletedAt: null,
        },
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      });

      const orderLineSnapshots: LogisticsOrderLineSnapshot[] = (activeOrder?.lines ?? [])
        .filter((l) => Boolean(l.logisticsKey))
        .map((l) => ({
          logisticsKey: l.logisticsKey ?? "",
          currentQty: l.qty,
          unitPriceIncGstCents: Math.round(l.amountIncGstCents / Math.max(1, l.qty)),
          finalNumbersDueAt: l.finalNumbersDueAt,
        }));

      const dietaryBreakdown = DietaryCountsSchema.parse(headcount.dietaryCountsJson);
      const result = generateLogisticsRecommendations({
        adultsYes: headcount.adultsYes,
        childrenYes: headcount.childrenYes,
        maybe: headcount.maybe,
        dietaryBreakdown,
        tableType: "ROUND_10",
        separateKidsTables: headcount.childrenYes > 0,
        serviceStyle: "BANQUET",
        alcoholServed: payload.alcoholServed,
        cakeProfile: "FULL_SERVE",
        orderLines: orderLineSnapshots,
        now: new Date(),
      });

      return client.$transaction(async (tx) => {
        // The same advisory lock `recordHeadcountSnapshot` holds in the API: no snapshot can be
        // added, and no other run of this job can write, until this transaction ends.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`headcount:${payload.eventId}`}, 0))::text AS "locked"`;

        // Another run finished this snapshot while this one was computing.
        const concurrent = await tx.recommendationSet.findFirst({
          where: { basedOnHeadcountId: payload.headcountId },
        });
        if (concurrent) {
          const items = Array.isArray(concurrent.itemsJson) ? concurrent.itemsJson : [];
          return {
            recommendationSetId: concurrent.id,
            rulesVersion: concurrent.rulesVersion,
            itemCount: items.length,
          };
        }

        const newest = await tx.eventHeadcount.findFirst({
          where: { eventId: payload.eventId },
          orderBy: [{ takenAt: "desc" }, { id: "desc" }],
          select: { id: true },
        });
        const isNewest = newest?.id === payload.headcountId;
        if (isNewest) {
          await tx.recommendationSet.updateMany({
            where: { eventId: payload.eventId, status: "OPEN" },
            data: { status: "SUPERSEDED" },
          });
        }

        const recId = generateId("rec_");
        await tx.recommendationSet.create({
          data: {
            id: recId,
            eventId: payload.eventId,
            orderId: activeOrder?.id ?? null,
            basedOnHeadcountId: payload.headcountId,
            rulesVersion: result.rulesVersion,
            itemsJson: result.items as unknown as Prisma.InputJsonValue,
            // A set for a snapshot that is no longer the newest is history, not a recommendation.
            status: isNewest ? "OPEN" : "SUPERSEDED",
          },
        });

        return {
          recommendationSetId: recId,
          rulesVersion: result.rulesVersion,
          itemCount: result.items.length,
        };
      });
    },
  };
}
