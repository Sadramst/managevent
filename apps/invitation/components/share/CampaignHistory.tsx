import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import type { MessagingStatus } from "@managevent/validators";
import { Badge } from "@/components/ui";
import { formatInstantShort } from "@/lib/guest-list/instants";

type Campaign = MessagingStatus["campaigns"][number];

const STATUS_TONE = {
  QUEUED: "neutral",
  SENDING: "neutral",
  SENT: "success",
  PARTIAL: "warning",
  FAILED: "danger",
} as const;

/** The emails sent for this event: invitations and reminders, newest first, with counts. */
export function CampaignHistory({
  campaigns,
  timeZone,
  copy,
}: {
  campaigns: readonly Campaign[];
  timeZone: string;
  copy: InvitationStudioGuestsCopy["share"]["history"];
}) {
  return (
    <div className="table-wrap" tabIndex={0}>
      <table className="table">
        <caption>{copy.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.when}</th>
            <th scope="col">{copy.kind}</th>
            <th scope="col">{copy.status}</th>
            <th scope="col" className="cell-num">
              {copy.total}
            </th>
            <th scope="col" className="cell-num">
              {copy.sent}
            </th>
            <th scope="col" className="cell-num">
              {copy.failed}
            </th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <th scope="row" className="num">
                {formatInstantShort(campaign.createdAt, timeZone)}
              </th>
              <td>{copy.kinds[campaign.kind]}</td>
              <td>
                <Badge tone={STATUS_TONE[campaign.status]}>{copy.statuses[campaign.status]}</Badge>
              </td>
              <td className="cell-num">{campaign.counts.total}</td>
              <td className="cell-num">{campaign.counts.sent}</td>
              <td className="cell-num">{campaign.counts.failed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
