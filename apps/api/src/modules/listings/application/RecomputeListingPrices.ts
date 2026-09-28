import { Inject, Injectable } from "@nestjs/common";

import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from "../domain/ports/ListingRepository";

export interface RecomputeListingPricesOutput {
  /** Listings whose `priceTmt` changed. */
  changed: number;
}

/**
 * Re-derives every Listing's stored TMT price after an exchange-rate change, so
 * price sort and the Results price range follow the new rate. Rates have no API
 * write path yet; operators run `pnpm --filter @auto-tm/db listing-prices:recompute`,
 * which executes the same query.
 */
@Injectable()
export class RecomputeListingPrices {
  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {}

  async execute(): Promise<RecomputeListingPricesOutput> {
    const changed = await this.listings.recomputePriceTmt();
    return { changed };
  }
}
