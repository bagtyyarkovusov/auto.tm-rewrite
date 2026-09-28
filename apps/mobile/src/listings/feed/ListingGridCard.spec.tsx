import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "./ListingGridCard.tsx"), "utf-8");

describe("ListingGridCard", () => {
  it("renders the text from the pure card rules", () => {
    expect(source).toContain("listingGridCardText({");
    expect(source).toContain("{text.price}");
    expect(source).toContain("{text.title}");
    expect(source).toContain("{text.meta}");
  });

  it("keeps the price, title and meta to one line each", () => {
    expect(source.match(/numberOfLines=\{1\}/g)).toHaveLength(3);
  });

  it("shows no date, city, gearbox, fuel, or badges", () => {
    for (const absent of [
      "publishedAt",
      "cityId",
      "cityName",
      "transmissionId",
      "engineTypeId",
      "sellerTrust",
      "<Badge",
    ]) {
      expect(source).not.toContain(absent);
    }
  });

  it("shows a title placeholder only while catalog names load, then drops an unknown title", () => {
    expect(source).toContain(") : titlePending ? (");
    expect(source).toContain("titlePending = false,");
  });

  it("drops the meta line when it has nothing to show", () => {
    expect(source).toContain("{text.meta ? (");
  });

  it("puts ♡ on the rounded photo and routes it through useListingFavorite", () => {
    expect(source).toContain("rounded-xl");
    expect(source).toContain("absolute right-1 top-1");
    expect(source).toContain("useListingFavorite({");
    expect(source).toContain("onPress={toggle}");
    expect(source).toContain("accessibilityState={{ selected: favorited");
  });

  it("fills the saved ♥ with an explicit colour, since currentColor does not resolve natively", () => {
    expect(source).toContain("fill-brand-500");
    expect(source).not.toContain("fill-current");
  });

  it("uses the first photo key and falls back to the cover key", () => {
    expect(source).toContain("listing.photoKeys[0] ?? listing.coverMediaKey");
  });

  it("exports a skeleton with the same photo shape", () => {
    expect(source).toContain("export function ListingGridCardSkeleton");
    expect(source.match(/aspect-\[3\/2\] w-full/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
