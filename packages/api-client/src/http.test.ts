import { describe, expect, it } from "vitest";
import { z, ZodError } from "zod";
import {
  apiPath,
  createApiClient,
  createHttpClient,
  isApiError,
  ManageventApiClientError,
} from "./index.js";

const UUID = "0192b400-0000-7000-8000-000000000001";
const EVENT_ID = `evt_${UUID}`;
const PARTY_ID = `pty_${UUID}`;
const GUEST_ID = `gst_${UUID}`;
const NOW = "2026-11-12T02:30:00.000Z";

interface Recorded {
  method: string;
  url: string;
  headers: Headers;
  body: unknown;
  init: RequestInit;
}

/** A fetch that records every call and answers from `respond`. */
function recordingFetch(respond: (call: Recorded) => Response) {
  const calls: Recorded[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const call: Recorded = {
      method: init?.method ?? "GET",
      url: String(input),
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
      init: init ?? {},
    };
    calls.push(call);
    return respond(call);
  };
  return { calls, fetchImpl };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const notFound = () =>
  json({ error: { code: "NOT_FOUND", message: "Not found", requestId: "req_nf" } }, 404);

const minimalContent = {
  version: 1,
  headline: "Sara & Ali",
  hosts: "The Ahmadi family",
  venue: null,
  coverImageUrl: null,
  music: { url: null, title: null, rightsAttested: false },
};

const eventDetail = {
  id: EVENT_ID,
  title: "Sara & Ali",
  ceremonySlug: "wedding",
  experienceMode: "CELEBRATION",
  status: "DRAFT",
  startsAt: "2027-03-20T08:00:00.000Z",
  startsAtLocal: "2027-03-20T16:00",
  timeZone: "Australia/Perth",
  role: "OWNER",
  counts: { parties: 0, guests: 0, yes: 0, pending: 0 },
  updatedAt: NOW,
  endsAt: null,
  endsAtLocal: null,
  invitation: {
    id: `inv_${UUID}`,
    eventSlug: "sara-ali-wedding-7kq2",
    templateSlug: "royal-classic",
    themeId: "royal-ivory",
    gateStyle: "wax-seal",
    plan: "FREE",
    effectivePlan: "FREE",
    isDemo: false,
    publishedAt: null,
    rsvpDeadline: null,
    rsvpDeadlineLocal: null,
    allowForwarding: true,
    wellMode: "NONE",
    content: minimalContent,
    rsvpConfig: {},
    wellConfig: {},
    previewPath: null,
    updatedAt: NOW,
  },
  checklist: { hasWording: false, hasVenue: false, hasGuests: false, published: false },
};

const planView = {
  plan: "FREE",
  effectivePlan: "FREE",
  experienceMode: "CELEBRATION",
  memorialComplimentary: false,
  entitlements: {
    plan: "FREE",
    label: "Free Invitation",
    priceIncGstCents: 0,
    maxGuests: 30,
    maxEmailInvitations: 50,
    allThemesAndAnimations: false,
    rsvpAndDietary: true,
    rsvpReminders: false,
    customEventSlug: false,
    fullMusicLibraryAndUpload: false,
    allGateStyles: false,
    qrPassesAndCheckin: false,
    livePhotoWallAndDisplay: false,
    wellAndTributeExport: false,
    bulkSmsAndWhatsapp: false,
    pinProtection: false,
    removeBranding: false,
    automaticLogisticsBridge: false,
  },
  usage: { guests: 0, guestLimit: 30, emailsSent: 0, emailLimit: 50 },
  upgrade: {
    available: false,
    unavailableReason: "PAYMENTS_NOT_CONFIGURED",
    priceIncGstCents: 6900,
    gstCents: 627,
    currency: "AUD",
  },
};

describe("http client", () => {
  it("forwards cookie, client IP, user agent, bearer token and default headers; never caches", async () => {
    const { calls, fetchImpl } = recordingFetch(() => json({ ok: true }));
    const http = createHttpClient({
      baseUrl: "http://api.test/",
      bearerToken: "tok_123",
      cookie: "managevent.session_token=abc",
      forwardedFor: "203.0.113.7",
      userAgent: "Mozilla/5.0 Test",
      defaultHeaders: { "x-request-id": "req_from_next" },
      fetchImpl,
    });

    await http.json({
      method: "POST",
      path: "/v1/thing",
      body: { a: 1 },
      schema: z.object({ ok: z.boolean() }),
      options: { idempotencyKey: "idem-1", headers: { "x-extra": "1" } },
    });

    const call = calls[0];
    expect(call?.url).toBe("http://api.test/v1/thing");
    expect(call?.method).toBe("POST");
    expect(call?.headers.get("cookie")).toBe("managevent.session_token=abc");
    expect(call?.headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(call?.headers.get("user-agent")).toBe("Mozilla/5.0 Test");
    expect(call?.headers.get("authorization")).toBe("Bearer tok_123");
    expect(call?.headers.get("x-request-id")).toBe("req_from_next");
    expect(call?.headers.get("idempotency-key")).toBe("idem-1");
    expect(call?.headers.get("x-extra")).toBe("1");
    expect(call?.headers.get("content-type")).toBe("application/json");
    expect(call?.headers.get("accept")).toBe("application/json");
    expect(call?.body).toEqual({ a: 1 });
    expect((call?.init as { cache?: string }).cache).toBe("no-store");
    expect(call?.init.credentials).toBe("include");
  });

  it("sends the proxy secret only alongside a forwarded client IP", async () => {
    const saved = process.env.API_PROXY_SECRET;
    const headersOf = async (options: Parameters<typeof createHttpClient>[0]) => {
      const { calls, fetchImpl } = recordingFetch(() => json({ ok: true }));
      const http = createHttpClient({ baseUrl: "http://api.test", ...options, fetchImpl });
      await http.json({ method: "GET", path: "/v1/thing", schema: z.object({ ok: z.boolean() }) });
      return calls[0]?.headers;
    };
    try {
      delete process.env.API_PROXY_SECRET;
      // Explicit secret with a forwarded address: both headers go out.
      const explicit = await headersOf({
        forwardedFor: "203.0.113.7",
        proxySecret: "s3cret-value",
      });
      expect(explicit?.get("x-forwarded-for")).toBe("203.0.113.7");
      expect(explicit?.get("x-managevent-proxy-secret")).toBe("s3cret-value");
      // Nothing to vouch for: the secret is not sent.
      expect(
        (await headersOf({ proxySecret: "s3cret-value" }))?.has("x-managevent-proxy-secret"),
      ).toBe(false);
      expect(
        (await headersOf({ forwardedFor: "203.0.113.7" }))?.has("x-managevent-proxy-secret"),
      ).toBe(false);

      // A server process picks the secret up from its environment.
      process.env.API_PROXY_SECRET = "from-the-environment";
      const fromEnv = await headersOf({ forwardedFor: "203.0.113.7" });
      expect(fromEnv?.get("x-managevent-proxy-secret")).toBe("from-the-environment");
      expect((await headersOf({}))?.has("x-managevent-proxy-secret")).toBe(false);
    } finally {
      if (saved === undefined) delete process.env.API_PROXY_SECRET;
      else process.env.API_PROXY_SECRET = saved;
    }
  });

  it("omits credentials when asked, sends no body or content-type on GET, and builds query strings", async () => {
    const { calls, fetchImpl } = recordingFetch(() => json({ ok: true }));
    const http = createHttpClient({
      baseUrl: "http://api.test",
      includeCredentials: false,
      fetchImpl,
    });
    await http.json({
      method: "GET",
      path: "/v1/list",
      query: { status: "PENDING", limit: 25, includeHealth: false, q: undefined, tag: "a b&c" },
      schema: z.object({ ok: z.boolean() }),
    });
    expect(calls[0]?.url).toBe(
      "http://api.test/v1/list?status=PENDING&limit=25&includeHealth=false&tag=a+b%26c",
    );
    expect(calls[0]?.init.credentials).toBeUndefined();
    expect(calls[0]?.init.body).toBeUndefined();
    expect(calls[0]?.headers.get("content-type")).toBeNull();
    expect(calls[0]?.headers.get("authorization")).toBeNull();
    expect(calls[0]?.headers.get("cookie")).toBeNull();

    await http.json({ method: "GET", path: "/v1/list", query: {}, schema: z.unknown() });
    expect(calls[1]?.url).toBe("http://api.test/v1/list");
  });

  it("URL-encodes path segments", () => {
    expect(apiPath`/v1/events/${EVENT_ID}`).toBe(`/v1/events/${EVENT_ID}`);
    expect(apiPath`/v1/i/${"a/b"}/${"t?x=1#y"}/status`).toBe("/v1/i/a%2Fb/t%3Fx%3D1%23y/status");
    expect(apiPath`/v1/i/${"../../admin"}/${"x"}`).toBe("/v1/i/..%2F..%2Fadmin/x");
  });

  it("maps API error envelopes, non-JSON errors and network failures to ManageventApiClientError", async () => {
    const envelope = createHttpClient({
      baseUrl: "http://api.test",
      fetchImpl: async () =>
        json(
          {
            error: {
              code: "PUBLISH_REQUIREMENTS_NOT_MET",
              message: "Not ready",
              details: { missing: ["VENUE"] },
              requestId: "req_1",
            },
          },
          422,
        ),
    });
    const failure = await envelope
      .json({ method: "POST", path: "/x", schema: z.unknown() })
      .catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(ManageventApiClientError);
    expect(failure).toMatchObject({
      status: 422,
      code: "PUBLISH_REQUIREMENTS_NOT_MET",
      requestId: "req_1",
      details: { missing: ["VENUE"] },
    });
    expect(isApiError(failure)).toBe(true);
    expect(isApiError(failure, "PUBLISH_REQUIREMENTS_NOT_MET")).toBe(true);
    expect(isApiError(failure, "NOT_FOUND")).toBe(false);
    expect(isApiError(new Error("x"))).toBe(false);
    expect(isApiError(null, "NOT_FOUND")).toBe(false);

    const gateway = createHttpClient({
      baseUrl: "http://api.test",
      fetchImpl: async () =>
        new Response("<html>Bad Gateway</html>", {
          status: 502,
          headers: { "x-request-id": "req_gw" },
        }),
    });
    await expect(
      gateway.json({ method: "GET", path: "/x", schema: z.unknown() }),
    ).rejects.toMatchObject({ status: 502, code: "HTTP_502", requestId: "req_gw" });

    const offline = createHttpClient({
      baseUrl: "http://api.test",
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });
    const network = await offline
      .json({ method: "GET", path: "/x", schema: z.unknown() })
      .catch((err: unknown) => err);
    expect(network).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
    expect(isApiError(network, "NETWORK_ERROR")).toBe(true);
    await expect(offline.void({ method: "DELETE", path: "/x" })).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("lets an aborted request surface as the abort, not as a network error", async () => {
    const controller = new AbortController();
    const http = createHttpClient({
      baseUrl: "http://api.test",
      fetchImpl: async (_input, init) => {
        controller.abort();
        throw init?.signal?.reason ?? new Error("aborted");
      },
    });
    const result = await http
      .json({
        method: "GET",
        path: "/x",
        schema: z.unknown(),
        options: { signal: controller.signal },
      })
      .catch((err: unknown) => err);
    expect(isApiError(result)).toBe(false);
    expect((result as Error).name).toBe("AbortError");
  });

  it("validates responses and rejects a 2xx body that is not JSON", async () => {
    const wrongShape = createHttpClient({
      baseUrl: "http://api.test",
      fetchImpl: async () => json({ ok: "yes" }),
    });
    await expect(
      wrongShape.json({ method: "GET", path: "/x", schema: z.object({ ok: z.boolean() }) }),
    ).rejects.toBeInstanceOf(ZodError);

    const html = createHttpClient({
      baseUrl: "http://api.test",
      fetchImpl: async () => new Response("<html></html>", { status: 200 }),
    });
    await expect(
      html.json({ method: "GET", path: "/x", schema: z.unknown() }),
    ).rejects.toMatchObject({ status: 200, code: "HTTP_200" });
  });

  it("handles 204 responses and text downloads with a filename", async () => {
    const { calls, fetchImpl } = recordingFetch((call) =>
      call.method === "DELETE"
        ? new Response(null, { status: 204 })
        : new Response("\uFEFFParty Name,Guest Name\r\n", {
            status: 200,
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "content-disposition": 'attachment; filename="guests-sara-ali.csv"',
            },
          }),
    );
    const http = createHttpClient({ baseUrl: "http://api.test", fetchImpl });
    await expect(http.void({ method: "DELETE", path: "/v1/x" })).resolves.toBeUndefined();

    const download = await http.text({ method: "GET", path: "/v1/export.csv" });
    expect(download.contentType).toBe("text/csv; charset=utf-8");
    expect(download.filename).toBe("guests-sara-ali.csv");
    expect(download.body).toContain("Party Name,Guest Name");
    // The byte order mark the server sent is still the first character.
    expect(download.body.charCodeAt(0)).toBe(0xfeff);
    expect(download.body.slice(1)).toBe("Party Name,Guest Name\r\n");
    expect(calls[1]?.headers.get("accept")).toContain("text/csv");

    const encoded = createHttpClient({
      baseUrl: "http://api.test",
      fetchImpl: async () =>
        new Response("x", {
          headers: { "content-disposition": "attachment; filename*=UTF-8''g%C3%A4ste.csv" },
        }),
    });
    expect((await encoded.text({ method: "GET", path: "/x" })).filename).toBe("gäste.csv");
    const none = createHttpClient({
      baseUrl: "http://api.test",
      fetchImpl: async () => new Response("x"),
    });
    expect((await none.text({ method: "GET", path: "/x" })).filename).toBeNull();
  });
});

describe("client resources: me, events, billing", () => {
  function clientWith(respond: (call: Recorded) => Response) {
    const recorder = recordingFetch(respond);
    return {
      calls: recorder.calls,
      client: createApiClient({ baseUrl: "http://api.test", fetchImpl: recorder.fetchImpl }),
    };
  }

  it("me.get parses the signed-out shape", async () => {
    const { calls, client } = clientWith(() =>
      json({
        user: null,
        capabilities: {
          emailPassword: true,
          magicLink: false,
          passwordReset: false,
          emailInvitations: false,
          stripeCheckout: false,
        },
      }),
    );
    const me = await client.me.get();
    expect(me.user).toBeNull();
    expect(me.capabilities.stripeCheckout).toBe(false);
    expect(`${calls[0]?.method} ${calls[0]?.url}`).toBe("GET http://api.test/v1/me");
  });

  it("events: every method uses the agreed verb and path and returns parsed detail", async () => {
    const { calls, client } = clientWith((call) => {
      if (call.method === "DELETE") return new Response(null, { status: 204 });
      if (call.method === "GET" && call.url.endsWith("/v1/events")) {
        const { endsAt: _a, endsAtLocal: _b, checklist: _c, invitation, ...summary } = eventDetail;
        return json({
          items: [
            {
              ...summary,
              invitation: {
                id: invitation.id,
                eventSlug: invitation.eventSlug,
                templateSlug: invitation.templateSlug,
                themeId: invitation.themeId,
                plan: invitation.plan,
                effectivePlan: invitation.effectivePlan,
                publishedAt: invitation.publishedAt,
              },
            },
          ],
        });
      }
      return json(
        eventDetail,
        call.method === "POST" && call.url.endsWith("/v1/events") ? 201 : 200,
      );
    });

    const list = await client.events.list();
    expect(list.items).toHaveLength(1);

    const created = await client.events.create({
      title: "Sara & Ali",
      ceremonySlug: "wedding",
      startsAtLocal: "2027-03-20T16:00",
      templateSlug: "royal-classic",
      hosts: "The Ahmadi family",
    });
    // Response defaults are applied by the schema.
    expect(created.invitation.content.subheadline).toBe("");
    expect(created.invitation.rsvpConfig.askDietary).toBe(true);
    // Request defaults are applied before sending.
    expect(calls[1]?.body).toMatchObject({ timeZone: "Australia/Perth" });

    await client.events.get(EVENT_ID);
    await client.events.update(EVENT_ID, { title: "New title" });
    await client.events.updateInvitation(EVENT_ID, { themeId: "alabaster-platinum" });
    await client.events.publish(EVENT_ID);
    await client.events.unpublish(EVENT_ID);
    await expect(client.events.remove(EVENT_ID)).resolves.toBeUndefined();

    expect(
      calls.map((call) => `${call.method} ${call.url.replace("http://api.test", "")}`),
    ).toEqual([
      "GET /v1/events",
      "POST /v1/events",
      `GET /v1/events/${EVENT_ID}`,
      `PATCH /v1/events/${EVENT_ID}`,
      `PATCH /v1/events/${EVENT_ID}/invitation`,
      `POST /v1/events/${EVENT_ID}/invitation/publish`,
      `POST /v1/events/${EVENT_ID}/invitation/unpublish`,
      `DELETE /v1/events/${EVENT_ID}`,
    ]);
    expect(calls[3]?.body).toEqual({ title: "New title" });
    expect(calls[4]?.body).toEqual({ themeId: "alabaster-platinum" });
  });

  it("events: invalid input is rejected before any request is made", async () => {
    const { calls, client } = clientWith(() => json(eventDetail));
    await expect(
      client.events.create({
        title: "",
        ceremonySlug: "wedding",
        startsAtLocal: "2027-03-20T16:00",
        templateSlug: "royal-classic",
        hosts: "The Ahmadi family",
      }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      client.events.update(EVENT_ID, { startsAtLocal: "2027-03-20T16:00:00Z" }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(calls).toHaveLength(0);
  });

  it("billing: plan, checkout with a required idempotency key, and confirm", async () => {
    const { calls, client } = clientWith((call) =>
      call.url.endsWith("/plan/checkout")
        ? json({ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_1" }, 201)
        : json(planView),
    );

    const plan = await client.billing.getPlan(EVENT_ID);
    expect(plan.upgrade.unavailableReason).toBe("PAYMENTS_NOT_CONFIGURED");

    const session = await client.billing.createCheckout(EVENT_ID, { idempotencyKey: "idem-co-1" });
    expect(session.checkoutUrl).toBe("https://checkout.stripe.com/c/pay/cs_test_1");
    expect(calls[1]?.headers.get("idempotency-key")).toBe("idem-co-1");
    expect(calls[1]?.body).toEqual({});

    await client.billing.confirmCheckout(EVENT_ID, { sessionId: "cs_test_a1b2c3" });
    expect(calls[2]?.body).toEqual({ sessionId: "cs_test_a1b2c3" });
    await expect(
      client.billing.confirmCheckout(EVENT_ID, { sessionId: "x" }),
    ).rejects.toBeInstanceOf(ZodError);

    expect(
      calls.map((call) => `${call.method} ${call.url.replace("http://api.test", "")}`),
    ).toEqual([
      `GET /v1/events/${EVENT_ID}/plan`,
      `POST /v1/events/${EVENT_ID}/plan/checkout`,
      `POST /v1/events/${EVENT_ID}/plan/checkout/confirm`,
    ]);
  });

  it("billing: a 503 from an unconfigured provider is reported as such", async () => {
    const { client } = clientWith(() =>
      json(
        {
          error: {
            code: "PAYMENTS_NOT_CONFIGURED",
            message: "Payments are not configured",
            requestId: "req_503",
          },
        },
        503,
      ),
    );
    const err = await client.billing
      .createCheckout(EVENT_ID, { idempotencyKey: "idem-co-2" })
      .catch((e: unknown) => e);
    expect(isApiError(err, "PAYMENTS_NOT_CONFIGURED")).toBe(true);
    expect((err as ManageventApiClientError).status).toBe(503);
  });
});

describe("client resources: every contract method maps to its route", () => {
  it("guestSite, checkIn, well, guestList, responses, messaging and leads", async () => {
    // The API answers 404 to everything: this pins verbs and paths, not response shapes.
    const { calls, fetchImpl } = recordingFetch(() => notFound());
    const client = createApiClient({ baseUrl: "http://api.test", fetchImpl });
    const slug = "sara-ali-wedding-7kq2";
    const token = "the-smith-family-7kq2m9xp";
    const entryId = `wel_${UUID}`;
    const leadId = `lead_${UUID}`;
    const idem = { idempotencyKey: "idem-12345678" };

    const requests: Array<[string, () => Promise<unknown>]> = [
      [`GET /v1/i/${slug}/${token}/status`, () => client.guestSite.getStatus(slug, token)],
      [`GET /v1/i/${slug}/${token}`, () => client.guestSite.getView(slug, token)],
      [
        `POST /v1/i/${slug}/${token}/rsvp`,
        () =>
          client.guestSite.submitRsvp(
            slug,
            token,
            { members: [{ guestId: GUEST_ID, status: "YES" }] },
            idem,
          ),
      ],
      [`GET /v1/i/${slug}/${token}/passes`, () => client.guestSite.getPasses(slug, token)],
      [`GET /v1/i/${slug}/${token}/calendar`, () => client.guestSite.getCalendar(slug, token)],
      [
        `POST /v1/i/${slug}/${token}/wishes`,
        () => client.guestSite.submitWish(slug, token, { authorName: "Sam", message: "Congrats" }),
      ],
      ["GET /v1/public/demos", () => client.guestSite.listDemos()],
      ["POST /v1/public/legacy/resolve", () => client.guestSite.resolveLegacy("/anniversary/x")],

      [`GET /v1/events/${EVENT_ID}/check-in`, () => client.checkIn.getRoster(EVENT_ID)],
      [
        `POST /v1/events/${EVENT_ID}/check-in/scans`,
        () =>
          client.checkIn.scan(EVENT_ID, {
            method: "MANUAL",
            guestId: GUEST_ID,
            deviceId: "door-1",
            scannedAt: NOW,
            clientUuid: UUID,
          }),
      ],

      [
        `GET /v1/events/${EVENT_ID}/well-entries?moderation=PENDING`,
        () => client.well.list(EVENT_ID, { moderation: "PENDING" }),
      ],
      [`GET /v1/events/${EVENT_ID}/well-entries`, () => client.well.list(EVENT_ID)],
      [
        `PATCH /v1/events/${EVENT_ID}/well-entries/${entryId}`,
        () => client.well.moderate(EVENT_ID, entryId, { moderation: "APPROVED" }),
      ],
      [
        `DELETE /v1/events/${EVENT_ID}/well-entries/${entryId}`,
        () => client.well.remove(EVENT_ID, entryId),
      ],

      [
        `GET /v1/events/${EVENT_ID}/parties?status=PENDING&limit=200`,
        () => client.guestList.listParties(EVENT_ID, { status: "PENDING" }),
      ],
      [
        `POST /v1/events/${EVENT_ID}/parties`,
        () => client.guestList.createParty(EVENT_ID, { displayName: "The Smith family" }, idem),
      ],
      [
        `PATCH /v1/events/${EVENT_ID}/parties/${PARTY_ID}`,
        () => client.guestList.updateParty(EVENT_ID, PARTY_ID, { tableLabel: null }),
      ],
      [
        `DELETE /v1/events/${EVENT_ID}/parties/${PARTY_ID}`,
        () => client.guestList.removeParty(EVENT_ID, PARTY_ID),
      ],
      [
        `POST /v1/events/${EVENT_ID}/parties/${PARTY_ID}/revoke-link`,
        () => client.guestList.revokeLink(EVENT_ID, PARTY_ID),
      ],
      [
        `POST /v1/events/${EVENT_ID}/parties/${PARTY_ID}/reissue-link`,
        () => client.guestList.reissueLink(EVENT_ID, PARTY_ID),
      ],
      [
        `POST /v1/events/${EVENT_ID}/parties/${PARTY_ID}/guests`,
        () => client.guestList.addGuest(EVENT_ID, PARTY_ID, { name: "Jo Smith" }),
      ],
      [
        `PATCH /v1/events/${EVENT_ID}/parties/${PARTY_ID}/guests/${GUEST_ID}`,
        () => client.guestList.updateGuest(EVENT_ID, PARTY_ID, GUEST_ID, { isChild: true }),
      ],
      [
        `DELETE /v1/events/${EVENT_ID}/parties/${PARTY_ID}/guests/${GUEST_ID}`,
        () => client.guestList.removeGuest(EVENT_ID, PARTY_ID, GUEST_ID),
      ],
      [
        `PUT /v1/events/${EVENT_ID}/parties/${PARTY_ID}/rsvp`,
        () =>
          client.guestList.setRsvp(EVENT_ID, PARTY_ID, {
            members: [{ guestId: GUEST_ID, status: "YES" }],
          }),
      ],
      [
        `POST /v1/events/${EVENT_ID}/guests/import`,
        () => client.guestList.importCsv(EVENT_ID, { csv: "name\nJo" }),
      ],
      [
        `GET /v1/events/${EVENT_ID}/guests/export.csv?includeHealth=true`,
        () => client.guestList.exportCsv(EVENT_ID, { includeHealth: true }),
      ],
      [`GET /v1/events/${EVENT_ID}/guests/export.csv`, () => client.guestList.exportCsv(EVENT_ID)],

      [`GET /v1/events/${EVENT_ID}/responses`, () => client.responses.getSummary(EVENT_ID)],
      [`GET /v1/events/${EVENT_ID}/responses/dietary`, () => client.responses.getDietary(EVENT_ID)],

      [`GET /v1/events/${EVENT_ID}/messaging`, () => client.messaging.getStatus(EVENT_ID)],
      [
        `POST /v1/events/${EVENT_ID}/messaging/email-invitations`,
        () =>
          client.messaging.sendEmailInvitations(
            EVENT_ID,
            { partyIds: "ALL", consentAttested: true },
            idem,
          ),
      ],
      [
        `POST /v1/events/${EVENT_ID}/messaging/rsvp-reminders`,
        () =>
          client.messaging.sendRsvpReminders(
            EVENT_ID,
            { partyIds: [PARTY_ID], consentAttested: true },
            idem,
          ),
      ],
      [
        "POST /v1/public/unsubscribe",
        () => client.messaging.unsubscribe({ token: "t".repeat(40) }),
      ],

      ["GET /v1/leads?stage=NEW&limit=50", () => client.leads.list({ stage: "NEW" })],
      [`GET /v1/leads/${leadId}`, () => client.leads.get(leadId)],
      [`PATCH /v1/leads/${leadId}`, () => client.leads.update(leadId, { stage: "QUALIFIED" })],
    ];

    for (const [expected, run] of requests) {
      const before = calls.length;
      const err = await run().catch((e: unknown) => e);
      expect(isApiError(err, "NOT_FOUND"), expected).toBe(true);
      const call = calls[before];
      expect(`${call?.method} ${call?.url.replace("http://api.test", "")}`).toBe(expected);
    }
    expect(calls).toHaveLength(requests.length);

    // Idempotency keys reach the wire where the contract requires them.
    const byPath = (suffix: string) => calls.find((call) => call.url.endsWith(suffix));
    expect(byPath("/rsvp")?.headers.get("idempotency-key")).toBe("idem-12345678");
    expect(byPath("/email-invitations")?.headers.get("idempotency-key")).toBe("idem-12345678");
    expect(byPath("/rsvp-reminders")?.headers.get("idempotency-key")).toBe("idem-12345678");
    expect(byPath(`/events/${EVENT_ID}/parties`)?.headers.get("idempotency-key")).toBe(
      "idem-12345678",
    );
    // Request defaults are filled in before sending.
    expect(byPath("/guests/import")?.body).toEqual({ csv: "name\nJo", dryRun: true });
    expect(byPath("/wishes")?.body).toEqual({
      authorName: "Sam",
      message: "Congrats",
      shareOnWall: false,
    });
    expect(byPath("/legacy/resolve")?.body).toEqual({ path: "/anniversary/x" });
  });

  it("refuses invalid guest input locally, without calling the API", async () => {
    const { calls, fetchImpl } = recordingFetch(() => notFound());
    const client = createApiClient({ baseUrl: "http://api.test", fetchImpl });
    await expect(
      client.guestSite.submitRsvp(
        "sara-ali-wedding-7kq2",
        "the-smith-family-7kq2m9xp",
        {
          members: [{ guestId: GUEST_ID, status: "YES", health: { dietary: ["HALAL"] } }],
        },
        { idempotencyKey: "idem-12345678" },
      ),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      client.messaging.sendEmailInvitations(
        EVENT_ID,
        { partyIds: [], consentAttested: true },
        { idempotencyKey: "idem-12345678" },
      ),
    ).rejects.toBeInstanceOf(ZodError);
    expect(calls).toHaveLength(0);
  });
});
