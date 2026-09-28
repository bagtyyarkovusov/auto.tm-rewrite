import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const appDir = resolve(__dirname, "../../app");
const source = readFileSync(resolve(appDir, "(tabs)/(search)/index.tsx"), "utf-8");

describe("Home (the Search tab's first screen)", () => {
  it("opens Search from 🔍 in the header", () => {
    expect(source).toContain('router.push("/(tabs)/(search)/search")');
    expect(source).toContain('accessibilityLabel={t("search")}');
  });

  it("opens the Brand picker from the Brand, model card with the live count", () => {
    expect(source).toContain('router.push("/(tabs)/(search)/brands")');
    expect(source).toContain('t("brandModel")');
    expect(source).toContain("useListingCount({})");
    expect(source).toContain("count.data.totalMatching");
  });

  it("shows New listings as a two-column grid with See all to unfiltered Results", () => {
    expect(source).toContain('t("newListings")');
    expect(source).toContain("numColumns={2}");
    expect(source).toContain("<ListingGridCard");
    expect(source).toContain('router.push("/(tabs)/(search)/results")');
    expect(source).toContain('t("seeAll")');
  });

  it("asks for the viewer's feed so ♡ reflects saved Favorites", () => {
    expect(source).toContain("viewerId: viewer?.userId ?? null");
    expect(source).toContain('import { HOME_HREF } from "../../../src/navigation/homeHref"');
    expect(source).toContain("returnTo={HOME_HREF}");
  });

  it("finishes a signed-out ♡ at screen level, not in the card", () => {
    expect(source).toContain("useFeedFavoriteReplay();");
  });

  it("pads an odd last row so the last card keeps half width", () => {
    expect(source).toContain("items.length % 2 === 1 ? [...items, GRID_SPACER] : items");
    expect(source).toContain("data={cells}");
  });

  it("uses the RNR Button for 🔍 and See all", () => {
    expect(source).toContain('import { Button } from "@/components/ui/button"');
    expect(source).not.toMatch(/<Pressable[^>]*accessibilityLabel=\{t\("search"\)\}/);
  });

  it("has no filters, filter chips, or safety banner", () => {
    for (const absent of [
      "FilterSheet",
      "useListingFilters",
      "SlidersHorizontal",
      "TrustBanner",
      "trustInfo",
      "/trust",
      "Badge",
    ]) {
      expect(source).not.toContain(absent);
    }
  });

  it("shows grid skeletons while loading and the shared error state offline", () => {
    expect(source).toContain("<GridSkeleton />");
    expect(source).toContain("<ListingGridCardSkeleton />");
    expect(source).toContain("<FeedError error={error}");
  });

  it("no longer lives at the old tab index route", () => {
    expect(existsSync(resolve(appDir, "(tabs)/index.tsx"))).toBe(false);
  });
});
