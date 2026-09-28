import { describe, it, expect } from "vitest";
import { Price, toPriceTmt } from "./Price";
import { LISTING_ERROR_CODES } from "./types";

describe("Price", () => {
  it("creates a valid price", () => {
    const price = Price.create(100000, "TMT");
    expect(price.amount).toBe(100000);
    expect(price.currency).toBe("TMT");
  });

  it("creates a price in USD", () => {
    const price = Price.create(20000, "USD");
    expect(price.currency).toBe("USD");
  });

  it("rejects zero amount", () => {
    expect(() => Price.create(0, "TMT")).toThrowError(
      LISTING_ERROR_CODES.INVALID_PRICE,
    );
  });

  it("rejects negative amount", () => {
    expect(() => Price.create(-100, "AED")).toThrowError(
      LISTING_ERROR_CODES.INVALID_PRICE,
    );
  });

  it("considers two prices with same amount and currency equal", () => {
    const a = Price.create(50000, "TMT");
    const b = Price.create(50000, "TMT");
    expect(a.equals(b)).toBe(true);
  });

  it("considers two prices with different amounts not equal", () => {
    const a = Price.create(50000, "TMT");
    const b = Price.create(60000, "TMT");
    expect(a.equals(b)).toBe(false);
  });

  it("considers two prices with different currencies not equal", () => {
    const a = Price.create(50000, "TMT");
    const b = Price.create(50000, "USD");
    expect(a.equals(b)).toBe(false);
  });
});

describe("toPriceTmt", () => {
  it("keeps a TMT amount as is", () => {
    expect(toPriceTmt(100_000, "TMT", 1)).toBe(100_000);
  });

  it("converts a foreign amount at the rate to TMT", () => {
    expect(toPriceTmt(10_000, "USD", 19.5)).toBe(195_000);
    expect(toPriceTmt(20_000, "AED", 0.95)).toBe(19_000);
  });

  it("rejects a foreign amount without a positive rate", () => {
    expect(() => toPriceTmt(10_000, "USD", 0)).toThrowError(
      LISTING_ERROR_CODES.EXCHANGE_RATE_MISSING,
    );
  });
});
