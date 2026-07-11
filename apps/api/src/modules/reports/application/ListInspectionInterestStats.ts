import { Inject, Injectable, BadRequestException } from "@nestjs/common";

import { AdminTablePaginationRequestSchema } from "@auto-tm/contracts";

import type { InspectionInterestRepository } from "../domain/ports/InspectionInterestRepository";
import { INSPECTION_INTEREST_REPOSITORY } from "../domain/ports/InspectionInterestRepository";

export interface ListInspectionInterestStatsInput {
  page?: number;
  pageSize?: number;
}

export interface ListInspectionInterestStatsResult {
  items: Array<{
    listingId: string;
    totalInterest: number;
    buyerInterest: number;
    sellerInterest: number;
    willingnessToPayTmtSum: number;
    willingnessToPayTmtCount: number;
    willingnessToPayTmtAvg: number | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class ListInspectionInterestStats {
  constructor(
    @Inject(INSPECTION_INTEREST_REPOSITORY)
    private readonly repo: InspectionInterestRepository,
  ) {}

  async execute(
    input: ListInspectionInterestStatsInput,
  ): Promise<ListInspectionInterestStatsResult> {
    const { page, pageSize } = this.validate(input);

    const { items, total } = await this.repo.aggregateByListing({
      page,
      pageSize,
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private validate(input: ListInspectionInterestStatsInput): {
    page: number;
    pageSize: number;
  } {
    try {
      return AdminTablePaginationRequestSchema.parse({
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 50,
      });
    } catch {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Invalid pagination",
      });
    }
  }
}
