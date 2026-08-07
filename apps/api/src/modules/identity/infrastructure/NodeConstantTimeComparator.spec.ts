import { describe, expect, it } from "vitest";

import { NodeConstantTimeComparator } from "./NodeConstantTimeComparator";

describe("NodeConstantTimeComparator", () => {
  it("returns true for equal strings", () => {
    const comparator = new NodeConstantTimeComparator();

    expect(comparator.compare("candidate-a", "candidate-a")).toBe(true);
  });

  it("returns false for different strings with equal byte length", () => {
    const comparator = new NodeConstantTimeComparator();

    expect(comparator.compare("candidate-a", "candidate-b")).toBe(false);
  });

  it("returns false for different lengths without throwing", () => {
    const comparator = new NodeConstantTimeComparator();

    expect(comparator.compare("short", "longer")).toBe(false);
  });
});
