import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

const appDir = resolve(__dirname, "../../app");
const read = (path: string) => readFileSync(resolve(appDir, path), "utf-8");

describe("Search tab stack", () => {
  const layout = read("(tabs)/(search)/_layout.tsx");

  it("is a Stack whose first screen is Home", () => {
    expect(layout).toContain("<Stack");
    expect(layout).toContain('anchor: "index"');
  });

  it("keeps the Search tab name and icon on the (search) group", () => {
    expect(read("(tabs)/_layout.tsx")).toContain('name="(search)"');
    const tabBar = readFileSync(
      resolve(__dirname, "../../components/navigation/AutoTmTabBar.tsx"),
      "utf-8",
    );
    expect(tabBar).toContain('{ name: "(search)", label: t("search"), icon: Search }');
  });

  it("re-tapping the active tab emits tabPress, which pops the stack to Home", () => {
    const tabBar = readFileSync(
      resolve(__dirname, "../../components/navigation/AutoTmTabBar.tsx"),
      "utf-8",
    );
    // The native stack listens for tabPress on its parent tab and pops to its
    // first screen when the tab is already focused. The tab bar must always
    // emit the event and only navigate when the tab is not focused, so other
    // tabs keep their own history.
    expect(tabBar).toContain('type: "tabPress"');
    expect(tabBar).toContain("if (!isFocused && !event.defaultPrevented)");
  });

  it("registers Home, Results, pickers and Search parameters, and Search renders SearchScreen", () => {
    for (const route of ["results", "brands", "models", "parameters", "search"]) {
      expect(existsSync(resolve(appDir, `(tabs)/(search)/${route}.tsx`))).toBe(true);
    }
    expect(read("(tabs)/(search)/search.tsx")).toContain("<SearchScreen");
  });
});
