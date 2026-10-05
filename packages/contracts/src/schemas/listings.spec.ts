import { describe, it, expect } from "vitest";

import { decodeCursor, encodeCursor } from "./listings";

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
