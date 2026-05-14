import { describe, it, expect } from "vitest";
import { Phone } from "./Phone";

describe("Phone", () => {
  it("accepts valid TM mobile numbers with prefix 6X", () => {
    const phone = Phone.create("+99361234567");
    expect(phone).toBeDefined();
    expect(phone.value).toBe("+99361234567");
  });

  it("accepts valid TM mobile numbers with prefix 7X", () => {
    const phone = Phone.create("+99371234567");
    expect(phone.value).toBe("+99371234567");
  });

  it("rejects phone without + prefix", () => {
    expect(() => Phone.create("99361234567")).toThrow("Phone must be +993[6-7]");
  });

  it("rejects non-TM country code", () => {
    expect(() => Phone.create("+15551234567")).toThrow("Phone must be +993[6-7]");
  });

  it("rejects TM landline prefix (1-5)", () => {
    expect(() => Phone.create("+99311234567")).toThrow("Phone must be +993[6-7]");
    expect(() => Phone.create("+99351234567")).toThrow("Phone must be +993[6-7]");
  });

  it("rejects TM prefix 8", () => {
    expect(() => Phone.create("+99381234567")).toThrow("Phone must be +993[6-7]");
  });

  it("rejects too short number", () => {
    expect(() => Phone.create("+9936123456")).toThrow("Phone must be +993[6-7]");
  });

  it("rejects too long number", () => {
    expect(() => Phone.create("+993612345678")).toThrow("Phone must be +993[6-7]");
  });

  it("rejects empty string", () => {
    expect(() => Phone.create("")).toThrow("Phone must be +993[6-7]");
  });

  it("equals works by value", () => {
    const a = Phone.create("+99361234567");
    const b = Phone.create("+99361234567");
    expect(a.equals(b)).toBe(true);
  });

  it("equals distinguishes different numbers", () => {
    const a = Phone.create("+99361234567");
    const b = Phone.create("+99369876543");
    expect(a.equals(b)).toBe(false);
  });
});
