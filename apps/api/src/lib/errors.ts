/**
 * The one error type services throw for an expected failure. `handleApiError` renders it as
 * `{ error: { code, message, details?, requestId } }` with the given HTTP status.
 *
 * Stable codes are listed in the contract (`NOT_FOUND`, `RSVP_CLOSED`, `FEATURE_NOT_IN_PLAN`, ...).
 * Messages are developer-facing; clients localise from the code.
 */
export class ApiProblem extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiProblem";
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

/** A neutral 404. Use for unknown ids and tokens so nothing about existence leaks. */
export function notFound(message = "Not found"): ApiProblem {
  return new ApiProblem(404, "NOT_FOUND", message);
}

/** 401 for a route that needs a session. */
export function unauthenticated(message = "Authentication is required"): ApiProblem {
  return new ApiProblem(401, "UNAUTHENTICATED", message);
}

/** True when a Prisma error is a unique-constraint violation (`P2002`). */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}
