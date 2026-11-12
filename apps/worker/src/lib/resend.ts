/**
 * Email delivery through Resend's HTTP API.
 *
 * There is one adapter and no mock: when `RESEND_API_KEY` is not set, `createResendAdapterFromEnv`
 * returns null and each job records that honestly (nothing is reported as sent). Tests inject a
 * fake `fetch`. Recipient addresses and message bodies are never logged.
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 15_000;
const DEFAULT_FROM = "Managevent <hello@managevent.com.au>";

export interface ResendEmailPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
}

export interface ResendEmailAdapter {
  /** Sends one email. `idempotencyKey` makes a retry safe: Resend will not deliver it twice. */
  sendEmail(payload: ResendEmailPayload, idempotencyKey?: string): Promise<{ id: string }>;
}

/** A provider rejection. Carries the HTTP status only, never the recipient. */
export class ResendDeliveryError extends Error {
  public readonly status: number;

  constructor(status: number) {
    super(`Resend delivery failed (${status})`);
    this.name = "ResendDeliveryError";
    this.status = status;
  }
}

export interface ResendAdapterOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  /** Extra attempts after a 429 or 5xx answer. */
  maxRetries?: number;
  /** Waits between attempts; replaced in tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Seconds from a `retry-after` header, capped so one recipient cannot stall a campaign. */
function retryDelayMs(response: Response, attempt: number): number {
  const header = Number(response.headers.get("retry-after"));
  const seconds = Number.isFinite(header) && header > 0 ? header : 2 ** attempt;
  return Math.min(seconds, 10) * 1000;
}

export class ResendAdapter implements ResendEmailAdapter {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: ResendAdapterOptions) {
    if (options.apiKey.trim().length === 0) throw new Error("RESEND_API_KEY is required");
    this.apiKey = options.apiKey.trim();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxRetries = options.maxRetries ?? 2;
    this.sleep = options.sleep ?? defaultSleep;
  }

  async sendEmail(payload: ResendEmailPayload, idempotencyKey?: string): Promise<{ id: string }> {
    for (let attempt = 0; ; attempt += 1) {
      const response = await this.fetchImpl(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: payload.from,
          to: [payload.to],
          subject: payload.subject,
          text: payload.text,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });

      if (response.ok) {
        const result: unknown = await response.json().catch(() => null);
        if (
          !result ||
          typeof result !== "object" ||
          !("id" in result) ||
          typeof result.id !== "string" ||
          result.id.length === 0
        ) {
          throw new Error("Invalid Resend delivery response");
        }
        return { id: result.id };
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= this.maxRetries) throw new ResendDeliveryError(response.status);
      await this.sleep(retryDelayMs(response, attempt));
    }
  }
}

function resendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key ? key : null;
}

export function isEmailConfigured(): boolean {
  return resendApiKey() !== null;
}

/** The real adapter when `RESEND_API_KEY` is set, otherwise null (email is not configured). */
export function createResendAdapterFromEnv(fetchImpl?: typeof fetch): ResendEmailAdapter | null {
  const apiKey = resendApiKey();
  if (!apiKey) return null;
  return new ResendAdapter({ apiKey, ...(fetchImpl ? { fetchImpl } : {}) });
}

/** Sender for account and enquiry emails. */
export function transactionalFromAddress(): string {
  return process.env.EMAIL_FROM_TRANSACTIONAL?.trim() || DEFAULT_FROM;
}

/** Sender for invitation and reminder emails. */
export function invitationsFromAddress(): string {
  return process.env.EMAIL_FROM_INVITATIONS?.trim() || transactionalFromAddress();
}
