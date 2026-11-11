import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describe, expect, it } from "vitest";
import { type ApiEnv, handleApiError, requestIdMiddleware } from "./context.js";

function buildApp(): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>();
  app.use("*", requestIdMiddleware());
  app.post("/json", async (c) => c.json(await c.req.json()));
  app.get("/teapot", () => {
    throw new HTTPException(418, { message: "teapot" });
  });
  app.onError((err, c) => handleApiError(err, c));
  return app;
}

describe("api middleware", () => {
  it("returns 400 in the error envelope for malformed JSON", async () => {
    const res = await buildApp().request("/json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.requestId).toBeTruthy();
  });

  it("preserves HTTPException status", async () => {
    const res = await buildApp().request("/teapot");
    expect(res.status).toBe(418);
  });

  it("accepts safe x-request-id and replaces unsafe or oversized ones", async () => {
    const app = buildApp();
    const ok = await app.request("/teapot", { headers: { "x-request-id": "abc-123_x.y" } });
    expect(ok.headers.get("x-request-id")).toBe("abc-123_x.y");
    const long = await app.request("/teapot", { headers: { "x-request-id": "a".repeat(200) } });
    expect(long.headers.get("x-request-id")).toMatch(/^req_/);
    const bad = await app.request("/teapot", { headers: { "x-request-id": "a b<script>" } });
    expect(bad.headers.get("x-request-id")).toMatch(/^req_/);
  });
});
