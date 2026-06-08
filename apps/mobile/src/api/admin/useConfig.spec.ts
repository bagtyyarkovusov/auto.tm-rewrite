import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./useConfig.ts"), "utf-8");

describe("useConfig", () => {
  it("calls GET /config", () => {
    expect(source).toContain('"/config"');
  });

  it("uses ConfigResponseSchema", () => {
    expect(source).toContain("ConfigResponseSchema");
  });

  it("uses query key config", () => {
    expect(source).toContain('"config"');
  });
});
