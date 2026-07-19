import { describe, expect, it } from "vitest";

import { resources } from "./resources";

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
    ["cabinet", "Cabinet"],
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
