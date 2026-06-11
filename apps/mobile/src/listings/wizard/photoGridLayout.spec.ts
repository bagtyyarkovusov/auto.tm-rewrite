import { describe, expect, it } from "vitest";

import {
  getDragTargetIndex,
  getPhotoTileSize,
  reorderPhotoIdsByIndex,
} from "./photoGridLayout";

describe("photo grid layout", () => {
  it("sizes three photo tiles inside the wizard content width", () => {
    expect(getPhotoTileSize(430)).toBe(124);
    expect(getPhotoTileSize(320)).toBe(88);
    expect(getPhotoTileSize(900)).toBe(136);
  });

  it("moves a dragged photo to the slot under the release point", () => {
    expect(
      getDragTargetIndex({
        fromIndex: 0,
        dx: 132,
        dy: 0,
        count: 4,
        tileSize: 124,
      }),
    ).toBe(1);

    expect(
      getDragTargetIndex({
        fromIndex: 0,
        dx: 264,
        dy: 132,
        count: 4,
        tileSize: 124,
      }),
    ).toBe(3);
  });

  it("clamps drag target inside the available photo count", () => {
    expect(
      getDragTargetIndex({
        fromIndex: 2,
        dx: 500,
        dy: 500,
        count: 4,
        tileSize: 124,
      }),
    ).toBe(3);
  });

  it("returns reordered photo ids without mutating the original list", () => {
    const ids = ["a", "b", "c", "d"];

    expect(reorderPhotoIdsByIndex(ids, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });
});
