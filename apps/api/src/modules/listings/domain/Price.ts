import { DomainError, LISTING_ERROR_CODES, type Currency } from "./types";

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

/**
 * The stored TMT price that orders and bounds the feed. `rateToTmt` is the
 * `<currency> -> TMT` rate (1 for TMT). Mirrors `recomputeListingPricesTmt`.
 */
export function toPriceTmt(amount: number, currency: Currency, rateToTmt: number): number {
  if (currency === "TMT") return amount;
  if (!(rateToTmt > 0)) {
    throw new DomainError(
      LISTING_ERROR_CODES.EXCHANGE_RATE_MISSING,
      `Exchange rate from ${currency} to TMT is not available`,
    );
  }
  return amount * rateToTmt;
}
