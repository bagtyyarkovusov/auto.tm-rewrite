import { Inject, Injectable } from "@nestjs/common";

import type { ListingsSchemas } from "@auto-tm/contracts";

import {
  OWNER_LISTING_COUNTS_PORT,
  type OwnerListingCountsPort,
} from "../domain/ports/OwnerListingCountsPort";

export interface CountMyListingsInput {
  userId: string;
}

export type MyListingCountsDto = ListingsSchemas.MyListingCountsResponse;

@Injectable()
export class CountMyListings {
  constructor(
    @Inject(OWNER_LISTING_COUNTS_PORT)
    private readonly counts: OwnerListingCountsPort,
  ) {}

  async execute(input: CountMyListingsInput): Promise<MyListingCountsDto> {
    const { byStatus, drafts } = await this.counts.countForOwner(input.userId);

    // `total` covers every stored status, including the ones the response has
    // no field for, so it is summed from `byStatus` rather than the five fields.
    const listings = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

    return {
      active: byStatus["active"] ?? 0,
      sold: byStatus["sold"] ?? 0,
      archived: byStatus["archived"] ?? 0,
      banned: byStatus["banned"] ?? 0,
      drafts,
      total: listings + drafts,
    };
  }
}
