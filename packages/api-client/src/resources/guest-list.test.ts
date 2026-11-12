import { describe, expect, it } from "vitest";
import { createApiClient, isApiError } from "../index.js";

const EVENT_ID = "evt_0192b400-0000-7000-8000-000000000001";
const BOM_BYTES = [0xef, 0xbb, 0xbf];

/** What the API sends: UTF-8 bytes that start with a byte order mark. */
function csvResponse(text: string, headers: Record<string, string> = {}): Response {
  const body = new Uint8Array([...BOM_BYTES, ...new TextEncoder().encode(text)]);
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/csv; charset=utf-8", ...headers },
  });
}

describe("client.guestList.exportCsv", () => {
  it("returns the CSV with its byte order mark and the file name from the response", async () => {
    const urls: string[] = [];
    const client = createApiClient({
      baseUrl: "http://api.test",
      fetchImpl: async (input) => {
        urls.push(String(input));
        return csvResponse('"Party Name","Guest Name"\r\n"Müller","Zoë"\r\n', {
          "content-disposition": 'attachment; filename="guests-sara-ali-k7m2-2026-11-12.csv"',
        });
      },
    });

    const result = await client.guestList.exportCsv(EVENT_ID, { includeHealth: true });
    expect(urls).toEqual([
      `http://api.test/v1/events/${EVENT_ID}/guests/export.csv?includeHealth=true`,
    ]);
    expect(result.filename).toBe("guests-sara-ali-k7m2-2026-11-12.csv");
    // Decoding the response as text removes the mark; the client restores exactly one.
    expect(result.csv).toBe('\uFEFF"Party Name","Guest Name"\r\n"Müller","Zoë"\r\n');
    expect([...new TextEncoder().encode(result.csv).slice(0, 3)]).toEqual(BOM_BYTES);
  });

  it("falls back to a file name and sends no query when no option is given", async () => {
    const urls: string[] = [];
    const client = createApiClient({
      baseUrl: "http://api.test",
      fetchImpl: async (input) => {
        urls.push(String(input));
        return csvResponse('"Party Name"\r\n');
      },
    });
    const result = await client.guestList.exportCsv(EVENT_ID);
    expect(urls).toEqual([`http://api.test/v1/events/${EVENT_ID}/guests/export.csv`]);
    expect(result.filename).toBe("guests.csv");
    expect(result.csv.startsWith("\uFEFF")).toBe(true);
    expect(result.csv.startsWith("\uFEFF\uFEFF")).toBe(false);
  });

  it("raises the API error when health columns are refused", async () => {
    const client = createApiClient({
      baseUrl: "http://api.test",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ error: { code: "FORBIDDEN", message: "No", requestId: "req_1" } }),
          { status: 403, headers: { "content-type": "application/json" } },
        ),
    });
    const failure = await client.guestList
      .exportCsv(EVENT_ID, { includeHealth: true })
      .catch((err: unknown) => err);
    expect(isApiError(failure, "FORBIDDEN")).toBe(true);
  });
});
