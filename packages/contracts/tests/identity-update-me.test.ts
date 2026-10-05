import { describe, expect, it } from "vitest";

import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  UpdateMeRequestSchema,
  displayNameProblem,
  normalizeDisplayName,
} from "../src/schemas/identity";

describe("the Display Name rule", () => {
  it("allows names of 2 to 30 characters", () => {
    expect(DISPLAY_NAME_MIN).toBe(2);
    expect(DISPLAY_NAME_MAX).toBe(30);
  });

  it("drops spaces at the ends and turns runs of whitespace into one space", () => {
    expect(normalizeDisplayName("  Aman   Durdy ")).toBe("Aman Durdy");
    expect(normalizeDisplayName("Aman\t\n Durdy")).toBe("Aman Durdy");
  });

  it.each([
    ["", "empty"],
    ["     ", "empty"],
    ["A", "too_short"],
    ["  A  ", "too_short"],
    ["a".repeat(31), "too_long"],
  ])("refuses %j as %s", (raw, reason) => {
    expect(displayNameProblem(raw)).toBe(reason);
  });

  it.each([
    "Am",
    "a".repeat(30),
    "Aman Durdy",
    "ýňş".repeat(10),
    "Ж".repeat(30),
    "Дмитрий Александрович Петров",
    "Driver 🚗",
    "4821",
  ])("accepts %j", (raw) => {
    expect(displayNameProblem(raw)).toBeUndefined();
  });

  it("counts code points, so 30 emoji are accepted and 31 are not", () => {
    expect(displayNameProblem("🚗".repeat(30))).toBeUndefined();
    expect(displayNameProblem("🚗".repeat(31))).toBe("too_long");
  });

  it("counts characters after normalizing, so padding does not make a name too long", () => {
    expect(displayNameProblem(`   ${"a".repeat(30)}   `)).toBeUndefined();
  });
});

describe("UpdateMeRequestSchema", () => {
  it("reads the name and drops other fields", () => {
    expect(
      UpdateMeRequestSchema.parse({ displayName: "Aman", nameNumber: 1, role: "admin" }),
    ).toEqual({ displayName: "Aman" });
  });

  it("requires a string name", () => {
    expect(UpdateMeRequestSchema.safeParse({}).success).toBe(false);
    expect(UpdateMeRequestSchema.safeParse({ displayName: 12 }).success).toBe(false);
  });
});
