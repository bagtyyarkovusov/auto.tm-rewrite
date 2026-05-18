import { describe, it, expect } from "vitest";
import { ExchangeRate } from "./ExchangeRate";
import { LISTING_ERROR_CODES } from "./types";

describe("ExchangeRate", () => {
  it("creates a valid exchange rate", () => {
    const rate = ExchangeRate.create({
      id: "rate-1",
      fromCurrency: "USD",
      toCurrency: "TMT",
      rate: 3.5,
      updatedAt: new Date(),
    });
    expect(rate.fromCurrency).toBe("USD");
    expect(rate.toCurrency).toBe("TMT");
    expect(rate.rate).toBe(3.5);
  });

  it("rejects zero rate", () => {
    expect(() =>
      ExchangeRate.create({
        id: "rate-1",
        fromCurrency: "USD",
        toCurrency: "TMT",
        rate: 0,
        updatedAt: new Date(),
      }),
    ).toThrowError(LISTING_ERROR_CODES.INVALID_EXCHANGE_RATE);
  });

  it("rejects negative rate", () => {
    expect(() =>
      ExchangeRate.create({
        id: "rate-1",
        fromCurrency: "AED",
        toCurrency: "TMT",
        rate: -0.5,
        updatedAt: new Date(),
      }),
    ).toThrowError(LISTING_ERROR_CODES.INVALID_EXCHANGE_RATE);
  });
});
