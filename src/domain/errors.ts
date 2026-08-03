export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "stale_version"
  | "integration_unconfigured"
  | "invalid_transition";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    if (details) {
      this.details = details;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
