import { DomainError, LISTING_ERROR_CODES } from "./types";

export class Price {
  private constructor(
    readonly amount: number,
    readonly currency: "TMT" | "USD" | "AED",
  ) {}

  static create(amount: number, currency: "TMT" | "USD" | "AED"): Price {
    if (amount <= 0) {
      throw new DomainError(
        LISTING_ERROR_CODES.INVALID_PRICE,
        "Price amount must be greater than 0",
      );
    }
    return new Price(amount, currency);
  }

  equals(other: Price): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
