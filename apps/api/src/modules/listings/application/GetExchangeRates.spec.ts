import { describe, it, expect, beforeEach } from "vitest";
import { GetExchangeRates } from "./GetExchangeRates";
import type { ExchangeRatePort } from "../domain/ports/ExchangeRatePort";

class FakeExchangeRatePort implements ExchangeRatePort {
  rates: Array<{ fromCurrency: "TMT" | "USD" | "AED"; toCurrency: "TMT" | "USD" | "AED"; rate: number }> = [];

  async getRate(_from: string, _to: string): Promise<number> {
    return 1;
  }

  async listAll() {
    return this.rates.map((r) => ({ ...r, updatedAt: new Date("2026-05-01T00:00:00Z") }));
  }
}

function makeUseCase(port?: FakeExchangeRatePort) {
  return new GetExchangeRates(port ?? new FakeExchangeRatePort());
}

describe("GetExchangeRates", () => {
  let port: FakeExchangeRatePort;

  beforeEach(() => {
    port = new FakeExchangeRatePort();
  });

  it("returns empty rates when none exist", async () => {
    const uc = makeUseCase(port);
    const result = await uc.execute();

    expect(result.rates).toHaveLength(0);
  });

  it("returns all exchange rates", async () => {
    port.rates = [
      { fromCurrency: "USD", toCurrency: "TMT", rate: 3.5 },
      { fromCurrency: "AED", toCurrency: "TMT", rate: 0.95 },
    ];

    const uc = makeUseCase(port);
    const result = await uc.execute();

    expect(result.rates).toHaveLength(2);
    expect(result.rates[0]).toMatchObject({ fromCurrency: "USD", toCurrency: "TMT", rate: 3.5 });
    expect(result.rates[1]).toMatchObject({ fromCurrency: "AED", toCurrency: "TMT", rate: 0.95 });
  });
});
