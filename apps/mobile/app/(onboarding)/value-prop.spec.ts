import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./value-prop.tsx"), "utf-8");

describe("Onboarding value prop trust slide", () => {
  it("includes a third trust-focused slide", () => {
    expect(source).toContain('"valueProp3"');
    expect(source).toContain('t(`${slideKey}Title`)');
    expect(source).toContain('t(`${slideKey}Body`)');
  });

  it("renders a shield icon on the trust slide", () => {
    expect(source).toContain("ShieldCheck");
    expect(source).toContain('slideKey === "valueProp3"');
  });
});
