import { describe, expect, it } from "vitest";

import { resources } from "./resources";

function flattenStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(flattenStrings);
}

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" ? flattenKeys(child, path) : [path];
  });
}

describe("English broad-surface translations", () => {
  it.each([
    ["favorites", "Favorites"],
    ["cabinet", "Account"],
    ["selectRegionFirst", "Select a region first"],
    ["signInToManageDescription", "Sign in to manage your listings and drafts."],
  ])("defines common:%s without falling back to Russian", (key, expected) => {
    const common = resources["en"]?.["common"] as Record<string, string>;

    expect(common[key]).toBe(expected);
  });

  it("defines every key available in the Russian fallback locale", () => {
    const russianKeys = flattenKeys(resources["ru"]);
    const englishKeys = new Set(flattenKeys(resources["en"]));

    expect(russianKeys.filter((key) => !englishKeys.has(key))).toEqual([]);
  });
});

describe("Turkmen translations", () => {
  // Turkmen falls back to Russian at runtime, so a gap here is invisible on
  // device until a Turkmen-speaking user hits the screen.
  it("defines every key available in the Russian fallback locale", () => {
    const russianKeys = flattenKeys(resources["ru"]);
    const turkmenKeys = new Set(flattenKeys(resources["tk"]));

    expect(russianKeys.filter((key) => !turkmenKeys.has(key))).toEqual([]);
  });
});

describe("English copy rules", () => {
  const english = flattenStrings(resources["en"]);

  it("says Account, never Cabinet", () => {
    expect(english.filter((text) => /cabinet/i.test(text))).toEqual([]);
    expect((resources["ru"]?.["common"] as Record<string, string>)["cabinet"]).toBe("Кабинет");
    expect((resources["tk"]?.["common"] as Record<string, string>)["cabinet"]).toBe("Kabinet");
  });

  it("writes listing in lower case mid-sentence", () => {
    expect(english.filter((text) => /[a-z,] Listings?\b/.test(text))).toEqual([]);
  });
});

describe("Photos step copy", () => {
  it.each(["en", "ru", "tk"])("counts photos without a denominator and states the maximum once in %s", (locale) => {
    const common = resources[locale]?.["common"] as Record<string, string>;
    expect(common["photosCounter"]).toContain("{{count}}");
    expect(common["photosCounter"]).not.toMatch(/\/|goal/);
    const withMaximum = ["photosCounter", "photosUnder5MB", "maxPhotosReached", "photosGoalRemaining", "photosGoalReached"]
      .filter((key) => /20/.test(common[key] ?? ""));
    expect(withMaximum).toEqual(["photosUnder5MB"]);
  });
});
