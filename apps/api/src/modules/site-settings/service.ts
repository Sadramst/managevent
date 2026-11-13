/**
 * Public contact details and the enquiry-alert address, editable by staff.
 *
 * Reads resolve the stored row against the environment's first-run defaults, so a fresh install
 * works before anyone has saved anything. A save replaces all three values and writes one audit
 * row that names the fields that changed, never what they were changed to.
 */
import { type AuthActor, requirePermission } from "@managevent/auth";
import {
  type AdminSiteSettings,
  type PublicSiteSettings,
  resolveSiteSettings,
  type SiteSettingsEnv,
  type SiteSettingsUpdate,
} from "@managevent/validators";
import { writeAudit } from "../../lib/audit.js";
import type { ApiDeps } from "../../lib/deps.js";
import { findSiteSetting, SITE_SETTING_ID, saveSiteSetting } from "./repo.js";

/** The first-run defaults from the process environment, read per call so tests can change them. */
export function siteSettingsEnv(): SiteSettingsEnv {
  return {
    CONTACT_EMAIL: process.env.CONTACT_EMAIL,
    CONTACT_PHONE: process.env.CONTACT_PHONE,
    LEAD_NOTIFICATION_EMAIL: process.env.LEAD_NOTIFICATION_EMAIL,
  };
}

export class SiteSettingsService {
  constructor(private readonly deps: ApiDeps) {}

  /** What every visitor may see. */
  async getPublic(): Promise<PublicSiteSettings> {
    const { contactEmail, contactPhone } = resolveSiteSettings(
      await findSiteSetting(this.deps.db),
      siteSettingsEnv(),
    );
    return { contactEmail, contactPhone };
  }

  async getAdmin(actor: AuthActor | null): Promise<AdminSiteSettings> {
    requirePermission(actor, "site_settings:manage");
    return resolveSiteSettings(await findSiteSetting(this.deps.db), siteSettingsEnv());
  }

  async update(
    actor: AuthActor | null,
    input: SiteSettingsUpdate,
    ip?: string,
  ): Promise<AdminSiteSettings> {
    requirePermission(actor, "site_settings:manage");
    const env = siteSettingsEnv();
    return this.deps.db.$transaction(async (tx) => {
      const before = resolveSiteSettings(await findSiteSetting(tx), env);
      const row = await saveSiteSetting(
        tx,
        {
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          notificationEmail: input.notificationEmail === "" ? null : input.notificationEmail,
        },
        actor?.userId ?? null,
      );
      const after = resolveSiteSettings(row, env);
      await writeAudit(tx, {
        actor,
        action: "site_settings.update",
        entity: "SiteSetting",
        entityId: SITE_SETTING_ID,
        // Which fields changed, never their values: they are contact details.
        diff: {
          contactEmailChanged: before.contactEmail !== after.contactEmail,
          contactPhoneChanged: before.contactPhone !== after.contactPhone,
          notificationEmailChanged: before.notificationEmail !== after.notificationEmail,
        },
        ...(ip ? { ip } : {}),
      });
      return after;
    });
  }
}
