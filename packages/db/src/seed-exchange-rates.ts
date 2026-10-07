export interface ExchangeRateSeed {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}

export interface ExchangeRateSeedDeps {
  findExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRateSeed | null>;
  createExchangeRate(rate: ExchangeRateSeed): Promise<void>;
}

export interface ExchangeRateSeedResult {
  created: number;
  alreadyPresent: number;
}

/**
 * Seeds the catalog exchange rates: creates pairs that are missing and leaves
 * existing pairs untouched, so a rate an admin changed from the admin panel is
 * never silently reverted by a re-run of the catalog seed.
 */
export async function seedExchangeRates(
  deps: ExchangeRateSeedDeps,
  catalog: readonly ExchangeRateSeed[],
): Promise<ExchangeRateSeedResult> {
  let created = 0;
  let alreadyPresent = 0;
  for (const er of catalog) {
    const existing = await deps.findExchangeRate(er.fromCurrency, er.toCurrency);
    if (existing) {
      alreadyPresent++;
      continue;
    }
    await deps.createExchangeRate(er);
    created++;
  }
  return { created, alreadyPresent };
}
