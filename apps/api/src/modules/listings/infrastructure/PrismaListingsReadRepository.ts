import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { Currency, FeedCursor, ListingFilterCriteria } from "../domain/types";
import type {
  ListingsReadPort,
  ListingSummary,
  AdminListingSummary,
} from "../domain/ports/ListingsReadPort";
import {
  EXCHANGE_RATE_PORT,
  type ExchangeRatePort,
} from "../domain/ports/ExchangeRatePort";

@Injectable()
export class PrismaListingsReadRepository implements ListingsReadPort {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EXCHANGE_RATE_PORT)
    private readonly exchangeRates: ExchangeRatePort,
  ) {}

  async getListingSummary(id: string): Promise<ListingSummary | null> {
    const row = await this.prisma.listing.findUnique({
      where: { id, deletedAt: null },
      include: { media: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });

    if (!row) return null;
    if (row.deletedAt) return null;
    if (row.status !== "active" && row.status !== "sold" && row.status !== "archived") {
      return null;
    }

    return this.toSummary(row);
  }

  async getListingSummaries(ids: string[]): Promise<ListingSummary[]> {
    if (ids.length === 0) return [];

    const rows = await this.prisma.listing.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        status: { in: ["active", "sold", "archived"] },
      },
      include: { media: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });

    return Promise.all(rows.map((r) => this.toSummary(r)));
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
      include: { media: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });

    const hasMore = rows.length === take;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    const result: {
      items: ListingSummary[];
      nextCursor?: FeedCursor;
    } = {
      items: await Promise.all(items.map((r) => this.toSummary(r))),
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

  private async toSummary(row: {
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
    allowChat: boolean;
    media: Array<{ key: string }>;
  }): Promise<ListingSummary> {
    const displayPriceTmt = await this.computeDisplayPriceTmt(
      row.priceAmount,
      row.priceCurrency as Currency,
    );

    const summary: ListingSummary = {
      id: row.id,
      sellerId: row.sellerId,
      status: row.status as "active" | "sold" | "archived" | "banned",
      brandId: row.brandId,
      modelId: row.modelId,
      priceAmount: row.priceAmount,
      priceCurrency: row.priceCurrency as "TMT" | "USD" | "AED",
      displayPriceTmt,
      cityId: row.cityId,
      publishedAt: row.publishedAt ?? new Date(),
      allowChat: row.allowChat,
    };

    if (row.year !== null && row.year !== undefined) {
      summary.year = row.year;
    }
    if (row.media[0]?.key) {
      summary.coverMediaKey = row.media[0].key;
    }

    return summary;
  }

  private async computeDisplayPriceTmt(
    priceAmount: number,
    priceCurrency: Currency,
  ): Promise<number> {
    if (priceCurrency === "TMT") return priceAmount;
    const rate = await this.exchangeRates.getRate(priceCurrency, "TMT");
    if (rate <= 0) {
      throw new Error(`Missing exchange rate ${priceCurrency} -> TMT`);
    }
    return priceAmount * rate;
  }
}
