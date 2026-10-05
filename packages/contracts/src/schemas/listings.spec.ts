import { describe, it, expect } from "vitest";

import { decodeCursor, encodeCursor, ListingDetailSchema } from "./listings";

describe("decodeCursor", () => {
  it("roundtrips an encoded cursor", () => {
    const cursor = {
      timestamp: "2026-05-01T00:00:00.000Z",
      id: "00000000-0000-0000-0000-000000000001",
    };

    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("rejects a token that is not base64url JSON", () => {
    expect(() => decodeCursor("not-a-cursor")).toThrow();
  });

  it("rejects a forged cursor whose timestamp is not a datetime", () => {
    const forged = Buffer.from(
      JSON.stringify({
        timestamp: "not-a-date",
        id: "00000000-0000-0000-0000-000000000001",
      }),
      "utf8",
    ).toString("base64url");

    expect(() => decodeCursor(forged)).toThrow();
  });

  it("rejects a forged cursor whose id is not a uuid", () => {
    const forged = Buffer.from(
      JSON.stringify({ timestamp: "2026-05-01T00:00:00.000Z", id: "l1" }),
      "utf8",
    ).toString("base64url");

    expect(() => decodeCursor(forged)).toThrow();
  });
});

describe("ListingDetailSchema seller", () => {
  const SellerSchema = ListingDetailSchema.shape.seller;
  const seller = {
    displayName: null,
    nameNumber: 2057,
    avatarIndex: 7,
    avatarKey: null,
    deleted: false,
    memberSince: "2026-01-15T09:00:00.000Z",
  };

  it("carries the seller's public identity beside the join date", () => {
    expect(SellerSchema.parse(seller)).toEqual({
      displayName: null,
      nameNumber: 2057,
      avatarIndex: 7,
      avatarKey: null,
      deleted: false,
      memberSince: "2026-01-15T09:00:00.000Z",
    });
  });

  it("keeps a name the seller set and a photo key", () => {
    const parsed = SellerSchema.parse({
      ...seller,
      displayName: "Aman",
      avatarKey: "avatars/u1/photo.jpg",
    });

    expect(parsed.displayName).toBe("Aman");
    expect(parsed.avatarKey).toBe("avatars/u1/photo.jpg");
  });

  it("requires the name number, the avatar index and the deleted flag", () => {
    for (const field of ["nameNumber", "avatarIndex", "avatarKey", "deleted"]) {
      expect(
        SellerSchema.safeParse({ ...seller, [field]: undefined }).success,
        field,
      ).toBe(false);
    }
  });

  it("refuses a name number outside 1000 to 9999 and a negative avatar index", () => {
    expect(SellerSchema.safeParse({ ...seller, nameNumber: 999 }).success).toBe(false);
    expect(SellerSchema.safeParse({ ...seller, nameNumber: 10000 }).success).toBe(false);
    expect(SellerSchema.safeParse({ ...seller, avatarIndex: -1 }).success).toBe(false);
  });

  it("drops contact data, the role and the upload id even when a server sends them", () => {
    const parsed = SellerSchema.parse({
      ...seller,
      phone: "+99365000000",
      email: "a@b.tm",
      role: "seller",
      uploadId: "550e8400-e29b-41d4-a716-446655440009",
    });

    expect(Object.keys(parsed).sort()).toEqual([
      "avatarIndex",
      "avatarKey",
      "deleted",
      "displayName",
      "memberSince",
      "nameNumber",
    ]);
  });
});
