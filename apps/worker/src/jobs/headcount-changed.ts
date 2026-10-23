/**
 * `headcount.changed` job (`ARCHITECTURE.md` §6):
 * Reads the `EventHeadcount` snapshot and active `Order` lines, computes recommendations via
 * `@managevent/logistics`, marks older open sets as `SUPERSEDED`, and persists a new `RecommendationSet`.
 */
import { db, type ExtendedDbClient, generateId, Prisma } from "@managevent/db";
import {
  type DietaryBreakdownMap,
  generateLogisticsRecommendations,
  type LogisticsOrderLineSnapshot,
} from "@managevent/logistics";
import { EventHeadcountIdSchema, EventIdSchema } from "@managevent/validators";
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

      const dietaryBreakdown = (headcount.dietaryCountsJson ?? {}) as DietaryBreakdownMap;
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

      await client.recommendationSet.updateMany({
        where: {
          eventId: payload.eventId,
          status: "OPEN",
        },
        data: {
          status: "SUPERSEDED",
        },
      });

      const recId = generateId("rec_");
      await client.recommendationSet.create({
        data: {
          id: recId,
          eventId: payload.eventId,
          orderId: activeOrder?.id ?? null,
          basedOnHeadcountId: payload.headcountId,
          rulesVersion: result.rulesVersion,
          itemsJson: result.items as unknown as Prisma.InputJsonValue,
          status: "OPEN",
        },
      });

      return {
        recommendationSetId: recId,
        rulesVersion: result.rulesVersion,
        itemCount: result.items.length,
      };
    },
  };
}
