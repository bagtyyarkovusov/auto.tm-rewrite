import { Inject, Injectable } from "@nestjs/common";

import { ListingsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import {
  FAVORITE_REPOSITORY,
  type FavoriteRepository,
} from "../domain/ports/FavoriteRepository";
import {
  LISTINGS_READ_PORT,
  type ListingsReadPort,
} from "../domain/ports/ListingsReadPort";

export interface ListMyFavoritesInput {
  userId: string;
  cursor?: string;
  limit?: number;
}

export type MyFavoritesResponseDto = z.infer<
  typeof ListingsSchemas.MyFavoritesResponseSchema
>;

@Injectable()
export class ListMyFavorites {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favorites: FavoriteRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listingsRead: ListingsReadPort,
  ) {}

  async execute(input: ListMyFavoritesInput): Promise<MyFavoritesResponseDto> {
    const limit = Math.min(input.limit ?? 20, 50);

    const decodedCursor = input.cursor
      ? ListingsSchemas.decodeCursor(input.cursor)
      : undefined;

    const favoriteResult = await this.favorites.listByUserId(input.userId, {
      ...(decodedCursor !== undefined ? { cursor: decodedCursor } : {}),
      limit,
    });

    const listingIds = favoriteResult.items.map((f) => f.listingId);
    const summaries = await this.listingsRead.getListingSummaries(listingIds);

    // Build a map for stable ordering and deduplication
    const summaryMap = new Map(summaries.map((s) => [s.id, s]));

    // Preserve favorite order (newest first), but only include visible listings
    const items = favoriteResult.items
      .map((f) => summaryMap.get(f.listingId))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    return {
      items: items.map((item) => ({
        id: item.id,
        sellerId: item.sellerId,
        status: item.status,
        brandId: item.brandId,
        modelId: item.modelId,
        year: item.year,
        priceAmount: item.priceAmount,
        priceCurrency: item.priceCurrency,
        displayPriceTmt: item.displayPriceTmt,
        coverMediaKey: item.coverMediaKey,
        cityId: item.cityId,
        publishedAt: item.publishedAt.toISOString(),
      })),
      nextCursor: favoriteResult.nextCursor
        ? ListingsSchemas.encodeCursor(favoriteResult.nextCursor)
        : null,
    };
  }
}
