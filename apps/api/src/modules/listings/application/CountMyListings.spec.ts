import { describe, it, expect } from "vitest";

import { ListingsSchemas } from "@auto-tm/contracts";

import { CountMyListings } from "./CountMyListings";
import type {
  OwnerListingCounts,
  OwnerListingCountsPort,
} from "../domain/ports/OwnerListingCountsPort";

class FakeOwnerListingCountsPort implements OwnerListingCountsPort {
  askedFor: string[] = [];

  constructor(private readonly counts: OwnerListingCounts) {}

  async countForOwner(ownerId: string): Promise<OwnerListingCounts> {
    this.askedFor.push(ownerId);
    return this.counts;
  }
}

function countsFor(counts: OwnerListingCounts) {
  const port = new FakeOwnerListingCountsPort(counts);
  return { port, useCase: new CountMyListings(port) };
}

describe("CountMyListings", () => {
  it("returns the per-status numbers, the drafts, and their total", async () => {
    const { port, useCase } = countsFor({
      byStatus: { active: 2, sold: 1, archived: 1, banned: 0 },
      drafts: 1,
    });

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toEqual({
      active: 2,
      sold: 1,
      archived: 1,
      banned: 0,
      drafts: 1,
      total: 5,
    });
    expect(port.askedFor).toEqual(["user-1"]);
  });

  it("counts a banned Listing in banned and in total", async () => {
    const { useCase } = countsFor({ byStatus: { banned: 1 }, drafts: 0 });

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.banned).toBe(1);
    expect(result.total).toBe(1);
  });

  it("includes statuses that have no field of their own in total only", async () => {
    const { useCase } = countsFor({
      byStatus: { active: 1, pending_review: 2, rejected: 3, draft: 4 },
      drafts: 5,
    });

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toEqual({
      active: 1,
      sold: 0,
      archived: 0,
      banned: 0,
      drafts: 5,
      total: 15,
    });
  });

  it("returns all zeros for a User with nothing", async () => {
    const { useCase } = countsFor({ byStatus: {}, drafts: 0 });

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toEqual({
      active: 0,
      sold: 0,
      archived: 0,
      banned: 0,
      drafts: 0,
      total: 0,
    });
  });

  it("returns a body that matches the contract schema", async () => {
    const { useCase } = countsFor({ byStatus: { active: 3 }, drafts: 2 });

    const result = await useCase.execute({ userId: "user-1" });

    expect(ListingsSchemas.MyListingCountsResponseSchema.parse(result)).toEqual(result);
    expect(result.active).toBe(3);
  });
});
