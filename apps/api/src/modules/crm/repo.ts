/**
 * CRM repository (`Lead` and `ConsentRecord` persistence via `@managevent/db`).
 * Route handlers never call Prisma directly; all DB access goes through repository methods.
 */
import { db, type ExtendedDbClient, generateId, Prisma } from "@managevent/db";
import type { LeadCreate, LeadResponse } from "@managevent/types";

export interface CreateLeadPersistenceParams {
  input: LeadCreate;
  idempotencyKey?: string;
  ipAddress?: string;
}

function mapLeadToResponse(row: {
  id: string;
  stage: LeadResponse["stage"];
  source: LeadResponse["source"];
  name: string;
  email: string;
  phone: string | null;
  preferredLanguage: string;
  preferredChannel: LeadResponse["preferredChannel"];
  ceremonySlug: string | null;
  eventDate: Date | null;
  dateFlexible: boolean;
  guestEstimate: number | null;
  area: string | null;
  estimateId: string | null;
  marketingConsentId: string | null;
  createdAt: Date;
}): LeadResponse {
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
    let marketingConsentId: string | null = null;

    if (params.input.marketingConsent) {
      const consentId = generateId("cns_");
      await this.client.consentRecord.create({
        data: {
          id: consentId,
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
      marketingConsentId = consentId;
    }

    const created = await this.client.lead.create({
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
}
