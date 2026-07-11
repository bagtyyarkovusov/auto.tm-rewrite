export const INSPECTION_INTEREST_ERROR_CODES = {
  INVALID_WILLINGNESS_TO_PAY: "INVALID_WILLINGNESS_TO_PAY",
} as const;

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
