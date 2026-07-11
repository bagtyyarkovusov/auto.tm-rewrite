import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./index.tsx"), "utf-8");

describe("Feed trust framing", () => {
  it("renders a compact trust banner below the search header", () => {
    expect(source).toContain("TrustBanner");
    expect(source).toContain('t("trustInfoTitle")');
    expect(source).toContain('t("trustInfoSubtitle")');
    expect(source).toContain("/trust");
    expect(source).toContain("Linking.openURL");
  });

  it("uses a shield icon for the trust banner", () => {
    expect(source).toContain("ShieldCheck");
  });
});
