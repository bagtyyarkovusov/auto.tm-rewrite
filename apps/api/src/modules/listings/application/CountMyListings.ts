import { Inject, Injectable } from "@nestjs/common";

import { ListingsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import {
  OWNER_LISTING_COUNTS_PORT,
  type OwnerListingCountsPort,
} from "../domain/ports/OwnerListingCountsPort";

export interface CountMyListingsInput {
  userId: string;
}

export type MyListingCountsDto = z.infer<
  typeof ListingsSchemas.MyListingCountsResponseSchema
>;

@Injectable()
export class CountMyListings {
  constructor(
    @Inject(OWNER_LISTING_COUNTS_PORT)
    private readonly counts: OwnerListingCountsPort,
  ) {}

  async execute(input: CountMyListingsInput): Promise<MyListingCountsDto> {
    await this.counts.countForOwner(input.userId);
    return { active: 0, sold: 0, archived: 0, banned: 0, drafts: 0, total: 0 };
  }
}
