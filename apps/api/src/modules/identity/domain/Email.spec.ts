import { describe, it, expect } from "vitest";
import { Email } from "./Email";

describe("Email", () => {
  it("stores the address trimmed and lowercased", () => {
    expect(Email.create("  Aman.Berdi@Example.COM \n").value).toBe("aman.berdi@example.com");
  });

  it("does no provider-specific rewriting", () => {
    expect(Email.create("a.b.c+tag@gmail.com").value).toBe("a.b.c+tag@gmail.com");
  });

  it("accepts any domain", () => {
    expect(Email.create("user@mail.tm").value).toBe("user@mail.tm");
  });

  it("treats differently cased addresses as equal", () => {
    expect(Email.create("USER@example.com").equals(Email.create("user@example.com"))).toBe(true);
  });

  it.each(["", "   ", "no-at-sign", "user@", "@example.com", "user@nodot", "us er@example.com"])(
    "rejects %j",
    (raw) => {
      expect(() => Email.create(raw)).toThrow("Email must be a valid address");
    },
  );

  it("rejects addresses longer than 254 characters", () => {
    expect(() => Email.create(`${"a".repeat(250)}@example.com`)).toThrow(
      "Email must be a valid address",
    );
  });
});
