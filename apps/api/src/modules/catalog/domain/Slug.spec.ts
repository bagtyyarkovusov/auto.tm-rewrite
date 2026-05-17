import { describe, it, expect } from "vitest";
import { Slug } from "./Slug";

describe("Slug", () => {
  it("uses English name as canonical", () => {
    const slug = Slug.create("Toyota", "Тойота", "Toýota");
    expect(slug.value).toBe("toyota");
  });

  it("falls back to Russian when English is missing", () => {
    const slug = Slug.create("", "Лада", "Lada");
    expect(slug.value).toBe("lada");
  });

  it("falls back to Turkmen when English and Russian are missing", () => {
    const slug = Slug.create("", "", "Toýota");
    expect(slug.value).toBe("toyota");
  });

  it("converts spaces to hyphens", () => {
    const slug = Slug.create("Mercedes-Benz E-Class");
    expect(slug.value).toBe("mercedes-benz-e-class");
  });

  it("transliterates Cyrillic", () => {
    const slug = Slug.create("", "Лада");
    expect(slug.value).toBe("lada");
  });

  it("truncates to 100 characters", () => {
    const longName = "a".repeat(150);
    const slug = Slug.create(longName);
    expect(slug.value.length).toBe(100);
  });

  it("rejects empty input", () => {
    expect(() => Slug.create("")).toThrow(
      "Slug source cannot be empty or whitespace-only",
    );
  });

  it("rejects whitespace-only input", () => {
    expect(() => Slug.create("   ")).toThrow(
      "Slug source cannot be empty or whitespace-only",
    );
  });

  it("rejects all-empty multilingual input", () => {
    expect(() => Slug.create("", "", "")).toThrow(
      "Slug source cannot be empty or whitespace-only",
    );
  });

  it("handles mixed case gracefully", () => {
    const slug = Slug.create("TOYOTA Camry");
    expect(slug.value).toBe("toyota-camry");
  });

  it("handles special characters", () => {
    const slug = Slug.create("BMW M3 & M4");
    expect(slug.value).toBe("bmw-m3-and-m4");
  });

  it("equals works correctly", () => {
    const a = Slug.create("Toyota");
    const b = Slug.create("Toyota");
    const c = Slug.create("Honda");
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
