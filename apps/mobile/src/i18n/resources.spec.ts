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

describe("Turkmen translations", () => {
  // Turkmen falls back to Russian at runtime, so a gap here is invisible on
  // device until a Turkmen-speaking user hits the screen.
  it("defines every key available in the Russian fallback locale", () => {
    const russianKeys = flattenKeys(resources["ru"]);
    const turkmenKeys = new Set(flattenKeys(resources["tk"]));

    expect(russianKeys.filter((key) => !turkmenKeys.has(key))).toEqual([]);
  });
});

describe("Onboarding copy", () => {
  const LOCALES = ["ru", "tk", "en"] as const;
  const onboarding = (locale: (typeof LOCALES)[number]) =>
    resources[locale]?.["onboarding"] as Record<string, string>;

  it("has exactly the same keys in Russian, Turkmen and English", () => {
    const keys = Object.keys(onboarding("ru")).sort();

    expect(keys).toEqual([
      "chatBody", "chatTitle", "chooseLanguage", "findBody", "findTitle",
      "finish", "languageGroup", "languageSubtitle", "pageOf",
    ]);
    expect(Object.keys(onboarding("tk")).sort()).toEqual(keys);
    expect(Object.keys(onboarding("en")).sort()).toEqual(keys);
  });

  it.each(LOCALES)("has no empty string and keeps the page numbers in %s", (locale) => {
    const copy = onboarding(locale);

    expect(Object.values(copy).filter((value) => value.trim() === "")).toEqual([]);
    expect(copy["pageOf"]).toContain("{{current}}");
    expect(copy["pageOf"]).toContain("{{total}}");
  });

  // The old slides promised VIN history, inspections, verified sellers, honest
  // condition disclosures, warranties and safe contact, and a third slide sold
  // a free Listing. None of it ships.
  it.each(LOCALES)("makes no claim the app cannot back in %s", (locale) => {
    const text = Object.values(onboarding(locale)).join(" ");

    expect(text).not.toMatch(
      /VIN|inspect|verif|safe|confiden|free|histor|honest|warrant|провер|подтвержд|безопасн|уверен|бесплатн|истори|честн|гарант|barla|tassykl|howpsuz|ynam|mugt|taryh|çyn|wada/i,
    );
  });
});
