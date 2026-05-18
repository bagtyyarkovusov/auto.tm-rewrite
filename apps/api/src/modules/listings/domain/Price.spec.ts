import { describe, it, expect } from "vitest";
import { Price } from "./Price";
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
