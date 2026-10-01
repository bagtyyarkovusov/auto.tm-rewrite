import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it, expect } from "vitest";

import { Enums } from "@auto-tm/contracts";

import { canTransition, type ListingStatus } from "./ListingStatus";

describe("canTransition", () => {
  it("allows active → sold", () => {
    expect(canTransition("active", "sold")).toBe(true);
  });

  it("allows active → archived", () => {
    expect(canTransition("active", "archived")).toBe(true);
  });

  it("allows sold → archived", () => {
    expect(canTransition("sold", "archived")).toBe(true);
  });

  it("allows archived → active", () => {
    expect(canTransition("archived", "active")).toBe(true);
  });

  it("disallows active → active", () => {
    expect(canTransition("active", "active")).toBe(false);
  });

  it("disallows sold → active", () => {
    expect(canTransition("sold", "active")).toBe(false);
  });

  it("disallows sold → sold", () => {
    expect(canTransition("sold", "sold")).toBe(false);
  });

  it("disallows archived → sold", () => {
    expect(canTransition("archived", "sold")).toBe(false);
  });

  it("disallows archived → archived", () => {
    expect(canTransition("archived", "archived")).toBe(false);
  });

  it("disallows banned → sold", () => {
    expect(canTransition("banned", "sold")).toBe(false);
  });

  it("disallows banned → archived", () => {
    expect(canTransition("banned", "archived")).toBe(false);
  });

  it("disallows active → banned via canTransition (admin only)", () => {
    expect(canTransition("active", "banned")).toBe(false);
  });
});

describe("Listing status parity", () => {
  // The database enum is the source of truth for stored values. Reading the
  // schema text needs no generated client, so this runs in the unit lane.
  const schemaPath = resolve(
    __dirname,
    "../../../../../../packages/db/prisma/schema.prisma",
  );

  function prismaListingStatuses(): string[] {
    const block = /enum ListingStatus \{([^}]*)\}/.exec(
      readFileSync(schemaPath, "utf-8"),
    );
    const body = block?.[1];
    if (body === undefined) {
      throw new Error("enum ListingStatus not found in schema.prisma");
    }
    return body
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, "").trim())
      .filter((line) => line.length > 0);
  }

  it("lists the same statuses in the Prisma enum and @auto-tm/contracts", () => {
    expect([...prismaListingStatuses()].sort()).toEqual(
      Object.values(Enums.ListingStatus).sort(),
    );
  });

  it("drives only statuses that the contract and the database both define", () => {
    const apiStatuses: ListingStatus[] = ["active", "sold", "archived", "banned"];
    for (const status of apiStatuses) {
      expect(Object.values(Enums.ListingStatus)).toContain(status);
      expect(prismaListingStatuses()).toContain(status);
    }
  });
});
