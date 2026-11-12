/**
 * `client.me`: who is signed in and what this deployment can do.
 */
import { type MeResponse, MeResponseSchema } from "@managevent/validators";
import type { HttpClient } from "../http.js";

export function createMeResource(http: HttpClient) {
  return {
    /** `GET /v1/me`. Never 401: `user` is null when signed out. */
    async get(): Promise<MeResponse> {
      return http.json({ method: "GET", path: "/v1/me", schema: MeResponseSchema });
    },
  };
}
