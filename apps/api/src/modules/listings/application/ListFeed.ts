import { Inject, Injectable } from "@nestjs/common";

import { ListingsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import { VERIFIED_PHONE_TRUST, type Currency, type ListingFilterCriteria } from "../domain/types";
import {
  FEED_RANKING_PORT,
  type FeedRankingPort,
} from "../domain/ports/FeedRankingPort";
import {
  EXCHANGE_RATE_PORT,
  type ExchangeRatePort,
} from "../domain/ports/ExchangeRatePort";
import {
  MEDIA_STORAGE_PORT,
  type MediaStoragePort,
} from "../domain/ports/MediaStoragePort";
import {
  FAVORITE_REPOSITORY,
  type FavoriteRepository,
} from "../domain/ports/FavoriteRepository";
import {
  LISTING_CARD_READ_PORT,
  type ListingCardReadPort,
} from "../domain/ports/ListingCardReadPort";
import { toCardPhotos } from "../domain/CardPhotos";

export interface ListFeedInput {
  /** Signed-in viewer, when the request carries one; drives `isFavorited`. */
  viewerId?: string;
  cursor?: string;
  limit?: number;
  filters?: ListingFilterCriteria;
}

export type FeedResponseDto = z.infer<typeof ListingsSchemas.FeedResponseSchema>;

@Injectable()
export class ListFeed {
  constructor(
    @Inject(FEED_RANKING_PORT)
    private readonly ranking: FeedRankingPort,
    @Inject(EXCHANGE_RATE_PORT)
    private readonly exchangeRates: ExchangeRatePort,
    @Inject(MEDIA_STORAGE_PORT)
    private readonly storage: MediaStoragePort,
    @Inject(FAVORITE_REPOSITORY)
    private readonly favorites: FavoriteRepository,
    @Inject(LISTING_CARD_READ_PORT)
    private readonly cards: ListingCardReadPort,
  ) {}

  async execute(input: ListFeedInput): Promise<FeedResponseDto> {
    const limit = Math.min(input.limit ?? 20, 50);

    const decodedCursor = input.cursor
      ? ListingsSchemas.decodeCursor(input.cursor)
      : undefined;

    const rankResult = await this.ranking.rank({
      ...(input.viewerId !== undefined ? { viewerId: input.viewerId } : {}),
      ...(decodedCursor !== undefined ? { cursor: decodedCursor } : {}),
      limit,
      ...(input.filters !== undefined ? { filters: input.filters } : {}),
    });

    const listingIds = rankResult.items.map((listing) => listing.id);
    const rateMap = await this.buildRateMap();
    // Batched per page, never per Listing: one media read, one favorites read.
    const photosById = await this.cards.getCardPhotos(listingIds);
    const favorited =
      input.viewerId !== undefined
        ? await this.favorites.favoritedListingIds(input.viewerId, listingIds)
        : undefined;
    const noPhotos = toCardPhotos([]);

    const items = rankResult.items.map((listing) => {
      const photos = photosById.get(listing.id) ?? noPhotos;
      const displayPriceTmt = this.computeDisplayPriceTmt(
        listing.priceAmount,
        listing.priceCurrency,
        rateMap,
      );

      return {
        id: listing.id,
        sellerId: listing.sellerId,
        status: listing.status,
        brandId: listing.brandId,
        modelId: listing.modelId,
        year: listing.year,
        priceAmount: listing.priceAmount,
        priceCurrency: listing.priceCurrency,
        displayPriceTmt,
        coverMediaKey: listing.coverMediaKey,
        photoKeys: photos.photoKeys,
        photoCount: photos.photoCount,
        ...(listing.mileageKm !== undefined ? { mileageKm: listing.mileageKm } : {}),
        ...(listing.condition !== undefined ? { condition: listing.condition } : {}),
        ...(listing.transmissionId !== undefined
          ? { transmissionId: listing.transmissionId }
          : {}),
        ...(listing.engineTypeId !== undefined ? { engineTypeId: listing.engineTypeId } : {}),
        cityId: listing.cityId,
        publishedAt: listing.publishedAt.toISOString(),
        sellerTrust: VERIFIED_PHONE_TRUST,
        ...(favorited !== undefined ? { isFavorited: favorited.has(listing.id) } : {}),
      };
    });

    return {
      items,
      nextCursor: rankResult.nextCursor
        ? ListingsSchemas.encodeCursor(rankResult.nextCursor)
        : null,
    };
  }

  private async buildRateMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>([["TMT", 1]]);
    const rates = await this.exchangeRates.listAll();
    for (const r of rates) {
      map.set(`${r.fromCurrency}->${r.toCurrency}`, r.rate);
    }
    return map;
  }

  private computeDisplayPriceTmt(
    priceAmount: number,
    priceCurrency: Currency,
    rateMap: Map<string, number>,
  ): number {
    if (priceCurrency === "TMT") return priceAmount;
    const rate = rateMap.get(`${priceCurrency}->TMT`);
    if (rate === undefined) {
      throw new Error(`Missing exchange rate ${priceCurrency} -> TMT`);
    }
    return priceAmount * rate;
  }
}
