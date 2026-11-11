/**
 * @managevent/admin
 *
 * Domain & workflow engine for the Managevent Planner & Admin Command Centre:
 * - CRM lead lifecycle transitions with mandatory staff audit records
 * - ATO GST & Marketplace 12% commission pipeline calculations (integer AUD cents)
 * - APP 3 sensitive health/dietary data masking & click-to-reveal audit logging
 */

import { getExperienceMode } from "@managevent/i18n";
import { assertIntegerCents, divRoundHalfUp, splitIncGstCents } from "@managevent/payments";
import type { CeremonyFamily, ExperienceMode, LeadStage, Role } from "@managevent/types";

export type AdminStaffRole = Extract<Role, "PLANNER_STAFF" | "SUPER_ADMIN">;

export interface AdminAuditRecord {
  readonly action:
    "LEAD_STAGE_UPDATED" | "DIETARY_HEALTH_REVEALED" | "VENDOR_VERIFIED" | "LEAD_CREATED";
  readonly actorRole: AdminStaffRole;
  readonly targetId: string;
  readonly summary: string;
  readonly timestampIso: string;
}

export interface AdminLeadItem {
  readonly id: string;
  readonly fullName: string;
  readonly email?: string;
  readonly phone?: string;
  readonly ceremonySlug: string;
  readonly ceremonyFamily: CeremonyFamily;
  readonly experienceMode: ExperienceMode;
  readonly guestEstimate: number;
  readonly estimatedQuoteIncGstCents: number;
  readonly stage: LeadStage;
}

export interface AdminPipelineFinancialSummary {
  readonly activeLeadCount: number;
  readonly bookedLeadCount: number;
  readonly grossPipelineIncGstCents: number;
  readonly netPipelineExGstCents: number;
  readonly gstComponentCents: number;
  readonly projectedCommissionIncGstCents: number;
}

const ALLOWED_ADMIN_ROLES: ReadonlySet<Role> = new Set<Role>(["PLANNER_STAFF", "SUPER_ADMIN"]);

/**
 * Ensures the caller holds an authorised internal staff role (`PLANNER_STAFF` or `SUPER_ADMIN`).
 */
export function assertAdminStaffRole(role: Role): asserts role is AdminStaffRole {
  if (!ALLOWED_ADMIN_ROLES.has(role)) {
    throw new Error(`Role ${role} is not authorised for Admin Command Centre operations.`);
  }
}

/**
 * Creates a new CRM lead record in the Admin Command Centre and derives its `ExperienceMode`
 * (`CELEBRATION` or `MEMORIAL`) via the shared `getExperienceMode()` contract.
 */
export function createAdminLeadRecord(params: {
  readonly id: string;
  readonly fullName: string;
  readonly email?: string;
  readonly phone?: string;
  readonly ceremonySlug: string;
  readonly ceremonyFamily: CeremonyFamily;
  readonly guestEstimate: number;
  readonly estimatedQuoteIncGstCents: number;
  readonly actorRole: Role;
  readonly now?: Date;
}): { readonly lead: AdminLeadItem; readonly audit: AdminAuditRecord } {
  assertAdminStaffRole(params.actorRole);
  assertIntegerCents(params.estimatedQuoteIncGstCents, "estimatedQuoteIncGstCents");

  const experienceMode = getExperienceMode({
    family: params.ceremonyFamily,
    ceremonySlug: params.ceremonySlug,
  });

  const lead: AdminLeadItem = {
    id: params.id,
    fullName: params.fullName.trim(),
    ...(params.email ? { email: params.email.trim() } : {}),
    ...(params.phone ? { phone: params.phone.trim() } : {}),
    ceremonySlug: params.ceremonySlug,
    ceremonyFamily: params.ceremonyFamily,
    experienceMode,
    guestEstimate: Math.max(1, Math.trunc(params.guestEstimate)),
    estimatedQuoteIncGstCents: params.estimatedQuoteIncGstCents,
    stage: "NEW",
  };

  const audit: AdminAuditRecord = {
    action: "LEAD_CREATED",
    actorRole: params.actorRole,
    targetId: lead.id,
    summary: `Created lead ${lead.id} (${lead.ceremonySlug}, ${String(lead.guestEstimate)} guests, mode=${lead.experienceMode})`,
    timestampIso: (params.now ?? new Date()).toISOString(),
  };

  return { lead, audit };
}

/**
 * Transitions a CRM lead to a new `LeadStage` and returns the updated lead plus an immutable audit log entry.
 */
export function transitionLeadStage(params: {
  readonly lead: AdminLeadItem;
  readonly nextStage: LeadStage;
  readonly actorRole: Role;
  readonly now?: Date;
}): { readonly lead: AdminLeadItem; readonly audit: AdminAuditRecord } {
  assertAdminStaffRole(params.actorRole);

  const updatedLead: AdminLeadItem = {
    ...params.lead,
    stage: params.nextStage,
  };

  const audit: AdminAuditRecord = {
    action: "LEAD_STAGE_UPDATED",
    actorRole: params.actorRole,
    targetId: params.lead.id,
    summary: `Lead ${params.lead.id} transitioned ${params.lead.stage} -> ${params.nextStage}`,
    timestampIso: (params.now ?? new Date()).toISOString(),
  };

  return { lead: updatedLead, audit };
}

/**
 * Computes ATO GST (10% inclusive split) and projected 12% Marketplace commission across active CRM leads.
 * Excludes `LOST` leads from active pipeline totals.
 */
export function computeAdminPipelineFinancials(
  leads: readonly AdminLeadItem[],
): AdminPipelineFinancialSummary {
  const activeLeads = leads.filter((lead) => lead.stage !== "LOST");
  const bookedLeads = activeLeads.filter((lead) => lead.stage === "BOOKED");

  let grossPipelineIncGstCents = 0;
  for (const lead of activeLeads) {
    assertIntegerCents(lead.estimatedQuoteIncGstCents, "lead.estimatedQuoteIncGstCents");
    grossPipelineIncGstCents += lead.estimatedQuoteIncGstCents;
  }

  const { amountExGstCents, gstCents } = splitIncGstCents(grossPipelineIncGstCents);
  const projectedCommissionIncGstCents = divRoundHalfUp(grossPipelineIncGstCents * 12, 100);

  return {
    activeLeadCount: activeLeads.length,
    bookedLeadCount: bookedLeads.length,
    grossPipelineIncGstCents,
    netPipelineExGstCents: amountExGstCents,
    gstComponentCents: gstCents,
    projectedCommissionIncGstCents,
  };
}

/**
 * Masks sensitive dietary & allergy health information by default in compliance with APP 3.
 */
export function maskDietaryHealthSummary(): string {
  return "•••••• (Masked — APP 3 Sensitive Health Info)";
}

/**
 * Reveals sensitive dietary & allergy health information for authorised catering operations and emits an audit entry.
 */
export function revealDietaryHealthSummary(params: {
  readonly eventId: string;
  readonly rawDietarySummary: string;
  readonly actorRole: Role;
  readonly now?: Date;
}): { readonly revealedSummary: string; readonly audit: AdminAuditRecord } {
  assertAdminStaffRole(params.actorRole);

  return {
    revealedSummary: params.rawDietarySummary,
    audit: {
      action: "DIETARY_HEALTH_REVEALED",
      actorRole: params.actorRole,
      targetId: params.eventId,
      summary: `Dietary & allergy health summary revealed for catering run-sheet on event ${params.eventId}`,
      timestampIso: (params.now ?? new Date()).toISOString(),
    },
  };
}
