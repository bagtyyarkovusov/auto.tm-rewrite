import { describe, expect, it } from "vitest";

import { offsetToReveal } from "./useKeepFocusedInputVisible";

describe("offsetToReveal", () => {
  it("leaves the list alone when the field already clears the covered edge", () => {
    expect(offsetToReveal(300, 0, 600, 100)).toBeNull();
  });

  it("scrolls a field hidden under a floating bar to just above it", () => {
    // Viewport 400 with a 100 dp bar: the field may end at 400 - 100 - 16 = 284.
    expect(offsetToReveal(500, 0, 400, 100)).toBe(216);
  });

  it("counts the current scroll position", () => {
    expect(offsetToReveal(500, 250, 400, 100)).toBeNull();
    expect(offsetToReveal(600, 250, 400, 100)).toBe(316);
  });
});
