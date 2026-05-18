import type { Currency } from "../types";

export interface ExchangeRate {
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  updatedAt: Date;
}

export interface ExchangeRatePort {
  getRate(from: Currency, to: Currency): Promise<number>;
  listAll(): Promise<ExchangeRate[]>;
}

export const EXCHANGE_RATE_PORT = Symbol("ExchangeRatePort");
