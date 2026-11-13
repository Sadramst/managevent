/**
 * `client.siteSettings`: the public contact details and the staff settings form.
 */
import {
  type AdminSiteSettings,
  AdminSiteSettingsSchema,
  type PublicSiteSettings,
  PublicSiteSettingsSchema,
  type SiteSettingsUpdate,
  SiteSettingsUpdateSchema,
} from "@managevent/validators";
import type { HttpClient } from "../http.js";

export function createSiteSettingsResource(http: HttpClient) {
  return {
    /** `GET /v1/site-settings`: no sign-in. */
    async getPublic(): Promise<PublicSiteSettings> {
      return http.json({
        method: "GET",
        path: "/v1/site-settings",
        schema: PublicSiteSettingsSchema,
      });
    },

    /** `GET /v1/admin/site-settings`: staff only. */
    async getAdmin(): Promise<AdminSiteSettings> {
      return http.json({
        method: "GET",
        path: "/v1/admin/site-settings",
        schema: AdminSiteSettingsSchema,
      });
    },

    /** `PUT /v1/admin/site-settings`: staff only; replaces all three values. */
    async update(input: SiteSettingsUpdate): Promise<AdminSiteSettings> {
      return http.json({
        method: "PUT",
        path: "/v1/admin/site-settings",
        body: SiteSettingsUpdateSchema.parse(input),
        schema: AdminSiteSettingsSchema,
      });
    },
  };
}
