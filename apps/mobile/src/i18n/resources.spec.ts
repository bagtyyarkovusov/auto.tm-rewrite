import { describe, expect, it } from "vitest";

import { resources } from "./resources";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" ? flattenKeys(child, path) : [path];
  });
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Keys with their plural suffix removed: each locale carries the plural forms its own rules need. */
function baseKeys(value: unknown) {
  return new Set(flattenKeys(value).map((key) => key.replace(PLURAL_SUFFIX, "")));
}

describe("English broad-surface translations", () => {
  it.each([
    ["favorites", "Favorites"],
    ["cabinet", "Cabinet"],
    ["selectRegionFirst", "Select a region first"],
    ["signInToManageDescription", "Sign in to manage your listings and drafts."],
  ])("defines common:%s without falling back to Russian", (key, expected) => {
    const common = resources["en"]?.["common"] as Record<string, string>;

    expect(common[key]).toBe(expected);
  });

  it("defines every key available in the Russian fallback locale", () => {
    const russianKeys = [...baseKeys(resources["ru"])];
    const englishKeys = baseKeys(resources["en"]);

    expect(russianKeys.filter((key) => !englishKeys.has(key))).toEqual([]);
  });
});

describe("Turkmen translations", () => {
  // Turkmen falls back to Russian at runtime, so a gap here is invisible on
  // device until a Turkmen-speaking user hits the screen.
  it("defines every key available in the Russian fallback locale", () => {
    const russianKeys = [...baseKeys(resources["ru"])];
    const turkmenKeys = baseKeys(resources["tk"]);

    expect(russianKeys.filter((key) => !turkmenKeys.has(key))).toEqual([]);
  });
});

describe("Plural keys", () => {
  // A plural key missing one of its locale's categories silently falls back to Russian.
  it.each(["ru", "tk", "en"])("in %s define every plural category the locale's rules use", (locale) => {
    const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
    const keys = flattenKeys(resources[locale]);
    const pluralBases = new Set(keys.filter((key) => PLURAL_SUFFIX.test(key)).map((key) => key.replace(PLURAL_SUFFIX, "")));

    const missing = [...pluralBases].flatMap((base) =>
      categories.map((category) => `${base}_${category}`).filter((key) => !keys.includes(key)),
    );

    expect(pluralBases.size).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
