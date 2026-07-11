import { describe, it, expect, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";

import type { InspectionInterestRepository } from "../domain/ports/InspectionInterestRepository";

import { ListInspectionInterestStats } from "./ListInspectionInterestStats";

class FakeInspectionInterestRepository implements InspectionInterestRepository {
  aggregate: Array<{
    listingId: string;
    totalInterest: number;
    buyerInterest: number;
    sellerInterest: number;
    willingnessToPayTmtSum: number;
    willingnessToPayTmtCount: number;
    willingnessToPayTmtAvg: number | null;
  }> = [];

  async save(): Promise<never> {
    throw new Error("Not implemented");
  }

  async findByListingAndRequester(): Promise<null> {
    return null;
  }

  async update(): Promise<never> {
    throw new Error("Not implemented");
  }

  async aggregateByListing(params: { page: number; pageSize: number }) {
    const start = (params.page - 1) * params.pageSize;
    const items = this.aggregate.slice(start, start + params.pageSize);
    return { items, total: this.aggregate.length };
  }
}

function makeUseCase(repo?: FakeInspectionInterestRepository) {
  return new ListInspectionInterestStats(
    repo ?? new FakeInspectionInterestRepository(),
  );
}

describe("ListInspectionInterestStats", () => {
  let repo: FakeInspectionInterestRepository;

  beforeEach(() => {
    repo = new FakeInspectionInterestRepository();
  });

  it("returns aggregate counts by listing", async () => {
    repo.aggregate = [
      {
        listingId: "listing-1",
        totalInterest: 3,
        buyerInterest: 2,
        sellerInterest: 1,
        willingnessToPayTmtSum: 9000,
        willingnessToPayTmtCount: 2,
        willingnessToPayTmtAvg: 4500,
      },
    ];

    const uc = makeUseCase(repo);
    const result = await uc.execute({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      listingId: "listing-1",
      totalInterest: 3,
      buyerInterest: 2,
      sellerInterest: 1,
      willingnessToPayTmtAvg: 4500,
    });
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("paginates results", async () => {
    repo.aggregate = Array.from({ length: 11 }, (_, i) => ({
      listingId: `listing-${i}`,
      totalInterest: 1,
      buyerInterest: 1,
      sellerInterest: 0,
      willingnessToPayTmtSum: 0,
      willingnessToPayTmtCount: 0,
      willingnessToPayTmtAvg: null,
    }));

    const uc = makeUseCase(repo);
    const result = await uc.execute({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(10);
    expect(result.totalPages).toBe(2);
  });

  it("returns 400 for invalid page", async () => {
    const uc = makeUseCase(repo);
    await expect(uc.execute({ page: 0 })).rejects.toThrow(BadRequestException);
  });

  it("returns 400 for invalid pageSize", async () => {
    const uc = makeUseCase(repo);
    await expect(uc.execute({ pageSize: 500 })).rejects.toThrow(
      BadRequestException,
    );
  });
});
