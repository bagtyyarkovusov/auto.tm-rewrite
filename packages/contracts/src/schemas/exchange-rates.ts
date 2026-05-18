import { z } from "zod";

import { CurrencySchema } from "./listings";

export const ExchangeRateSchema = z.object({
  fromCurrency: CurrencySchema,
  toCurrency: CurrencySchema,
  rate: z.number().positive(),
  updatedAt: z.string().datetime(),
});
export type ExchangeRate = z.infer<typeof ExchangeRateSchema>;

export const ExchangeRatesResponseSchema = z.object({
  rates: z.array(ExchangeRateSchema),
});
export type ExchangeRatesResponse = z.infer<typeof ExchangeRatesResponseSchema>;
