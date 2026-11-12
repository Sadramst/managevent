/**
 * `client.responses`: RSVP totals and the dietary matrix.
 *
 * Owner: Engineer 3. Paths and schemas follow the contract; adjust here if a route changes.
 */
import {
  type DietaryMatrix,
  DietaryMatrixSchema,
  type ResponsesSummary,
  ResponsesSummarySchema,
} from "@managevent/validators";
import { apiPath, type HttpClient } from "../http.js";

export function createResponsesResource(http: HttpClient) {
  return {
    /** `GET /v1/events/{eventId}/responses` */
    async getSummary(eventId: string): Promise<ResponsesSummary> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/events/${eventId}/responses`,
        schema: ResponsesSummarySchema,
      });
    },

    /** `GET /v1/events/{eventId}/responses/dietary`. 403 without `health:read`. */
    async getDietary(eventId: string): Promise<DietaryMatrix> {
      return http.json({
        method: "GET",
        path: apiPath`/v1/events/${eventId}/responses/dietary`,
        schema: DietaryMatrixSchema,
      });
    },
  };
}
