/**
 * Staff-editable public settings (`SiteSetting`): the contact details shown on www and the
 * address that receives new-enquiry alerts.
 */
import { z } from "zod";

/** A display phone number: digits with an optional leading `+`, spaces, hyphens and brackets. */
export const SitePhoneSchema = z
  .string()
  .trim()
  .max(24)
  .refine((value) => value === "" || /^(\+|\()?[0-9][0-9 ()-]{6,22}$/.test(value), {
    message: "Enter a phone number such as 0412 345 678, or leave it blank to hide it",
  });

/** What every visitor may see: no auth, no internal fields. */
export const PublicSiteSettingsSchema = z.object({
  contactEmail: z.string().email(),
  /** Empty string means "no public phone number". */
  contactPhone: z.string(),
});

/** What staff see: the effective values plus the alert address and when it last changed. */
export const AdminSiteSettingsSchema = z.object({
  contactEmail: z.string().email(),
  contactPhone: z.string(),
  /** Where new-enquiry alerts go. Equals `contactEmail` when staff have not set one. */
  notificationEmail: z.string().email(),
  /** True when `notificationEmail` was set by staff rather than following `contactEmail`. */
  notificationEmailIsCustom: z.boolean(),
  /** Null until staff first save. */
  updatedAt: z.string().datetime().nullable(),
});

/** A save replaces all three fields, so the form and the API always agree. */
export const SiteSettingsUpdateSchema = z.object({
  contactEmail: z.string().trim().toLowerCase().email().max(254),
  contactPhone: SitePhoneSchema,
  /** Empty means "follow the contact email". */
  notificationEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(254)]),
});

export type PublicSiteSettings = z.infer<typeof PublicSiteSettingsSchema>;
export type AdminSiteSettings = z.infer<typeof AdminSiteSettingsSchema>;
export type SiteSettingsUpdate = z.infer<typeof SiteSettingsUpdateSchema>;

/** The public contact email until staff change it. */
export const DEFAULT_CONTACT_EMAIL = "appilico.au@gmail.com";

/** The environment variables that supply first-run defaults. */
export interface SiteSettingsEnv {
  CONTACT_EMAIL?: string | undefined;
  CONTACT_PHONE?: string | undefined;
  /** The older enquiry-alert address; still honoured until staff set one in the console. */
  LEAD_NOTIFICATION_EMAIL?: string | undefined;
}

/** The stored row, or null before staff first save. `null` columns mean "not set". */
export interface SiteSettingsRow {
  contactEmail: string | null;
  contactPhone: string | null;
  notificationEmail: string | null;
  updatedAt: Date;
}

const clean = (value: string | null | undefined): string => (value ?? "").trim();

/**
 * The settings in force: a value staff saved wins; otherwise the environment's first-run default;
 * otherwise the built-in default. A phone that staff blanked on purpose stays blank.
 */
export function resolveSiteSettings(
  row: SiteSettingsRow | null,
  env: SiteSettingsEnv = {},
): AdminSiteSettings {
  const contactEmail =
    clean(row?.contactEmail) || clean(env.CONTACT_EMAIL) || DEFAULT_CONTACT_EMAIL;
  const contactPhone =
    row?.contactPhone !== null && row?.contactPhone !== undefined
      ? row.contactPhone.trim()
      : clean(env.CONTACT_PHONE);
  const customAlert = clean(row?.notificationEmail);
  return {
    contactEmail,
    contactPhone,
    notificationEmail: customAlert || clean(env.LEAD_NOTIFICATION_EMAIL) || contactEmail,
    notificationEmailIsCustom: customAlert.length > 0,
    updatedAt: row ? row.updatedAt.toISOString() : null,
  };
}
