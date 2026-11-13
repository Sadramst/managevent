import { isApiError } from "@managevent/api-client";
import { fillCopy, getAdminPages } from "@managevent/i18n";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteSettingsForm } from "../../../../components/admin-settings-form";
import { formatPerthDateTime, signInHref } from "../../../../lib/admin/leads";
import { getServerApi, requireStaff } from "../../../../lib/admin/server";

const copy = getAdminPages("en");

export const metadata: Metadata = { title: copy.settings.metaTitle };

/** The public contact details and the enquiry-alert address, editable by any staff member. */
export default async function SettingsPage() {
  await requireStaff();

  let settings: Awaited<
    ReturnType<Awaited<ReturnType<typeof getServerApi>>["siteSettings"]["getAdmin"]>
  >;
  try {
    settings = await (await getServerApi()).siteSettings.getAdmin();
  } catch (err) {
    // The session ended, or the role was removed, between the session check and this call.
    if (isApiError(err, "UNAUTHENTICATED")) {
      redirect(signInHref({ reason: "session", next: "/admin/settings" }));
    }
    if (isApiError(err, "FORBIDDEN")) redirect(signInHref({ reason: "staff" }));
    throw err;
  }

  return (
    <main id="main" className="wrap console-main">
      <header className="page-header">
        <div>
          <p className="eyebrow">{copy.settings.eyebrow}</p>
          <h1 className="page-title">{copy.settings.title}</h1>
          <p className="console-header-lead">{copy.settings.lead}</p>
          <div className="console-meta">
            <p data-testid="settings-updated">
              {settings.updatedAt
                ? fillCopy(copy.settings.lastSaved, {
                    date: formatPerthDateTime(settings.updatedAt),
                  })
                : copy.settings.neverSaved}
            </p>
          </div>
        </div>
      </header>

      <div className="console-detail console-settings">
        <div className="console-column">
          <SiteSettingsForm initial={settings} copy={copy.settings} errors={copy.errors} />
        </div>
      </div>
    </main>
  );
}
