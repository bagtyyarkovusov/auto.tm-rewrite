import { describe, expect, it } from "vitest";

import { DisplayName, InvalidDisplayNameError } from "./DisplayName";

function refusal(raw: string): string | undefined {
  try {
    DisplayName.create(raw);
    return undefined;
  } catch (error) {
    if (error instanceof InvalidDisplayNameError) return error.reason;
    throw error;
  }
}

describe("DisplayName", () => {
  it("stores the name with the ends trimmed and inner runs of spaces collapsed", () => {
    expect(DisplayName.create("  Aman   Durdy ").value).toBe("Aman Durdy");
  });

  it("accepts names of 2 and of 30 characters", () => {
    expect(DisplayName.create("Am").value).toBe("Am");
    expect(DisplayName.create("a".repeat(30)).value).toBe("a".repeat(30));
  });

  it("accepts a 30-letter Turkmen name and a 30-letter Cyrillic name", () => {
    expect(DisplayName.create("ýňş".repeat(10)).value).toBe("ýňş".repeat(10));
    expect(DisplayName.create("Ж".repeat(30)).value).toBe("Ж".repeat(30));
  });

  it("counts an emoji as one character", () => {
    expect(DisplayName.create("🚗".repeat(30)).value).toBe("🚗".repeat(30));
    expect(refusal("🚗".repeat(31))).toBe("too_long");
  });

  it.each([
    ["", "empty"],
    ["    ", "empty"],
    ["A", "too_short"],
    ["a".repeat(31), "too_long"],
  ])("refuses %j as %s", (raw, reason) => {
    expect(refusal(raw)).toBe(reason);
  });

  it("keeps the refused text out of the error message", () => {
    expect(() => DisplayName.create("x".repeat(31))).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("xxx") }),
    );
  });
});
