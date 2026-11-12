/**
 * `invitation.email_campaign_sweep` job: finds email campaigns that are stuck and gets them
 * moving again. Runs every five minutes (`schedules.ts`).
 *
 * A campaign is stuck when it has been `QUEUED` for a couple of minutes (its job never reached
 * the queue, or failed on every retry) or `SENDING` for longer than one run can take (the worker
 * died mid-send). While a campaign is in either state its recipients count as already emailed and
 * against the plan quota, so leaving it there blocks those guests for good.
 *
 * - A stuck campaign younger than a day is put back in the queue. The send job is safe to run
 *   again, and its singleton key drops the request when a job is still waiting.
 * - One that is still unfinished after a day is settled as `PARTIAL` (some emails went out) or
 *   `FAILED` (none did), so a campaign that can never be sent does not loop for ever and the host
 *   can send again.
 *
 * Logs counts only.
 */
import { db, type ExtendedDbClient } from "@managevent/db";
import { z } from "zod";
import type { JobDefinition } from "../registry.js";

/** The schedule sends an empty payload. */
export const CampaignSweepJobSchema = z.object({}).strict();

export interface CampaignSweepJobResult {
  /** Put back in the queue. */
  requeued: number;
  /** Given up on and marked `PARTIAL` or `FAILED`. */
  settled: number;
}

const MINUTE_MS = 60_000;
/** Long enough for the API's own enqueue (which follows the commit) to have happened. */
export const QUEUED_STALE_AFTER_MS = 2 * MINUTE_MS;
/** The send job may run for 30 minutes (`expireInSeconds`); after that it is not coming back. */
export const SENDING_STALE_AFTER_MS = 35 * MINUTE_MS;
export const GIVE_UP_AFTER_MS = 24 * 60 * MINUTE_MS;
const SWEEP_BATCH = 200;
const SWEEP_INTERVAL_MS = 5 * MINUTE_MS;

export function createCampaignSweepJob(options: {
  /** Enqueues `invitation.email_campaign` for the campaign (singleton key `campaign:{id}`). */
  enqueueCampaign: (campaignId: string) => Promise<void>;
  dbClient?: ExtendedDbClient;
  now?: () => Date;
  /**
   * Limits the sweep to these invitations. The worker never sets it; tests do, because they run
   * on a database they share and must not touch campaigns they did not create.
   */
  invitationIds?: readonly string[];
}): JobDefinition<typeof CampaignSweepJobSchema, CampaignSweepJobResult> {
  const client = options.dbClient ?? db;
  const now = options.now ?? (() => new Date());

  return {
    name: "invitation.email_campaign_sweep",
    schema: CampaignSweepJobSchema,
    // One run per schedule tick: the payload is always empty, so the key is the tick itself.
    dedupeKey: () => `campaign-sweep:${Math.floor(now().getTime() / SWEEP_INTERVAL_MS)}`,
    retryPolicy: {
      retryLimit: 1,
      retryDelaySec: 30,
      retryBackoff: false,
      deadLetterQueue: "dlq.invitation.email_campaign_sweep",
      expireInSeconds: 4 * 60,
    },
    handler: async (): Promise<CampaignSweepJobResult> => {
      const at = now().getTime();
      const stuck = await client.campaign.findMany({
        where: {
          channel: "EMAIL",
          ...(options.invitationIds ? { invitationId: { in: [...options.invitationIds] } } : {}),
          OR: [
            { status: "QUEUED", updatedAt: { lt: new Date(at - QUEUED_STALE_AFTER_MS) } },
            { status: "SENDING", updatedAt: { lt: new Date(at - SENDING_STALE_AFTER_MS) } },
          ],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: SWEEP_BATCH,
        select: { id: true, status: true, createdAt: true },
      });

      let requeued = 0;
      let settled = 0;
      for (const campaign of stuck) {
        if (at - campaign.createdAt.getTime() < GIVE_UP_AFTER_MS) {
          await options.enqueueCampaign(campaign.id);
          requeued += 1;
          continue;
        }
        const sent = await client.message.count({
          where: { campaignId: campaign.id, status: "SENT" },
        });
        // Only if it is still stuck: a run that finished in the meantime keeps its own result.
        const updated = await client.campaign.updateMany({
          where: { id: campaign.id, status: campaign.status },
          data: { status: sent > 0 ? "PARTIAL" : "FAILED" },
        });
        settled += updated.count;
      }

      if ((requeued > 0 || settled > 0) && process.env.NODE_ENV !== "test") {
        console.warn(
          JSON.stringify({ level: "warn", msg: "email campaign sweep", requeued, settled }),
        );
      }
      return { requeued, settled };
    },
  };
}
