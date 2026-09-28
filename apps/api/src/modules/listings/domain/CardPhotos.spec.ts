import { describe, it, expect } from "vitest";

import { CARD_PHOTO_KEY_LIMIT, toCardPhotos } from "./CardPhotos";

describe("toCardPhotos", () => {
  it("returns an empty array and 0 when the Listing has no media", () => {
    expect(toCardPhotos([])).toEqual({ photoKeys: [], photoCount: 0 });
  });

  it("returns the first two photo keys in order and the total photo count", () => {
    const media = ["a", "b", "c", "d"].map((key) => ({ key, kind: "image" as const }));

    const result = toCardPhotos(media);

    expect(CARD_PHOTO_KEY_LIMIT).toBe(2);
    expect(result.photoKeys).toEqual(["a", "b"]);
    expect(result.photoCount).toBe(4);
    expect(result.coverMediaKey).toBe("a");
  });

  it("skips video media for photo keys and count but keeps it as the cover", () => {
    const result = toCardPhotos([
      { key: "clip", kind: "video" },
      { key: "p1", kind: "image" },
    ]);

    expect(result.coverMediaKey).toBe("clip");
    expect(result.photoKeys).toEqual(["p1"]);
    expect(result.photoCount).toBe(1);
  });
});
