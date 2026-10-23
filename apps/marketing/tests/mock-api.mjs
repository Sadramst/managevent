import { createServer } from "node:http";

createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.url !== "/v1/leads" || request.method !== "POST") {
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }
  let body = "";
  for await (const chunk of request) body += String(chunk);
  const input = JSON.parse(body);
  response.statusCode = 201;
  response.end(
    JSON.stringify({
      id: "lead_0192b400-0000-7000-8000-000000000001",
      stage: "NEW",
      source: input.source,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      preferredLanguage: input.preferredLanguage,
      preferredChannel: "EMAIL",
      ceremonySlug: input.ceremonySlug ?? null,
      eventDate: input.eventDate ?? null,
      dateFlexible: input.dateFlexible,
      guestEstimate: input.guestEstimate ?? null,
      area: null,
      estimateId: null,
      marketingConsentId: null,
      createdAt: new Date().toISOString(),
    }),
  );
}).listen(4101, "127.0.0.1");
