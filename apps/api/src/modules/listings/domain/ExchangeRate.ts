import { DomainError, LISTING_ERROR_CODES } from "./types";
import type { Currency } from "./types";

export class ExchangeRate {
  private constructor(
    readonly id: string,
    readonly fromCurrency: Currency,
    readonly toCurrency: Currency,
    readonly rate: number,
    readonly updatedAt: Date,
    readonly setByUserId: string | undefined,
  ) {}

  static create(data: {
    id: string;
    fromCurrency: Currency;
    toCurrency: Currency;
    rate: number;
    updatedAt: Date;
    setByUserId?: string;
  }): ExchangeRate {
    if (data.rate <= 0) {
      throw new DomainError(
        LISTING_ERROR_CODES.INVALID_EXCHANGE_RATE,
        "Exchange rate must be greater than 0",
      );
    }
    return new ExchangeRate(
      data.id,
      data.fromCurrency,
      data.toCurrency,
      data.rate,
      data.updatedAt,
      data.setByUserId,
    );
  }
}
