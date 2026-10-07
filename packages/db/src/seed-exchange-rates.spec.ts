import { describe, it, expect, vi } from "vitest";

import {
  seedExchangeRates,
  type ExchangeRateSeed,
  type ExchangeRateSeedDeps,
} from "./seed-exchange-rates";

const CATALOG: ExchangeRateSeed[] = [
  { fromCurrency: "USD", toCurrency: "TMT", rate: 18.2 },
  { fromCurrency: "AED", toCurrency: "TMT", rate: 4.96 },
];

function createDeps(existing: ExchangeRateSeed[], overrides?: Partial<ExchangeRateSeedDeps>) {
  const stored = new Map(
    existing.map((er) => [`${er.fromCurrency}_${er.toCurrency}`, { ...er }]),
  );
  const deps: ExchangeRateSeedDeps = {
    findExchangeRate: vi.fn(async (fromCurrency: string, toCurrency: string) => {
      return stored.get(`${fromCurrency}_${toCurrency}`) ?? null;
    }),
    createExchangeRate: vi.fn(async (er: ExchangeRateSeed) => {
      stored.set(`${er.fromCurrency}_${er.toCurrency}`, { ...er });
    }),
    ...overrides,
  };
  return { deps, stored };
}

describe("seedExchangeRates", () => {
  it("creates every catalog pair when none exist", async () => {
    const { deps, stored } = createDeps([]);

    const result = await seedExchangeRates(deps, CATALOG);

    expect(result).toEqual({ created: 2, alreadyPresent: 0 });
    expect(stored.get("USD_TMT")?.rate).toBe(18.2);
    expect(stored.get("AED_TMT")?.rate).toBe(4.96);
  });

  it("leaves an existing admin-set rate unchanged and creates only missing pairs", async () => {
    // An admin changed USD->TMT after the initial seed; re-running the catalog
    // seed must not silently revert it.
    const { deps, stored } = createDeps([
      { fromCurrency: "USD", toCurrency: "TMT", rate: 17.45 },
    ]);

    const result = await seedExchangeRates(deps, CATALOG);

    expect(result).toEqual({ created: 1, alreadyPresent: 1 });
    expect(stored.get("USD_TMT")?.rate).toBe(17.45);
    expect(stored.get("AED_TMT")?.rate).toBe(4.96);
    expect(deps.createExchangeRate).toHaveBeenCalledTimes(1);
    expect(deps.createExchangeRate).toHaveBeenCalledWith(
      expect.objectContaining({ fromCurrency: "AED", toCurrency: "TMT", rate: 4.96 }),
    );
  });

  it("creates nothing when every pair already exists", async () => {
    const { deps } = createDeps(CATALOG);

    const result = await seedExchangeRates(deps, CATALOG);

    expect(result).toEqual({ created: 0, alreadyPresent: 2 });
    expect(deps.createExchangeRate).not.toHaveBeenCalled();
  });
});
