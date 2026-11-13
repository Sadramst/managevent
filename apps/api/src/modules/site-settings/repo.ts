/** `SiteSetting` persistence: one row with the fixed id `site`. */
import type { DbTx } from "../../lib/deps.js";

/** The only row. A constant id makes the upsert a single atomic statement. */
export const SITE_SETTING_ID = "site";

export interface SiteSettingRow {
  contactEmail: string | null;
  contactPhone: string | null;
  notificationEmail: string | null;
  updatedAt: Date;
}

const SELECT = {
  contactEmail: true,
  contactPhone: true,
  notificationEmail: true,
  updatedAt: true,
} as const;

export async function findSiteSetting(client: DbTx): Promise<SiteSettingRow | null> {
  return client.siteSetting.findUnique({ where: { id: SITE_SETTING_ID }, select: SELECT });
}

export async function saveSiteSetting(
  client: DbTx,
  values: { contactEmail: string; contactPhone: string; notificationEmail: string | null },
  updatedByUserId: string | null,
): Promise<SiteSettingRow> {
  const data = { ...values, updatedByUserId };
  return client.siteSetting.upsert({
    where: { id: SITE_SETTING_ID },
    create: { id: SITE_SETTING_ID, ...data },
    update: data,
    select: SELECT,
  });
}
