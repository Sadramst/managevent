"use server";

import { randomUUID } from "node:crypto";
import { createApiClient } from "@managevent/api-client";
import { EnabledLocaleSchema, LeadCreateSchema } from "@managevent/validators";

export interface EnquiryState {
  status: "idle" | "invalid" | "sent" | "failed";
  fields?: string[];
}

export async function submitEnquiry(
  _previous: EnquiryState,
  data: FormData,
): Promise<EnquiryState> {
  const value = (key: string) => String(data.get(key) ?? "").trim();
  const locale = EnabledLocaleSchema.safeParse(value("preferredLanguage"));
  const unknownDate = data.get("dateFlexible") === "true";
  const date = value("eventDate");
  if (!unknownDate && !date) return { status: "invalid", fields: ["eventDate"] };
  const parsed = LeadCreateSchema.safeParse({
    source: "CONTACT_FORM",
    name: value("name"),
    email: value("email"),
    ...(value("phone") ? { phone: value("phone") } : {}),
    preferredLanguage: locale.success ? locale.data : value("preferredLanguage"),
    ceremonySlug: value("ceremonySlug") || undefined,
    eventDate: !unknownDate && date ? `${date}T00:00:00.000Z` : undefined,
    dateFlexible: unknownDate,
    ...(value("guestEstimate") ? { guestEstimate: Number(value("guestEstimate")) } : {}),
    message: value("message") || undefined,
    marketingConsent: data.get("marketingConsent") === "on",
    websiteUrl: value("websiteUrl"),
  });
  if (!parsed.success) {
    return {
      status: "invalid",
      fields: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
    };
  }
  try {
    const api = createApiClient({ baseUrl: process.env.API_URL || "http://localhost:4000" });
    await api.createLead(parsed.data, { idempotencyKey: randomUUID() });
    return { status: "sent" };
  } catch {
    return { status: "failed" };
  }
}
