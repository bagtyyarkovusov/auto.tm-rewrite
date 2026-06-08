export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "DomainError";
  }
}

export const CONTENT_REPORT_ERROR_CODES = {
  INVALID_REASON_FOR_TARGET: "INVALID_REASON_FOR_TARGET",
  OTHER_REASON_REQUIRES_DETAILS: "OTHER_REASON_REQUIRES_DETAILS",
  DETAILS_TOO_LONG: "DETAILS_TOO_LONG",
  SELF_REPORT_NOT_ALLOWED: "SELF_REPORT_NOT_ALLOWED",
} as const;
