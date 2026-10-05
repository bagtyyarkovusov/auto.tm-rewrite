import { describe, expect, it } from "vitest";

import { MeResponseSchema } from "../src/schemas/auth";
import {
  AVATAR_COUNT,
  GENERATED_NAME_PREFIX,
  formatDisplayName,
} from "../src/schemas/identity";

describe("formatDisplayName", () => {
  it.each([
    ["en", "Driver 4821"],
    ["ru", "Водитель 4821"],
    ["tk", "Sürüji 4821"],
  ])("shows the generated name in %s when no name is set", (locale, expected) => {
    expect(formatDisplayName({ displayName: null, nameNumber: 4821 }, locale)).toBe(expected);
  });

  it("shows the set name, trimmed, in every locale", () => {
    for (const locale of ["en", "ru", "tk"]) {
      expect(formatDisplayName({ displayName: "  Aman  ", nameNumber: 4821 }, locale))
        .toBe("Aman");
    }
  });

  it("treats a name of only spaces as no name", () => {
    expect(formatDisplayName({ displayName: "   ", nameNumber: 1000 }, "en")).toBe("Driver 1000");
  });

  it("falls back to the default locale, Russian, for an unknown locale", () => {
    expect(formatDisplayName({ displayName: null, nameNumber: 9999 }, "de")).toBe("Водитель 9999");
    expect(formatDisplayName({ displayName: null, nameNumber: 9999 }, "")).toBe("Водитель 9999");
  });

  it("has a prefix for each app locale and twelve car avatars", () => {
    expect(GENERATED_NAME_PREFIX).toEqual({ en: "Driver", ru: "Водитель", tk: "Sürüji" });
    expect(AVATAR_COUNT).toBe(12);
  });
});

describe("MeResponseSchema identity fields", () => {
  const me = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    phone: "+99365001122",
    email: null,
    phoneVerified: true,
    displayName: null,
    role: "buyer",
    avatarUrl: null,
    locale: "ru",
    createdAt: "2026-10-05T00:00:00.000Z",
    deletionScheduledAt: null,
  };

  it("carries the name number, the avatar index and a null avatar key", () => {
    const parsed = MeResponseSchema.parse({
      ...me,
      nameNumber: 4821,
      avatarIndex: 11,
      avatarKey: null,
    });

    expect(parsed).toMatchObject({ nameNumber: 4821, avatarIndex: 11, avatarKey: null });
  });

  it("requires the name number and the avatar index", () => {
    expect(MeResponseSchema.safeParse({ ...me, avatarKey: null }).success).toBe(false);
  });

  it("rejects a name number outside 1000 to 9999", () => {
    for (const nameNumber of [999, 10000]) {
      expect(MeResponseSchema.safeParse({
        ...me,
        nameNumber,
        avatarIndex: 0,
        avatarKey: null,
      }).success).toBe(false);
    }
  });
});
