/**
 * CRM service layer (`/v1/leads`).
 *
 * Persists the lead via `LeadRepository` and enqueues the `lead.created` background job. The job
 * payload carries the lead id only: the worker loads the lead itself, so no personal information
 * sits in the queue tables.
 */
import type { AuthActor } from "@managevent/auth";
import type { LeadCreate, LeadResponse } from "@managevent/types";
import type { LeadDetail, LeadList, LeadListQuery, LeadUpdate } from "@managevent/validators";
import { PgBossJobQueue } from "../../lib/queue.js";
import { InvalidLeadAssigneeError, LeadRepository } from "./repo.js";

export interface LeadCreatedJobPayload {
  leadId: string;
}

export interface JobQueueProducer {
  enqueueLeadCreated(payload: LeadCreatedJobPayload, singletonKey: string): Promise<string | null>;
}

/**
 * Default producer: one long-lived pg-boss instance per process (shared `PgBossJobQueue`), so
 * `apps/worker` can consume `lead.created` jobs. A failed enqueue is logged there and returns
 * null; the lead is already stored and the job can be re-driven.
 */
export class PgBossLeadQueueProducer implements JobQueueProducer {
  private static sharedQueue: PgBossJobQueue | null = null;
  private readonly queue: PgBossJobQueue;

  constructor(connectionString?: string) {
    if (connectionString) {
      this.queue = new PgBossJobQueue(connectionString);
    } else {
      PgBossLeadQueueProducer.sharedQueue ??= new PgBossJobQueue();
      this.queue = PgBossLeadQueueProducer.sharedQueue;
    }
  }

  enqueueLeadCreated(payload: LeadCreatedJobPayload, singletonKey: string): Promise<string | null> {
    return this.queue.enqueue("lead.created", { leadId: payload.leadId }, { singletonKey });
  }
}

export { InvalidLeadAssigneeError };

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
      jobId = await this.queue.enqueueLeadCreated({ leadId: lead.id }, `lead.created:${lead.id}`);
    }

    return { lead, createdNew, jobId };
  }

  async listLeads(limit?: number): Promise<LeadResponse[]> {
    return this.repo.listLeads(limit);
  }

  /** The inbox with stage filter, search and cursor paging. */
  async listLeadsPage(query: LeadListQuery): Promise<LeadList> {
    return this.repo.listLeadsPage(query);
  }

  async getLead(leadId: string): Promise<LeadDetail | null> {
    return this.repo.getLead(leadId);
  }

  /** Updates stage, notes or assignee and audits the change. Null when the lead does not exist. */
  async updateLead(params: {
    leadId: string;
    input: LeadUpdate;
    actor: AuthActor | null;
    ipAddress?: string;
  }): Promise<LeadDetail | null> {
    return this.repo.updateLead(params);
  }
}
