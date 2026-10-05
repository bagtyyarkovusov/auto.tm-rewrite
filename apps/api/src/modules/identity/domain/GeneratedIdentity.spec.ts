import { describe, expect, it } from "vitest";

import {
  AVATAR_INDEX_RANGE,
  NAME_NUMBER_RANGE,
  drawGeneratedIdentity,
} from "./GeneratedIdentity";

/** A random source that answers the given values in turn. */
function fixedRandom(...values: number[]): () => number {
  let call = 0;
  return () => {
    const value = values[call];
    call += 1;
    if (value === undefined) throw new Error("random source called too often");
    return value;
  };
}

describe("drawGeneratedIdentity", () => {
  it("states the two ranges", () => {
    expect(NAME_NUMBER_RANGE).toEqual({ min: 1000, max: 9999 });
    expect(AVATAR_INDEX_RANGE).toEqual({ min: 0, max: 11 });
  });

  it("draws the lowest name number and avatar index from the lowest random value", () => {
    expect(drawGeneratedIdentity(fixedRandom(0, 0))).toEqual({
      nameNumber: 1000,
      avatarIndex: 0,
    });
  });

  it("draws the highest name number and avatar index from the highest random value", () => {
    const highest = 1 - Number.EPSILON;

    expect(drawGeneratedIdentity(fixedRandom(highest, highest))).toEqual({
      nameNumber: 9999,
      avatarIndex: 11,
    });
  });

  it("draws the two values independently", () => {
    expect(drawGeneratedIdentity(fixedRandom(0.5, 0))).toEqual({
      nameNumber: 5500,
      avatarIndex: 0,
    });
  });
});
