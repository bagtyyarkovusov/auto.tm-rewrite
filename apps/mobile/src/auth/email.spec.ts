import { describe, expect, it } from "vitest";

import { normalizeEmail } from "./email";

describe("normalizeEmail", () => {
  it("trims and lowercases a valid email Sign-in Method", () => {
    expect(normalizeEmail("  Buyer@Example.COM ")).toBe("buyer@example.com");
  });

  it.each(["", "buyer", "@example.com", "buyer@example"])(
    "rejects invalid email input: %s",
    (value) => {
      expect(normalizeEmail(value)).toBeNull();
    },
  );
});
