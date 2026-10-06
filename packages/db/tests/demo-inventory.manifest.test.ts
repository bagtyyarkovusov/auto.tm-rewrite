import { describe, expect, it } from "vitest";

import { DEMO_CARS, DEMO_SELLERS, type DemoCar } from "../scripts/demo-inventory/content";
import {
  DEMO_PHOTO_MANIFEST,
  validateDemoInventory,
  type DemoPhoto,
  type DemoPhotoManifest,
} from "../scripts/demo-inventory/manifest";
import {
  DEMO_ID_PREFIX,
  demoListingId,
  demoMediaId,
  demoSellerId,
  isDemoId,
} from "../scripts/demo-inventory/marker";

const photo = (n: number): DemoPhoto => ({
  view: "front-left",
  sourceFile: `Example car (${n}).jpg`,
  sourcePage: `https://commons.wikimedia.org/wiki/File:Example_car_(${n}).jpg`,
  url: `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Example_car_%28${n}%29.jpg/1920px-Example_car_%28${n}%29.jpg`,
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  author: "Example Author",
});

const photos = (count: number): DemoPhoto[] => Array.from({ length: count }, (_, n) => photo(n + 1));

const car = (slug: string): DemoCar => ({ ...DEMO_CARS[0]!, slug });

const manifestOf = (listings: DemoPhotoManifest["listings"]): DemoPhotoManifest => ({
  schemaVersion: 1,
  verifiedOn: "2026-10-06",
  listings,
});

describe("demo inventory content", () => {
  it("has about 50 Listings across 8 to 12 sellers with 1 to 10 Listings each", () => {
    expect(DEMO_CARS.length).toBeGreaterThanOrEqual(45);
    expect(DEMO_CARS.length).toBeLessThanOrEqual(55);
    expect(DEMO_SELLERS.length).toBeGreaterThanOrEqual(8);
    expect(DEMO_SELLERS.length).toBeLessThanOrEqual(12);
    for (const seller of DEMO_SELLERS) {
      const count = DEMO_CARS.filter((entry) => entry.sellerKey === seller.key).length;
      expect(count, seller.key).toBeGreaterThanOrEqual(1);
      expect(count, seller.key).toBeLessThanOrEqual(10);
    }
    expect(new Set(DEMO_SELLERS.map((seller) => seller.kind))).toEqual(new Set(["private", "dealership"]));
  });

  it("uses unique slugs and seller keys, and only known sellers", () => {
    expect(new Set(DEMO_CARS.map((entry) => entry.slug)).size).toBe(DEMO_CARS.length);
    expect(new Set(DEMO_SELLERS.map((seller) => seller.key)).size).toBe(DEMO_SELLERS.length);
    const sellerKeys = new Set(DEMO_SELLERS.map((seller) => seller.key));
    for (const entry of DEMO_CARS) expect(sellerKeys.has(entry.sellerKey), entry.slug).toBe(true);
  });

  it("covers the market's variety", () => {
    expect(DEMO_CARS[0]?.brandSlug).toBe("toyota");
    const brandCounts = new Map<string, number>();
    for (const entry of DEMO_CARS) brandCounts.set(entry.brandSlug, (brandCounts.get(entry.brandSlug) ?? 0) + 1);
    const toyota = brandCounts.get("toyota") ?? 0;
    for (const [brand, count] of brandCounts) {
      if (brand !== "toyota") expect(count, brand).toBeLessThan(toyota);
    }
    for (const brand of ["hyundai", "kia", "lexus", "bmw", "mercedes-benz", "nissan", "mitsubishi"]) {
      expect(brandCounts.get(brand) ?? 0, brand).toBeGreaterThanOrEqual(1);
    }
    expect(new Set(DEMO_CARS.map((entry) => entry.priceCurrency))).toEqual(new Set(["TMT", "USD", "AED"]));
    expect(new Set(DEMO_CARS.map((entry) => entry.regionSlug)).size).toBe(6);
    expect(new Set(DEMO_CARS.map((entry) => entry.citySlug)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(DEMO_CARS.map((entry) => entry.descriptionLocale))).toEqual(new Set(["ru", "tk", "en"]));
    expect(DEMO_CARS.filter((entry) => entry.damaged).length).toBeGreaterThanOrEqual(3);
    expect(DEMO_CARS.filter((entry) => entry.knownIssuesText).length).toBeGreaterThanOrEqual(5);
    expect(DEMO_CARS.filter((entry) => entry.acceptsExchange).length).toBeGreaterThanOrEqual(5);
    const lengths = DEMO_CARS.map((entry) => entry.description.length);
    expect(Math.min(...lengths)).toBeLessThan(120);
    expect(Math.max(...lengths)).toBeGreaterThan(350);
  });

  it("carries no phone number in any name or text", () => {
    const texts = [
      ...DEMO_SELLERS.map((seller) => seller.displayName),
      ...DEMO_CARS.flatMap((entry) => [entry.description, entry.knownIssuesText ?? ""]),
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/\+\s?993/);
      expect(text).not.toMatch(/(?:\d[\s-]?){8,}/);
    }
    expect(DEMO_SELLERS.some((seller) => /[А-Яа-я]/.test(seller.displayName))).toBe(true);
    expect(DEMO_SELLERS.some((seller) => /^[A-Za-zÄäÇçÝýŇňÖöŞşÜüŽž .'-]+$/.test(seller.displayName))).toBe(true);
    expect(new Set(DEMO_SELLERS.map((seller) => seller.memberSince)).size).toBe(DEMO_SELLERS.length);
  });
});

describe("demo inventory marker", () => {
  it("derives every id from one namespace", () => {
    const ids = [
      ...DEMO_SELLERS.map((_, index) => demoSellerId(index)),
      ...DEMO_CARS.map((_, index) => demoListingId(index)),
      ...DEMO_CARS.flatMap((_, index) => Array.from({ length: 8 }, (__, order) => demoMediaId(index, order))),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith(DEMO_ID_PREFIX)).toBe(true);
      expect(isDemoId(id)).toBe(true);
      // The API validates ids with z.string().uuid().
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
    expect(isDemoId("f1000000-0000-4000-8000-000000000001")).toBe(false);
    expect(DEMO_SELLERS.map((seller) => seller.id)).toEqual(DEMO_SELLERS.map((_, index) => demoSellerId(index)));
  });
});

describe("demo inventory photo manifest", () => {
  it("gives every Listing 5 to 8 photos, each with licence, author and source file", () => {
    expect(validateDemoInventory(DEMO_CARS, DEMO_PHOTO_MANIFEST)).toEqual([]);
    const total = DEMO_CARS.reduce(
      (sum, entry) => sum + (DEMO_PHOTO_MANIFEST.listings[entry.slug]?.photos.length ?? 0),
      0,
    );
    expect(total).toBeGreaterThanOrEqual(DEMO_CARS.length * 5);
    expect(total).toBeLessThanOrEqual(DEMO_CARS.length * 8);
  });

  it("reports a Listing with fewer than 5 or more than 8 photos", () => {
    const problems = validateDemoInventory(
      [car("four"), car("nine"), car("five"), car("eight")],
      manifestOf({
        four: { subject: "x", photos: photos(4) },
        nine: { subject: "x", photos: photos(9).map((entry, n) => ({ ...entry, sourceFile: `Nine ${n}.jpg` })) },
        five: { subject: "x", photos: photos(5).map((entry, n) => ({ ...entry, sourceFile: `Five ${n}.jpg` })) },
        eight: { subject: "x", photos: photos(8).map((entry, n) => ({ ...entry, sourceFile: `Eight ${n}.jpg` })) },
      }),
    );
    expect(problems).toEqual([
      "four: 4 photos, expected 5 to 8",
      "nine: 9 photos, expected 5 to 8",
    ]);
  });

  it("reports a Listing with no manifest entry and a manifest entry with no Listing", () => {
    expect(
      validateDemoInventory([car("listed")], manifestOf({ orphan: { subject: "x", photos: photos(5) } })),
    ).toEqual(["listed: no manifest entry", "orphan: manifest entry has no Listing"]);
  });

  it("reports a photo without licence, author, source file or a Commons download URL", () => {
    const [first, second, third, fourth, fifth] = photos(5) as [DemoPhoto, DemoPhoto, DemoPhoto, DemoPhoto, DemoPhoto];
    const problems = validateDemoInventory(
      [car("bad")],
      manifestOf({
        bad: {
          subject: "x",
          photos: [
            { ...first, license: "" },
            { ...second, author: " " },
            { ...third, sourceFile: "" },
            { ...fourth, url: "https://example.com/car.jpg" },
            { ...fifth, license: "All rights reserved" },
          ],
        },
      }),
    );
    expect(problems).toEqual([
      "bad photo 1: licence is missing",
      "bad photo 2: author is missing",
      "bad photo 3: source file is missing",
      "bad photo 4: url is not a Wikimedia Commons upload",
      "bad photo 5: licence All rights reserved is not CC0, public domain, CC BY or CC BY-SA",
    ]);
  });

  it("reports one Commons file used twice", () => {
    const shared = photos(5);
    expect(
      validateDemoInventory(
        [car("one"), car("two")],
        manifestOf({ one: { subject: "x", photos: shared }, two: { subject: "x", photos: shared } }),
      ),
    ).toContain("two photo 1: Example car (1).jpg is already used by one");
  });
});
