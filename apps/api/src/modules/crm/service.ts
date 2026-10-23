/**
 * CRM service layer (`POST /v1/leads` and `GET /v1/leads`).
 *
 * Persists the lead via `LeadRepository` and enqueues the `lead.created` background job (`pg-boss`).
 */
import PgBoss from "pg-boss";
import type { LeadCreate, LeadResponse } from "@managevent/types";
import { LeadRepository } from "./repo.js";

export interface LeadCreatedJobPayload {
  leadId: string;
  name: string;
  email: string;
  preferredLanguage: "en" | "fa";
  source: LeadCreate["source"];
  ceremonySlug: string | null;
}

export interface JobQueueProducer {
  enqueueLeadCreated(payload: LeadCreatedJobPayload, singletonKey: string): Promise<string | null>;
}

/**
 * Default pg-boss producer that writes directly to the `pgboss` tables in Postgres
 * so `apps/worker` can consume `lead.created` jobs asynchronously.
 */
export class PgBossLeadQueueProducer implements JobQueueProducer {
  private readonly connectionString: string;

  constructor(
    connectionString: string = process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/managevent",
  ) {
    this.connectionString = connectionString;
  }

  async enqueueLeadCreated(
    payload: LeadCreatedJobPayload,
    singletonKey: string,
  ): Promise<string | null> {
    const boss = new PgBoss(this.connectionString);
    await boss.start();
    try {
      await boss.createQueue("lead.created");
      const jobId = await boss.send("lead.created", payload, {
        singletonKey,
        retryLimit: 3,
        retryDelay: 5,
        retryBackoff: true,
      });
      return jobId;
    } finally {
      await boss.stop({ graceful: false });
    }
  }
}

export class LeadService {
  private readonly repo: LeadRepository;
  private readonly queue: JobQueueProducer;

  constructor(
    repo: LeadRepository = new LeadRepository(),
    queue: JobQueueProducer = new PgBossLeadQueueProducer(),
  ) {
    this.repo = repo;
    this.queue = queue;
  }

  async submitLead(params: {
    input: LeadCreate;
    idempotencyKey?: string;
    ipAddress?: string;
  }): Promise<{ lead: LeadResponse; createdNew: boolean; jobId: string | null }> {
    const { lead, createdNew } = await this.repo.createLead(params);

    let jobId: string | null = null;
    if (createdNew) {
      const preferredLanguage: "en" | "fa" = lead.preferredLanguage === "fa" ? "fa" : "en";
      jobId = await this.queue.enqueueLeadCreated(
        {
          leadId: lead.id,
          name: lead.name,
          email: lead.email,
          preferredLanguage,
          source: lead.source,
          ceremonySlug: lead.ceremonySlug,
        },
        `lead.created:${lead.id}`,
      );
    }

    return { lead, createdNew, jobId };
  }

  async listLeads(limit?: number): Promise<LeadResponse[]> {
    return this.repo.listLeads(limit);
  }
}
