import "server-only";

import type { DemoInvitation } from "@managevent/validators";
import { getServerApi } from "@/lib/server-api";

export interface DemoGallery {
  /** One sample invitation per template, in catalogue order. Empty when unavailable. */
  items: DemoInvitation[];
  /** False when the API could not be reached, so the page can say so plainly. */
  available: boolean;
}

/**
 * The sample invitations for the public gallery (`GET /v1/public/demos`). Public pages must
 * still render when the API is down, so a failure reads as "no samples" rather than an error.
 *
 * Only the list is read here. The pages never fetch the guest view of a sample to decorate a
 * card: that endpoint is rate limited per link, and the samples must stay open for visitors.
 */
export async function loadDemos(): Promise<DemoGallery> {
  try {
    const api = await getServerApi();
    const { items } = await api.guestSite.listDemos();
    return { items, available: true };
  } catch {
    return { items: [], available: false };
  }
}
