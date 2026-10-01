import { describe, expect, it } from "vitest";

import {
  MAX_ZOOM,
  clampScale,
  clampTranslation,
  doubleTapScale,
} from "./zoomMath";

describe("photo zoom rules", () => {
  it("never zooms out past the fitted photo or in past the maximum", () => {
    expect(MAX_ZOOM).toBeGreaterThan(1);
    expect(clampScale(0.4)).toBe(1);
    expect(clampScale(1.7)).toBe(1.7);
    expect(clampScale(MAX_ZOOM * 3)).toBe(MAX_ZOOM);
  });

  it("keeps the fitted photo centred", () => {
    expect(clampTranslation(80, 1, 390)).toBe(0);
    expect(clampTranslation(-80, 1, 390)).toBe(0);
  });

  it("lets a zoomed photo pan only as far as its edges", () => {
    // At 3x a 300 pt side is 900 pt, so each edge may move 300 pt from centre.
    expect(clampTranslation(120, 3, 300)).toBe(120);
    expect(clampTranslation(450, 3, 300)).toBe(300);
    expect(clampTranslation(-450, 3, 300)).toBe(-300);
  });

  it("double-tap zooms a fitted photo in and a zoomed one back out", () => {
    const zoomedIn = doubleTapScale(1);
    expect(zoomedIn).toBeGreaterThan(1);
    expect(zoomedIn).toBeLessThanOrEqual(MAX_ZOOM);
    expect(doubleTapScale(zoomedIn)).toBe(1);
    expect(doubleTapScale(MAX_ZOOM)).toBe(1);
  });
});
