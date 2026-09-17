import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";

import { describe, expect, it } from "vitest";

const APP_DIR = resolve(__dirname, "../../app");

/**
 * Expo Router discovers routes with `require.context` over `app/`, excluding
 * only `+api`, `+html`, `+native-intent` and `+middleware` files. Anything else
 * placed there — including a `*.spec.ts` — is registered as a navigable route
 * and leaks into the generated `.expo/types/router.d.ts` and the sitemap.
 */
function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc);
    } else {
      acc.push(full.slice(APP_DIR.length + 1));
    }
  }
  return acc;
}

describe("app/ route directory", () => {
  it("contains no test files, which Expo Router would register as routes", () => {
    const offenders = collectFiles(APP_DIR).filter((file) =>
      /\.(spec|test)\.[jt]sx?$/.test(file),
    );

    expect(offenders).toEqual([]);
  });
});
