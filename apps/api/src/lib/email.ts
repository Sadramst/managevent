/**
 * Transactional email through Resend's HTTP API.
 *
 * There is no mock transport. Without `RESEND_API_KEY` nothing is sent and callers get
 * `503 EMAIL_NOT_CONFIGURED`; `GET /v1/me` reports the same fact through `capabilities`.
 * Recipient addresses and message bodies are never logged.
 */
import { ApiProblem } from "./errors.js";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Managevent <hello@managevent.com.au>";
const SEND_TIMEOUT_MS = 15_000;

function resendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key ? key : null;
}

export function isEmailConfigured(): boolean {
  return resendApiKey() !== null;
}

export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
  /** Forwarded to Resend as `Idempotency-Key`, so a retry cannot send twice. */
  idempotencyKey?: string;
}

/**
 * Sends one plain-text email. Throws `ApiProblem(503, "EMAIL_NOT_CONFIGURED")` when no provider is
 * configured, and a generic `Error` (status only, no recipient) when the provider rejects it.
 *
 * @param transport - `fetch` override for tests; production always uses the global `fetch`.
 */
export async function sendTransactionalEmail(
  i: TransactionalEmail,
  transport: { fetchImpl?: typeof fetch } = {},
): Promise<{ providerId: string }> {
  const apiKey = resendApiKey();
  if (!apiKey) {
    throw new ApiProblem(503, "EMAIL_NOT_CONFIGURED", "Email sending is not configured");
  }
  const fetchImpl = transport.fetchImpl ?? fetch;

  const response = await fetchImpl(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(i.idempotencyKey ? { "idempotency-key": i.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM_TRANSACTIONAL?.trim() || DEFAULT_FROM,
      to: [i.to],
      subject: i.subject,
      text: i.text,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Email provider rejected the message (HTTP ${response.status})`);
  }
  const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
  if (!body || typeof body.id !== "string" || body.id.length === 0) {
    throw new Error("Email provider returned no message id");
  }
  return { providerId: body.id };
}
