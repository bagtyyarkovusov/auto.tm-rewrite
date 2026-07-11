import type { InspectionInterest } from "../InspectionInterest";

export interface InspectionInterestCountItem {
  listingId: string;
  totalInterest: number;
  buyerInterest: number;
  sellerInterest: number;
  willingnessToPayTmtSum: number;
  willingnessToPayTmtCount: number;
  willingnessToPayTmtAvg: number | null;
}

export interface InspectionInterestRepository {
  save(interest: InspectionInterest): Promise<InspectionInterest>;
  findByListingAndRequester(
    listingId: string,
    requesterUserId: string,
  ): Promise<InspectionInterest | null>;
  update(
    interest: InspectionInterest,
  ): Promise<InspectionInterest>;
  aggregateByListing(params: {
    page: number;
    pageSize: number;
  }): Promise<{ items: InspectionInterestCountItem[]; total: number }>;
}

export const INSPECTION_INTEREST_REPOSITORY = Symbol(
  "InspectionInterestRepository",
);
