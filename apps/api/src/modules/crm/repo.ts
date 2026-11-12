/**
 * CRM repository (`Lead` and `ConsentRecord` persistence via `@managevent/db`).
 * Route handlers never call Prisma directly; all DB access goes through repository methods.
 */
import type { AuthActor } from "@managevent/auth";
import { db, type ExtendedDbClient, generateId, type Lead, Prisma } from "@managevent/db";
import type { LeadCreate, LeadResponse } from "@managevent/types";
import {
  type LeadDetail,
  type LeadList,
  type LeadListQuery,
  type LeadUpdate,
  UtmSchema,
} from "@managevent/validators";
import { writeAudit } from "../../lib/audit.js";
import { isUniqueViolation } from "../../lib/errors.js";

export interface CreateLeadPersistenceParams {
  input: LeadCreate;
  idempotencyKey?: string;
  ipAddress?: string;
}

export interface UpdateLeadParams {
  leadId: string;
  input: LeadUpdate;
  actor: AuthActor | null;
  ipAddress?: string;
}

/** Thrown when `assignedToUserId` is not a planner or admin account. */
export class InvalidLeadAssigneeError extends Error {
  constructor() {
    super("The assignee must be a Managevent staff member");
    this.name = "InvalidLeadAssigneeError";
  }
}

const STAFF_ROLES = ["PLANNER_STAFF", "SUPER_ADMIN"] as const;

function mapLeadToResponse(row: Lead): LeadResponse {
  return {
    id: row.id,
    stage: row.stage,
    source: row.source,
    name: row.name,
    email: row.email,
    phone: row.phone,
    preferredLanguage: row.preferredLanguage,
    preferredChannel: row.preferredChannel,
    ceremonySlug: row.ceremonySlug,
    eventDate: row.eventDate ? row.eventDate.toISOString() : null,
    dateFlexible: row.dateFlexible,
    guestEstimate: row.guestEstimate,
    area: row.area,
    estimateId: row.estimateId,
    marketingConsentId: row.marketingConsentId,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapLeadToDetail(row: Lead, marketingConsent: boolean): LeadDetail {
  const utm = UtmSchema.safeParse(row.utm);
  return {
    ...mapLeadToResponse(row),
    message: row.message,
    utm: row.utm !== null && utm.success ? utm.data : null,
    notes: row.notes,
    assignedToUserId: row.assignedToUserId,
    eventId: row.eventId,
    marketingConsent,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class LeadRepository {
  private readonly client: ExtendedDbClient;

  constructor(client: ExtendedDbClient = db) {
    this.client = client;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<LeadResponse | null> {
    const existing = await this.client.lead.findUnique({
      where: { idempotencyKey },
    });
    return existing ? mapLeadToResponse(existing) : null;
  }

  async createLead(
    params: CreateLeadPersistenceParams,
  ): Promise<{ lead: LeadResponse; createdNew: boolean }> {
    if (params.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(params.idempotencyKey);
      if (existing) {
        return { lead: existing, createdNew: false };
      }
    }

    const leadId = generateId("lead_");
    const marketingConsentId = params.input.marketingConsent ? generateId("cns_") : null;

    let created: Lead;
    try {
      // One transaction: the consent record and the lead exist together or not at all. A consent
      // row for a lead that was never stored would be a granted consent attached to nobody.
      created = await this.client.$transaction(async (tx) => {
        if (marketingConsentId) {
          await tx.consentRecord.create({
            data: {
              id: marketingConsentId,
              subjectType: "LEAD",
              subjectId: leadId,
              purpose: "MARKETING_EMAIL",
              granted: true,
              textShown:
                "Send me occasional ceremony inspiration and offers from Managevent. Unsubscribe anytime.",
              locale: params.input.preferredLanguage,
              ip: params.ipAddress ?? null,
            },
          });
        }
        return tx.lead.create({
          data: {
            id: leadId,
            stage: "NEW",
            source: params.input.source,
            name: params.input.name,
            email: params.input.email,
            phone: params.input.phone ?? null,
            preferredLanguage: params.input.preferredLanguage,
            preferredChannel: params.input.preferredChannel,
            ceremonySlug: params.input.ceremonySlug ?? null,
            eventDate: params.input.eventDate ? new Date(params.input.eventDate) : null,
            dateFlexible: params.input.dateFlexible,
            guestEstimate: params.input.guestEstimate ?? null,
            area: params.input.area ?? null,
            message: params.input.message ?? null,
            estimateId: params.input.estimateId ?? null,
            utm: params.input.utm ? (params.input.utm as Prisma.InputJsonValue) : Prisma.JsonNull,
            marketingConsentId,
            idempotencyKey: params.idempotencyKey ?? null,
          },
        });
      });
    } catch (err) {
      // Two requests with the same Idempotency-Key at the same moment (a double click): the other
      // one stored the lead, and this one answers with it, exactly like a later repeat would.
      if (params.idempotencyKey && isUniqueViolation(err)) {
        const existing = await this.findByIdempotencyKey(params.idempotencyKey);
        if (existing) return { lead: existing, createdNew: false };
      }
      throw err;
    }

    return {
      lead: mapLeadToResponse(created),
      createdNew: true,
    };
  }

  async listLeads(limit: number = 50): Promise<LeadResponse[]> {
    const rows = await this.client.lead.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapLeadToResponse);
  }

  /**
   * The CRM inbox, newest first. Lead ids are UUIDv7, so id order is creation order and the last
   * id of a page is a stable cursor even while new leads arrive.
   */
  async listLeadsPage(query: LeadListQuery): Promise<LeadList> {
    const q = query.q?.trim();
    const rows = await this.client.lead.findMany({
      where: {
        deletedAt: null,
        ...(query.stage ? { stage: query.stage } : {}),
        ...(query.cursor ? { id: { lt: query.cursor } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
                { phone: { contains: q } },
                { area: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { id: "desc" },
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      items: page.map(mapLeadToResponse),
      nextCursor: rows.length > query.limit ? (page.at(-1)?.id ?? null) : null,
    };
  }

  private async hasMarketingConsent(lead: Lead): Promise<boolean> {
    if (!lead.marketingConsentId) return false;
    const consent = await this.client.consentRecord.findUnique({
      where: { id: lead.marketingConsentId },
      select: { granted: true, withdrawnAt: true },
    });
    return consent !== null && consent.granted && consent.withdrawnAt === null;
  }

  async getLead(leadId: string): Promise<LeadDetail | null> {
    const row = await this.client.lead.findFirst({ where: { id: leadId, deletedAt: null } });
    if (!row) return null;
    return mapLeadToDetail(row, await this.hasMarketingConsent(row));
  }

  /**
   * Applies a staff update and writes the `lead.update` audit row in the same transaction.
   * The audit diff records the stage change, the assignee change and whether the notes changed,
   * never the notes themselves. Returns null when the lead does not exist.
   */
  async updateLead(params: UpdateLeadParams): Promise<LeadDetail | null> {
    const { leadId, input } = params;
    const updated = await this.client.$transaction(async (tx) => {
      const current = await tx.lead.findFirst({ where: { id: leadId, deletedAt: null } });
      if (!current) return null;

      if (input.assignedToUserId) {
        const assignee = await tx.user.findFirst({
          where: {
            id: input.assignedToUserId,
            deletedAt: null,
            roles: { hasSome: [...STAFF_ROLES] },
          },
          select: { id: true },
        });
        if (!assignee) throw new InvalidLeadAssigneeError();
      }

      const stageChanged = input.stage !== undefined && input.stage !== current.stage;
      const notesChanged = input.notes !== undefined && input.notes !== current.notes;
      const assigneeChanged =
        input.assignedToUserId !== undefined && input.assignedToUserId !== current.assignedToUserId;
      if (!stageChanged && !notesChanged && !assigneeChanged) return current;

      const row = await tx.lead.update({
        where: { id: leadId },
        data: {
          ...(stageChanged && input.stage ? { stage: input.stage } : {}),
          ...(notesChanged ? { notes: input.notes ?? null } : {}),
          ...(assigneeChanged ? { assignedToUserId: input.assignedToUserId ?? null } : {}),
        },
      });
      await writeAudit(tx, {
        actor: params.actor,
        action: "lead.update",
        entity: "Lead",
        entityId: leadId,
        diff: {
          ...(stageChanged ? { stage: { from: current.stage, to: row.stage } } : {}),
          notesChanged,
          ...(assigneeChanged
            ? { assignee: { from: current.assignedToUserId, to: row.assignedToUserId } }
            : {}),
        },
        ...(params.ipAddress ? { ip: params.ipAddress } : {}),
      });
      return row;
    });
    if (!updated) return null;
    return mapLeadToDetail(updated, await this.hasMarketingConsent(updated));
  }
}
