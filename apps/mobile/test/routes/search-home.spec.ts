import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const appDir = resolve(__dirname, "../../app");
const feedDir = resolve(__dirname, "../../src/listings/feed");
const source = readFileSync(resolve(appDir, "(tabs)/(search)/index.tsx"), "utf-8");
const header = readFileSync(resolve(feedDir, "HomeHeader.tsx"), "utf-8");
const gridCard = readFileSync(resolve(feedDir, "ListingGridCard.tsx"), "utf-8");

describe("Home (the Search tab's first screen)", () => {
  it("scrolls the feed smoothly back to the top when the focused Search tab is tapped again", () => {
    expect(source).toContain('import { useScrollToTop } from "@react-navigation/native";');
    expect(source).toContain("useScrollToTop(listRef);");
    expect(source).toContain("ref={listRef}");
  });

  it("opens Search from 🔍 in the header", () => {
    expect(source).toContain("<HomeHeader />");
    expect(header).toContain('router.push("/(tabs)/(search)/search")');
    expect(header).toContain('accessibilityLabel={t("search")}');
  });

  it("opens the Brand picker from the Brand, model card with the live count", () => {
    expect(header).toContain('router.push("/(tabs)/(search)/brands")');
    expect(header).toContain('t("brandModel")');
    expect(header).toContain("useListingCount({})");
    expect(header).toContain("count.data.totalMatching");
  });

  it("shows New listings as a two-column grid with See all to unfiltered Results", () => {
    expect(header).toContain('t("newListings")');
    expect(source).toContain("numColumns={2}");
    expect(source).toContain("<ListingGridCard");
    expect(header).toContain('router.push("/(tabs)/(search)/results")');
    expect(header).toContain('t("seeAll")');
  });

  it("asks for the viewer's feed so ♡ reflects saved Favorites", () => {
    expect(source).toContain("viewerId: viewer?.userId ?? null");
    expect(source).toContain('import { HOME_HREF } from "../../../src/navigation/homeHref"');
    expect(source).toContain("returnTo={HOME_HREF}");
  });

  it("finishes a signed-out ♡ at screen level, not in the card", () => {
    expect(source).toContain("useFeedFavoriteReplay(HOME_HREF);");
  });

  it("pads an odd last row so the last card keeps half width", () => {
    expect(source).toContain("items.length % 2 === 1 ? [...items, GRID_SPACER] : items");
    expect(source).toContain("data={cells}");
  });

  it("uses the RNR Button for 🔍 and See all", () => {
    expect(header).toContain('import { Button } from "@/components/ui/button"');
    expect(header).not.toMatch(/<Pressable[^>]*accessibilityLabel=\{t\("search"\)\}/);
  });

  it("has no filters, filter chips, or safety banner", () => {
    for (const absent of [
      "SearchParametersForm",
      "useListingFilters",
      "SlidersHorizontal",
      "TrustBanner",
      "trustInfo",
      "/trust",
      "Badge",
    ]) {
      expect(source).not.toContain(absent);
      expect(header).not.toContain(absent);
    }
  });

  it("shows grid skeletons while loading and the shared error state offline", () => {
    expect(source).toContain("<ListingGridSkeleton />");
    expect(gridCard).toContain("<ListingGridCardSkeleton />");
    expect(source).toContain("<FeedError error={error}");
  });

  it("no longer lives at the old tab index route", () => {
    expect(existsSync(resolve(appDir, "(tabs)/index.tsx"))).toBe(false);
  });
});
