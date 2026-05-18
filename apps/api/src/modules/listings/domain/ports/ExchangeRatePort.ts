import type { Currency } from "../types";

export interface ExchangeRatePort {
  getRate(from: Currency, to: Currency): Promise<number>;
}

export const EXCHANGE_RATE_PORT = Symbol("ExchangeRatePort");
