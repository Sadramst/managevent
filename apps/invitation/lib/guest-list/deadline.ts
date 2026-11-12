import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import type { ResponsesSummary } from "@managevent/validators";
import { formatLocalDateTime } from "@/lib/dates";
import { fill } from "./fill";

/**
 * The sentence that says where replies stand against the reply-by date: none set, open (with
 * days to go), due today or closed.
 *
 * A memorial event states the date and time only, with no "days to go" count
 * (docs/design/MEMORIAL_MODE.md).
 */
export function deadlineText(
  copy: InvitationStudioGuestsCopy["responses"]["deadline"],
  deadline: ResponsesSummary["deadline"],
  memorial: boolean,
): string {
  const date = deadline.rsvpDeadlineLocal ? formatLocalDateTime(deadline.rsvpDeadlineLocal) : "";
  switch (deadline.state) {
    case "NONE":
      return copy.NONE;
    case "OPEN":
      if (memorial || deadline.days === null) return fill(copy.openMemorial, { date });
      return fill(deadline.days === 1 ? copy.openOne : copy.OPEN, { date, days: deadline.days });
    case "DUE_TODAY":
      return fill(copy.DUE_TODAY, { date });
    case "CLOSED":
      return fill(copy.CLOSED, { date });
  }
}
