/**
 * Per-user and per-session daily AI quota manager (`ADR-0009` & `WEBSITE.md` §A6.5).
 */

export class AiQuotaExceededError extends Error {
  public readonly subjectKey: string;
  public readonly dailyLimit: number;

  constructor(subjectKey: string, dailyLimit: number) {
    super(`Daily AI quota of ${dailyLimit} requests exceeded for '${subjectKey}'`);
    this.name = "AiQuotaExceededError";
    this.subjectKey = subjectKey;
    this.dailyLimit = dailyLimit;
  }
}

export interface AiQuotaOptions {
  authenticatedDailyLimit?: number;
  anonymousDailyLimit?: number;
}

export class AiQuotaManager {
  private readonly authenticatedDailyLimit: number;
  private readonly anonymousDailyLimit: number;
  private readonly counts = new Map<string, { dayKey: string; count: number }>();

  constructor(options: AiQuotaOptions = {}) {
    this.authenticatedDailyLimit = options.authenticatedDailyLimit ?? 25;
    this.anonymousDailyLimit = options.anonymousDailyLimit ?? 5;
  }

  /**
   * Consumes 1 request from the actor's daily quota or throws `AiQuotaExceededError`.
   */
  consume(params: { subjectKey: string; isAnonymous?: boolean; now?: Date }): {
    remaining: number;
    limit: number;
  } {
    const now = params.now ?? new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const limit = params.isAnonymous ? this.anonymousDailyLimit : this.authenticatedDailyLimit;
    const mapKey = `${params.isAnonymous ? "anon" : "user"}:${params.subjectKey}`;

    const existing = this.counts.get(mapKey);
    const currentCount = existing && existing.dayKey === dayKey ? existing.count : 0;

    if (currentCount >= limit) {
      throw new AiQuotaExceededError(params.subjectKey, limit);
    }

    const nextCount = currentCount + 1;
    this.counts.set(mapKey, { dayKey, count: nextCount });

    return {
      remaining: limit - nextCount,
      limit,
    };
  }
}
