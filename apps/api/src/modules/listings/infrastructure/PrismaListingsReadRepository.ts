import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import { toCardPhotos, type CardPhotos } from "../domain/CardPhotos";
import type {
  Currency,
  FeedCursor,
  ListingFilterCriteria,
  MediaKind,
} from "../domain/types";
import type {
  ListingsReadPort,
  ListingSummary,
  AdminListingSummary,
} from "../domain/ports/ListingsReadPort";
import type {
  ListingCard,
  ListingCardReadPort,
} from "../domain/ports/ListingCardReadPort";
import {
  EXCHANGE_RATE_PORT,
  type ExchangeRatePort,
} from "../domain/ports/ExchangeRatePort";

/**
 * One batched media read per query (not per row). A Listing holds at most
 * 20 photos + 1 video, so the full ordered key list stays small.
 */
const CARD_INCLUDE = {
  media: {
    orderBy: { sortOrder: "asc" as const },
    select: { key: true, kind: true },
  },
};

const VISIBLE_STATUSES = ["active", "sold", "archived"] as const;

type CardRow = {
  id: string;
  sellerId: string;
  status: string;
  brandId: string;
  modelId: string;
  year: number | null;
  priceAmount: number;
  priceCurrency: string;
  cityId: string;
  publishedAt: Date | null;
  mileageKm: number | null;
  condition: string | null;
  transmissionId: string | null;
  engineTypeId: string | null;
  contactPhone: string | null;
  allowCalls: boolean;
  allowChat: boolean;
  media: Array<{ key: string; kind: MediaKind }>;
};

@Injectable()
export class PrismaListingsReadRepository
  implements ListingsReadPort, ListingCardReadPort
{
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EXCHANGE_RATE_PORT)
    private readonly exchangeRates: ExchangeRatePort,
  ) {}

  async getListingSummary(id: string): Promise<ListingSummary | null> {
    const row = await this.prisma.listing.findUnique({
      where: { id, deletedAt: null },
      include: CARD_INCLUDE,
    });

    if (!row) return null;
    if (row.deletedAt) return null;
    if (row.status !== "active" && row.status !== "sold" && row.status !== "archived") {
      return null;
    }

    const [card] = await this.toCards([row]);
    return card ? toListingSummary(card) : null;
  }

  async getListingSummaries(ids: string[]): Promise<ListingSummary[]> {
    return (await this.getVisibleCards(ids)).map(toListingSummary);
  }

  async getCardPhotos(listingIds: string[]): Promise<Map<string, CardPhotos>> {
    if (listingIds.length === 0) return new Map();

    const rows = await this.prisma.listingMedia.findMany({
      where: { listingId: { in: listingIds } },
      orderBy: [{ listingId: "asc" }, { sortOrder: "asc" }],
      select: { listingId: true, key: true, kind: true },
    });

    const mediaByListing = new Map<string, Array<{ key: string; kind: MediaKind }>>();
    for (const row of rows) {
      const media = mediaByListing.get(row.listingId) ?? [];
      media.push({ key: row.key, kind: row.kind });
      mediaByListing.set(row.listingId, media);
    }

    return new Map(
      [...mediaByListing].map(([listingId, media]) => [listingId, toCardPhotos(media)]),
    );
  }

  async getVisibleCards(ids: string[]): Promise<ListingCard[]> {
    if (ids.length === 0) return [];

    const rows = await this.prisma.listing.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        status: { in: [...VISIBLE_STATUSES] },
      },
      include: CARD_INCLUDE,
    });

    return this.toCards(rows);
  }

  async getListingAdminSummaries(ids: string[]): Promise<AdminListingSummary[]> {
    if (ids.length === 0) return [];

    const rows = await this.prisma.listing.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      include: { brand: true, model: true },
    });

    return rows.map((r) => ({
      id: r.id,
      sellerId: r.sellerId,
      status: r.status,
      year: r.year ?? null,
      brandName: r.brand.nameRu,
      modelName: r.model.nameRu,
    }));
  }

  async getListingsForOwner(
    ownerId: string,
    query?: { cursor?: FeedCursor; limit?: number },
  ): Promise<{ items: ListingSummary[]; nextCursor?: FeedCursor }> {
    const result = await this.getOwnerCards(ownerId, query);
    return { ...result, items: result.items.map(toListingSummary) };
  }

  async getOwnerCards(
    ownerId: string,
    query?: { cursor?: FeedCursor; limit?: number },
  ): Promise<{ items: ListingCard[]; nextCursor?: FeedCursor }> {
    const take = (query?.limit ?? 20) + 1;

    const rows = await this.prisma.listing.findMany({
      where: {
        sellerId: ownerId,
        deletedAt: null,
      },
      take,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      ...(query?.cursor
        ? {
            skip: 1,
            cursor: { id: query.cursor.id },
          }
        : {}),
      include: CARD_INCLUDE,
    });

    const hasMore = rows.length === take;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    const result: {
      items: ListingCard[];
      nextCursor?: FeedCursor;
    } = {
      items: await this.toCards(items),
    };

    if (hasMore && last) {
      result.nextCursor = {
        timestamp: last.updatedAt.toISOString(),
        id: last.id,
      };
    }

    return result;
  }

  async matchesFilters(
    listingId: string,
    filters: ListingFilterCriteria,
  ): Promise<boolean> {
    const listing = await this.getListingSummary(listingId);
    if (!listing) return false;

    if (filters.brandId && listing.brandId !== filters.brandId) return false;
    if (filters.modelId && listing.modelId !== filters.modelId) return false;
    if (filters.cityId && listing.cityId !== filters.cityId) return false;
    if (filters.priceMin != null && listing.displayPriceTmt < filters.priceMin)
      return false;
    if (filters.priceMax != null && listing.displayPriceTmt > filters.priceMax)
      return false;
    if (filters.yearMin != null &&
      (listing.year == null || listing.year < filters.yearMin))
      return false;
    if (filters.yearMax != null &&
      (listing.year == null || listing.year > filters.yearMax))
      return false;
    if (filters.condition) {
      // condition is not part of ListingSummary; would need to fetch full row
      // For S4, no consumer calls this yet; return true for condition check
      // TODO: extend ListingSummary with condition when S5 activates filters
    }

    return true;
  }

  /** Maps a page of rows to cards, reading exchange rates at most once. */
  private async toCards(rows: CardRow[]): Promise<ListingCard[]> {
    const needsRates = rows.some((r) => r.priceCurrency !== "TMT");
    const rates = needsRates ? await this.exchangeRates.listAll() : [];
    const toTmt = new Map<string, number>(
      rates.filter((r) => r.toCurrency === "TMT").map((r) => [r.fromCurrency, r.rate]),
    );

    return rows.map((row) => this.toCard(row, toTmt));
  }

  private toCard(row: CardRow, toTmt: Map<string, number>): ListingCard {
    const card: ListingCard = {
      id: row.id,
      sellerId: row.sellerId,
      status: row.status as "active" | "sold" | "archived" | "banned",
      brandId: row.brandId,
      modelId: row.modelId,
      priceAmount: row.priceAmount,
      priceCurrency: row.priceCurrency as Currency,
      displayPriceTmt: this.computeDisplayPriceTmt(
        row.priceAmount,
        row.priceCurrency as Currency,
        toTmt,
      ),
      cityId: row.cityId,
      publishedAt: row.publishedAt ?? new Date(),
      allowCalls: row.allowCalls,
      allowChat: row.allowChat,
      ...toCardPhotos(row.media),
    };

    if (row.year !== null) card.year = row.year;
    if (row.mileageKm !== null) card.mileageKm = row.mileageKm;
    if (row.condition !== null) card.condition = row.condition as "new" | "used";
    if (row.transmissionId !== null) card.transmissionId = row.transmissionId;
    if (row.engineTypeId !== null) card.engineTypeId = row.engineTypeId;
    if (row.contactPhone !== null) card.contactPhone = row.contactPhone;

    return card;
  }

  private computeDisplayPriceTmt(
    priceAmount: number,
    priceCurrency: Currency,
    toTmt: Map<string, number>,
  ): number {
    if (priceCurrency === "TMT") return priceAmount;
    const rate = toTmt.get(priceCurrency);
    if (rate === undefined || rate <= 0) {
      throw new Error(`Missing exchange rate ${priceCurrency} -> TMT`);
    }
    return priceAmount * rate;
  }
}

/**
 * Narrows a card to the cross-context `ListingSummary` fields so card-only
 * data (notably `contactPhone`) never reaches other contexts at runtime.
 */
function toListingSummary(card: ListingCard): ListingSummary {
  const summary: ListingSummary = {
    id: card.id,
    sellerId: card.sellerId,
    status: card.status,
    brandId: card.brandId,
    modelId: card.modelId,
    priceAmount: card.priceAmount,
    priceCurrency: card.priceCurrency,
    displayPriceTmt: card.displayPriceTmt,
    cityId: card.cityId,
    publishedAt: card.publishedAt,
    allowChat: card.allowChat,
  };
  if (card.year !== undefined) summary.year = card.year;
  if (card.coverMediaKey !== undefined) summary.coverMediaKey = card.coverMediaKey;
  return summary;
}
