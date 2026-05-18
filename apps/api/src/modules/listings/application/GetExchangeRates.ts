import { Inject, Injectable } from "@nestjs/common";

import { ExchangeRatesSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import {
  EXCHANGE_RATE_PORT,
  type ExchangeRatePort,
} from "../domain/ports/ExchangeRatePort";

export type ExchangeRatesResponseDto = z.infer<typeof ExchangeRatesSchemas.ExchangeRatesResponseSchema>;

@Injectable()
export class GetExchangeRates {
  constructor(
    @Inject(EXCHANGE_RATE_PORT)
    private readonly exchangeRates: ExchangeRatePort,
  ) {}

  async execute(): Promise<ExchangeRatesResponseDto> {
    const rates = await this.exchangeRates.listAll();
    return {
      rates: rates.map((r) => ({
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        rate: r.rate,
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }
}
