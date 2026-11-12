import { getInvitationShell } from "@managevent/i18n";
import { LoadingBlock } from "@/components/ui/Spinner";

/**
 * Shown under the event header and tabs while one of the event's pages loads its data.
 *
 * It lives here, not in `app/studio`, on purpose: a loading boundary above the event layout
 * would start the response before that layout has asked the API for the event, and an event
 * that does not exist (or belongs to someone else) would then be a "not found" page served
 * with status 200. Here the layout answers first, so it is a real 404.
 */
export default function StudioLoading() {
  return <LoadingBlock label={getInvitationShell("en").ui.loading} />;
}
