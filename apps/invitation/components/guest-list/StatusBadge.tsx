import { Check, CircleDashed, CircleHelp, X } from "lucide-react";
import { Badge } from "@/components/ui";
import type { RsvpStatus } from "@/lib/guest-list/view";

export type StatusLabels = Record<RsvpStatus, string>;

const TONE = {
  YES: "success",
  NO: "neutral",
  MAYBE: "warning",
  PENDING: "primary",
} as const;

const ICON = {
  YES: Check,
  NO: X,
  MAYBE: CircleHelp,
  PENDING: CircleDashed,
} as const;

/**
 * A reply status as a chip: an icon and the words, with colour only as support, so it reads
 * the same in greyscale and to a screen reader. Works in server and client components.
 */
export function StatusBadge({ status, labels }: { status: RsvpStatus; labels: StatusLabels }) {
  const Icon = ICON[status];
  return (
    <Badge tone={TONE[status]}>
      <Icon className="icon" aria-hidden="true" />
      {labels[status]}
    </Badge>
  );
}
