import { describe, expect, it } from "vitest";

import { maskEmail, normalizeEmail } from "./email";

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

describe("maskEmail", () => {
  it("keeps the first character and the whole domain", () => {
    expect(maskEmail("reviewer@auto.tm")).toBe("r•••@auto.tm");
  });

  it("returns a value without a local part unchanged", () => {
    expect(maskEmail("@auto.tm")).toBe("@auto.tm");
    expect(maskEmail("reviewer")).toBe("reviewer");
  });
});
