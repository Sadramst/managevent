import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import { Notice } from "@/components/ui";
import { fill } from "@/lib/guest-list/fill";
import { PremiumPointer, type PremiumPointerProps } from "./PremiumPointer";

export type PremiumInfo = Omit<PremiumPointerProps, "copy">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** `{ limit, used }` from the `details` of a `PLAN_LIMIT_EXCEEDED` failure, when it sent them. */
export function readLimitDetails(
  details: unknown,
  usedKey: "current" | "used" = "current",
): { limit: number; used: number } | null {
  if (!isRecord(details)) return null;
  const limit = details.limit;
  const used = details[usedKey];
  return typeof limit === "number" && typeof used === "number" ? { limit, used } : null;
}

export interface PlanLimitNoticeProps {
  /** The plan's guest limit and how many guests are on the list now. */
  limit: number;
  used: number;
  copy: InvitationStudioGuestsCopy["guests"]["limit"];
  premiumCopy: InvitationStudioGuestsCopy["common"]["premium"];
  /** Null hides the Premium pointer (memorial events never see an upsell). */
  premium: PremiumInfo | null;
  role?: "alert" | "status";
}

/**
 * Explains a refused add: what the free plan covers, how much room is left and where Premium
 * is. Shown after the API answers `PLAN_LIMIT_EXCEEDED`.
 */
export function PlanLimitNotice({
  limit,
  used,
  copy,
  premiumCopy,
  premium,
  role = "alert",
}: PlanLimitNoticeProps) {
  return (
    <Notice tone="warning" role={role} title={copy.exceededTitle}>
      <p>{fill(copy.exceeded, { limit, used, room: Math.max(limit - used, 0) })}</p>
      {premium ? <PremiumPointer {...premium} copy={premiumCopy} /> : null}
    </Notice>
  );
}
