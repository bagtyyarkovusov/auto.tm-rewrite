import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { ListingsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import {
  FAVORITE_REPOSITORY,
  type FavoriteRepository,
} from "../domain/ports/FavoriteRepository";
import {
  LISTING_REPOSITORY,
  type ListingRepository,
} from "../domain/ports/ListingRepository";

export interface AddFavoriteInput {
  userId: string;
  listingId: string;
}

export type AddFavoriteResponseDto = z.infer<
  typeof ListingsSchemas.AddFavoriteResponseSchema
>;

@Injectable()
export class AddFavorite {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favorites: FavoriteRepository,
    @Inject(LISTING_REPOSITORY)
    private readonly listings: ListingRepository,
  ) {}

  async execute(input: AddFavoriteInput): Promise<AddFavoriteResponseDto> {
    const listing = await this.listings.findById(input.listingId);

    if (!listing || listing.deletedAt) {
      throw new NotFoundException("Listing not found");
    }

    if (listing.status !== "active") {
      throw new NotFoundException("Listing not found");
    }

    const favorite = await this.favorites.add(input.userId, input.listingId);

    return {
      id: favorite.id,
      userId: favorite.userId,
      listingId: favorite.listingId,
      createdAt: favorite.createdAt.toISOString(),
    };
  }
}
