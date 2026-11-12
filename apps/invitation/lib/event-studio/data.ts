import "server-only";

import { isApiError } from "@managevent/api-client";
import type { HostEventDetail, PlanView, ResponsesSummary } from "@managevent/validators";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getServerApi } from "@/lib/server-api";

/**
 * `GET /v1/events/{eventId}` once per request: the event layout and the page under it share the
 * one call. A rejected call is shared too, so both see the same answer.
 */
const fetchEvent = cache(async (eventId: string): Promise<HostEventDetail> => {
  const api = await getServerApi();
  return api.events.get(eventId);
});

/**
 * The event for a studio page. An event that does not exist, or that this host may not read,
 * is a real not-found page (the API answers 404 for both, never 403).
 */
export async function loadEvent(eventId: string): Promise<HostEventDetail> {
  try {
    return await fetchEvent(eventId);
  } catch (err) {
    if (isApiError(err, "NOT_FOUND") || isApiError(err, "VALIDATION_ERROR")) notFound();
    throw err;
  }
}

/** `GET /v1/events/{eventId}/plan`, shared within one request. */
export const loadPlan = cache(async (eventId: string): Promise<PlanView> => {
  const api = await getServerApi();
  return api.billing.getPlan(eventId);
});

/**
 * The reply summary, or null when it cannot be read right now. The overview still renders
 * without it; the Responses tab is where a failure is reported.
 */
export async function loadSummaryOptional(eventId: string): Promise<ResponsesSummary | null> {
  try {
    const api = await getServerApi();
    return await api.responses.getSummary(eventId);
  } catch (err) {
    if (isApiError(err, "UNAUTHENTICATED")) throw err;
    return null;
  }
}
