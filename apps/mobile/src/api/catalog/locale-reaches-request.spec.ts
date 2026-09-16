import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every catalog hook takes a `locale` and puts it in its TanStack query key.
 * For a while they all *also* dropped it from the request URL, so the API
 * applied its own default (Russian) and the app rendered Russian catalog values
 * under Turkmen and English labels — in every locale, on the listing detail
 * screen and throughout the sell wizard. Because the locale still varied the
 * query key, switching language refetched and got Russian again, so it looked
 * like a translation gap rather than a missing query parameter.
 *
 * This is a source-level assertion on purpose: the failure mode is one word
 * missing from a template literal, it is invisible in a unit test that mocks
 * the client, and it reappears every time someone adds a catalog hook by
 * copying an existing one.
 */
const CATALOG_DIR = __dirname;

function hookFiles(): string[] {
  return readdirSync(CATALOG_DIR)
    .filter((file) => file.startsWith("use") && file.endsWith(".ts"))
    .filter((file) => !file.includes(".spec."))
    // Resolves the locale; makes no request of its own.
    .filter((file) => file !== "useCatalogLocale.ts");
}

/**
 * `useFeedCatalogMaps` and `useConversationCatalogMaps` build their own catalog URLs with useQueries instead of
 * reusing these hooks, so they have to be checked by path — both had the identical
 * bug, and city names are the one catalog field that really is translated.
 */
const EXTRA_CALLERS = [
  path.join(CATALOG_DIR, "../../listings/feed/useFeedCatalogMaps.ts"),
  path.join(CATALOG_DIR, "../../conversations/components/useConversationCatalogMaps.ts"),
];

describe("catalog hooks", () => {
  it("has hooks to check", () => {
    expect(hookFiles().length).toBeGreaterThanOrEqual(10);
  });

  it.each(hookFiles())("%s sends locale in the request URL", (file) => {
    const source = readFileSync(path.join(CATALOG_DIR, file), "utf8");

    // Only applies to hooks that accept a locale in the first place.
    if (!/locale/.test(source)) return;

    const url = /`(\/catalog\/[^`]*)`/.exec(source);
    expect(url, `${file} has no /catalog/ request URL`).not.toBeNull();
    expect(url?.[1]).toContain("locale=${locale}");
  });

  it.each(EXTRA_CALLERS)("%s sends locale on every catalog URL", (file) => {
    const source = readFileSync(file, "utf8");
    const urls = [...source.matchAll(/`(\/catalog\/[^`]*)`/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).toContain("locale=${locale}");
    }
  });
});
