/**
 * `client.leads`: the staff CRM inbox.
 *
 * Owner: Engineer 3. Paths and schemas follow the contract; adjust here if a route changes.
 */
import {
  type LeadDetail,
  LeadDetailSchema,
  type LeadList,
  type LeadListQueryInput,
  LeadListQuerySchema,
  LeadListSchema,
  type LeadUpdate,
  LeadUpdateSchema,
} from "@managevent/validators";
import { apiPath, type HttpClient } from "../http.js";

export function createLeadsResource(http: HttpClient) {
  return {
    /** `GET /v1/leads` */
    async list(q?: LeadListQueryInput): Promise<LeadList> {
      return http.json({
        method: "GET",
        path: "/v1/leads",
        query: LeadListQuerySchema.parse(q ?? {}),
        schema: LeadListSchema,
      });
    },

    /** `GET /v1/leads/{leadId}` */
    async get(leadId: string): Promise<LeadDetail> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/leads/${leadId}`,
        schema: LeadDetailSchema,
      });
    },

    /** `PATCH /v1/leads/{leadId}` */
    async update(leadId: string, input: LeadUpdate): Promise<LeadDetail> {
      return http.json({
        method: "PATCH",
        path: apiPath`/v1/leads/${leadId}`,
        body: LeadUpdateSchema.parse(input),
        schema: LeadDetailSchema,
      });
    },
  };
}
