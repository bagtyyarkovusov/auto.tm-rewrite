import { Inject, Injectable } from "@nestjs/common";

import { ListingsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import {
  SELLER_PROFILE_PORT,
  type SellerProfilePort,
} from "../domain/ports/SellerProfilePort";
import {
  FAVORITE_REPOSITORY,
  type FavoriteRepository,
} from "../domain/ports/FavoriteRepository";
import {
  LISTING_CARD_READ_PORT,
  type ListingCardReadPort,
} from "../domain/ports/ListingCardReadPort";

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
    @Inject(LISTING_CARD_READ_PORT)
    private readonly cards: ListingCardReadPort,
    @Inject(SELLER_PROFILE_PORT)
    private readonly sellerProfiles: SellerProfilePort,
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
    const cards = await this.cards.getVisibleCards(listingIds);

    // Build a map for stable ordering and deduplication
    const cardMap = new Map(cards.map((s) => [s.id, s]));

    // Preserve favorite order (newest first), but only include visible listings
    const items = favoriteResult.items
      .map((f) => cardMap.get(f.listingId))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);
    const profiles = await this.sellerProfiles.getSellerProfiles(
      items.map((item) => item.sellerId),
    );

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
        photoKeys: item.photoKeys,
        photoCount: item.photoCount,
        mileageKm: item.mileageKm,
        condition: item.condition,
        transmissionId: item.transmissionId,
        engineTypeId: item.engineTypeId,
        cityId: item.cityId,
        publishedAt: item.publishedAt.toISOString(),
        sellerTrust: { phoneVerified: profiles.get(item.sellerId)?.phoneVerified ?? false },
        contactPhone: item.contactPhone,
        allowCalls: item.allowCalls,
        allowChat: item.allowChat,
      })),
      nextCursor: favoriteResult.nextCursor
        ? ListingsSchemas.encodeCursor(favoriteResult.nextCursor)
        : null,
    };
  }
}
