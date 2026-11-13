"use server";

/**
 * Server actions for the staff console. Every action that touches enquiries first checks, on
 * that call, that the caller holds a staff session (`requireStaffForAction`), then calls the API
 * with the visitor's own cookie, where the role check (`lead:read`, `lead:write`) is enforced
 * again. Nothing here trusts a value from the form beyond passing it through validation.
 *
 * Failures come back as `ActionResult` with the API's stable error code. A lost session (401)
 * redirects to the sign-in page instead.
 */
import { isApiError } from "@managevent/api-client";
import { getAdminPages } from "@managevent/i18n";
import {
  type AdminSiteSettings,
  LeadIdSchema,
  LeadStageEnum,
  SiteSettingsUpdateSchema,
} from "@managevent/validators";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "../../lib/admin/action-result";
import { toActionFailure } from "../../lib/admin/api-failure";
import { CONTACT_CACHE_TAG } from "../../lib/contact";
import { loadCeremonyNames } from "../../lib/admin/ceremonies";
import {
  canMoveLeadStage,
  type InboxRow,
  inboxHref,
  leadHref,
  parseLeadCursor,
  parseSearchQuery,
  parseStageFilter,
  signInHref,
  toInboxRow,
} from "../../lib/admin/leads";
import {
  getServerApi,
  getStaffSession,
  isActionFailure,
  requireStaffForAction,
} from "../../lib/admin/server";

/** `LeadUpdateSchema` caps notes at this length. */
const NOTES_MAX_LENGTH = 5000;
const INBOX_PAGE_SIZE = 50;

export type LeadFormState = ActionResult<{ saved: true }> | null;

/** What the sign-in form learns after the browser holds a session cookie. */
export type StaffCheck = "staff" | "not-staff" | "no-session";

/**
 * Called by the sign-in form once Better Auth has set the session cookie: is this a staff
 * account? The form signs a non-staff account straight back out.
 */
export async function confirmStaffSession(): Promise<StaffCheck> {
  try {
    const session = await getStaffSession();
    if (session.status === "staff") return "staff";
    return session.status === "not-staff" ? "not-staff" : "no-session";
  } catch {
    return "no-session";
  }
}

/** The next page of the inbox, formatted exactly like the rows the server rendered. */
export async function loadMoreLeads(filter: {
  stage?: string;
  q?: string;
  cursor: string;
}): Promise<ActionResult<{ rows: InboxRow[]; nextCursor: string | null }>> {
  const stage = parseStageFilter(filter.stage);
  const q = parseSearchQuery(filter.q);
  const cursor = parseLeadCursor(filter.cursor);
  if (!cursor) return { ok: false, code: "VALIDATION_ERROR" };
  const staff = await requireStaffForAction(inboxHref({ stage, q }));
  if (isActionFailure(staff)) return staff;
  try {
    const api = await getServerApi();
    const page = await api.leads.list({ stage, q, cursor, limit: INBOX_PAGE_SIZE });
    const copy = getAdminPages("en");
    const names = loadCeremonyNames();
    return {
      ok: true,
      data: {
        rows: page.items.map((lead) => toInboxRow(lead, copy, names)),
        nextCursor: page.nextCursor,
      },
    };
  } catch (err) {
    if (isApiError(err, "UNAUTHENTICATED")) {
      redirect(signInHref({ reason: "session", next: inboxHref({ stage, q }) }));
    }
    return toActionFailure(err);
  }
}

type LeadUpdateInput = Parameters<Awaited<ReturnType<typeof getServerApi>>["leads"]["update"]>[1];

/**
 * Runs one lead update for a staff caller and maps the outcome. `leadId` has already been
 * validated. `input` may be built from the staff member the gate returned.
 */
async function updateLead(
  leadId: string,
  input: LeadUpdateInput | ((staff: { id: string }) => LeadUpdateInput),
): Promise<LeadFormState> {
  const staff = await requireStaffForAction(leadHref(leadId));
  if (isActionFailure(staff)) return staff;
  try {
    const api = await getServerApi();
    await api.leads.update(leadId, typeof input === "function" ? input(staff) : input);
  } catch (err) {
    if (isApiError(err, "UNAUTHENTICATED")) {
      redirect(signInHref({ reason: "session", next: leadHref(leadId) }));
    }
    return toActionFailure(err);
  }
  revalidatePath(leadHref(leadId));
  revalidatePath("/admin");
  return { ok: true, data: { saved: true } };
}

function leadIdOf(data: FormData): string | null {
  const parsed = LeadIdSchema.safeParse(data.get("leadId"));
  return parsed.success ? parsed.data : null;
}

/** Moves an enquiry to another stage. Only the moves the console offers are accepted. */
export async function updateLeadStage(
  _previous: LeadFormState,
  data: FormData,
): Promise<LeadFormState> {
  const leadId = leadIdOf(data);
  if (!leadId) return { ok: false, code: "NOT_FOUND" };
  const from = LeadStageEnum.safeParse(data.get("from"));
  const to = LeadStageEnum.safeParse(data.get("stage"));
  if (!from.success || !to.success || !canMoveLeadStage(from.data, to.data)) {
    return { ok: false, code: "INVALID_STAGE", fieldErrors: { stage: ["INVALID_STAGE"] } };
  }
  return updateLead(leadId, { stage: to.data });
}

/** Saves the internal notes. An empty box clears them. */
export async function saveLeadNotes(
  _previous: LeadFormState,
  data: FormData,
): Promise<LeadFormState> {
  const leadId = leadIdOf(data);
  if (!leadId) return { ok: false, code: "NOT_FOUND" };
  const raw = data.get("notes");
  // Browsers submit textarea line breaks as CRLF; count and store them as typed.
  const notes = (typeof raw === "string" ? raw : "").replace(/\r\n/g, "\n").trim();
  if (notes.length > NOTES_MAX_LENGTH) {
    return { ok: false, code: "NOTES_TOO_LONG", fieldErrors: { notes: ["NOTES_TOO_LONG"] } };
  }
  return updateLead(leadId, { notes: notes === "" ? null : notes });
}

/** Assigns the enquiry to the signed-in staff member, or removes the assignment. */
export async function assignLead(_previous: LeadFormState, data: FormData): Promise<LeadFormState> {
  const leadId = leadIdOf(data);
  if (!leadId) return { ok: false, code: "NOT_FOUND" };
  if (data.get("intent") === "unassign") return updateLead(leadId, { assignedToUserId: null });

  // The assignee is always the caller's own account, read from the session, never from the form.
  return updateLead(leadId, (staff) => ({ assignedToUserId: staff.id }));
}

export type SiteSettingsFormState = ActionResult<{
  saved: true;
  settings: AdminSiteSettings;
}> | null;

const SETTINGS_PATH = "/admin/settings";

/**
 * Saves the public contact details and the enquiry-alert address. The staff gate runs first;
 * the API checks the role again (`site_settings:manage`). On success the cached contact details
 * and the prerendered public pages are expired, so visitors see the change at once on this
 * server rather than after the cache time.
 */
export async function saveSiteSettings(
  _previous: SiteSettingsFormState,
  data: FormData,
): Promise<SiteSettingsFormState> {
  const staff = await requireStaffForAction(SETTINGS_PATH);
  if (isActionFailure(staff)) return staff;

  const text = (name: string) => {
    const value = data.get(name);
    return typeof value === "string" ? value : "";
  };
  const parsed = SiteSettingsUpdateSchema.safeParse({
    contactEmail: text("contactEmail"),
    contactPhone: text("contactPhone"),
    notificationEmail: text("notificationEmail"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      fieldErrors[field] = ["INVALID"];
    }
    return { ok: false, code: "VALIDATION_ERROR", fieldErrors };
  }

  let settings: AdminSiteSettings;
  try {
    settings = await (await getServerApi()).siteSettings.update(parsed.data);
  } catch (err) {
    if (isApiError(err, "UNAUTHENTICATED")) {
      redirect(signInHref({ reason: "session", next: SETTINGS_PATH }));
    }
    return toActionFailure(err);
  }
  updateTag(CONTACT_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: { saved: true, settings } };
}
