import { Inject, Injectable } from "@nestjs/common";
import { PrismaService, type Prisma } from "@auto-tm/db";

import { Listing } from "../domain/Listing";
import type { FeedRankingPort } from "../domain/ports/FeedRankingPort";
import {
  EXCHANGE_RATE_PORT,
  type ExchangeRatePort,
} from "../domain/ports/ExchangeRatePort";
import type { Currency, FeedCursor, ListingFilterCriteria } from "../domain/types";

@Injectable()
export class ChronologicalRankingAdapter implements FeedRankingPort {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EXCHANGE_RATE_PORT)
    private readonly exchangeRates: ExchangeRatePort,
  ) {}

  async rank(query: {
    viewerId?: string;
    filters?: ListingFilterCriteria;
    cursor?: FeedCursor;
    limit: number;
  }): Promise<{ items: Listing[]; nextCursor?: FeedCursor }> {
    const take = query.limit + 1;
    const where = await this.buildWhere(query.filters, query.cursor);

    const rows = await this.prisma.listing.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take,
      include: {
        media: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    });

    const hasMore = rows.length === take;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    const result: { items: Listing[]; nextCursor?: FeedCursor } = {
      items: items.map((r) => this.toDomain(r)),
    };

    if (hasMore && last && last.publishedAt) {
      result.nextCursor = {
        timestamp: last.publishedAt.toISOString(),
        id: last.id,
      };
    }

    return result;
  }

  async count(query: { filters?: ListingFilterCriteria }): Promise<number> {
    const where = await this.buildWhere(query.filters, undefined);
    return this.prisma.listing.count({ where });
  }

  private async buildWhere(
    filters: ListingFilterCriteria | undefined,
    cursor: FeedCursor | undefined,
  ): Promise<Prisma.ListingWhereInput> {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const conditions: Prisma.ListingWhereInput[] = [
      { deletedAt: null },
      {
        OR: [
          { status: "active" },
          { status: "sold", soldAt: { gt: fourteenDaysAgo } },
        ],
      },
    ];

    if (filters?.brandId) {
      conditions.push({ brandId: filters.brandId });
    }
    if (filters?.modelId) {
      conditions.push({ modelId: filters.modelId });
    }
    if (filters?.cityId) {
      conditions.push({ cityId: filters.cityId });
    }
    if (filters?.condition) {
      conditions.push({ condition: filters.condition });
    }

    if (filters?.yearMin !== undefined || filters?.yearMax !== undefined) {
      conditions.push({
        year: {
          ...(filters.yearMin !== undefined ? { gte: filters.yearMin } : {}),
          ...(filters.yearMax !== undefined ? { lte: filters.yearMax } : {}),
        },
      });
    }

    if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
      const priceOr = await this.buildPriceFilter(filters.priceMin, filters.priceMax);
      if (priceOr.length > 0) {
        conditions.push({ OR: priceOr });
      }
    }

    if (cursor) {
      conditions.push({
        OR: [
          { publishedAt: { lt: new Date(cursor.timestamp) } },
          {
            publishedAt: { equals: new Date(cursor.timestamp) },
            id: { lt: cursor.id },
          },
        ],
      });
    }

    return { AND: conditions };
  }

  private async buildPriceFilter(
    priceMin?: number,
    priceMax?: number,
  ): Promise<Array<Prisma.ListingWhereInput>> {
    const rates = await this.exchangeRates.listAll();
    const rateMap = new Map<string, number>();
    for (const r of rates) {
      rateMap.set(`${r.fromCurrency}->${r.toCurrency}`, r.rate);
    }

    const currencies: Currency[] = ["TMT", "USD", "AED"];
    const branches: Array<Prisma.ListingWhereInput> = [];

    for (const currency of currencies) {
      let min: number | undefined;
      let max: number | undefined;

      if (currency === "TMT") {
        min = priceMin;
        max = priceMax;
      } else {
        const rate = rateMap.get(`${currency}->TMT`);
        if (!rate || rate <= 0) {
          continue;
        }
        min = priceMin !== undefined ? priceMin / rate : undefined;
        max = priceMax !== undefined ? priceMax / rate : undefined;
      }

      branches.push({
        priceCurrency: currency,
        ...(min !== undefined || max !== undefined
          ? {
              priceAmount: {
                ...(min !== undefined ? { gte: min } : {}),
                ...(max !== undefined ? { lte: max } : {}),
              },
            }
          : {}),
      });
    }

    return branches;
  }

  private toDomain(row: {
    id: string;
    sellerId: string;
    status: string;
    brandId: string;
    modelId: string;
    generationId: string | null;
    year: number | null;
    vin: string | null;
    cityId: string;
    regionId: string | null;
    priceAmount: number;
    priceCurrency: string;
    contactPhone: string | null;
    allowCalls: boolean;
    allowChat: boolean;
    publishedAt: Date | null;
    soldAt: Date | null;
    deletedAt: Date | null;
    condition: string | null;
    colorId: string | null;
    bodyTypeId: string | null;
    engineTypeId: string | null;
    transmissionId: string | null;
    driveTypeId: string | null;
    enginePower: number | null;
    mileageKm: number | null;
    locationText: string | null;
    description: string | null;
    viewCount: number;
    favoriteCount: number;
    acceptsExchange: boolean;
    installmentAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
    media: Array<{ key: string }>;
  }): Listing {
    return Listing.create({
      id: row.id,
      sellerId: row.sellerId,
      status: row.status as "active" | "sold" | "archived" | "banned",
      brandId: row.brandId,
      modelId: row.modelId,
      cityId: row.cityId,
      priceAmount: row.priceAmount,
      priceCurrency: row.priceCurrency as "TMT" | "USD" | "AED",
      allowCalls: row.allowCalls,
      allowChat: row.allowChat,
      publishedAt: row.publishedAt ?? new Date(),
      viewCount: row.viewCount,
      favoriteCount: row.favoriteCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...(row.generationId ? { generationId: row.generationId } : {}),
      ...(row.year ? { year: row.year } : {}),
      ...(row.vin ? { vin: row.vin } : {}),
      ...(row.regionId ? { regionId: row.regionId } : {}),
      ...(row.contactPhone ? { contactPhone: row.contactPhone } : {}),
      ...(row.soldAt ? { soldAt: row.soldAt } : {}),
      ...(row.deletedAt ? { deletedAt: row.deletedAt } : {}),
      ...(row.condition ? { condition: row.condition as "new" | "used" } : {}),
      ...(row.colorId ? { colorId: row.colorId } : {}),
      ...(row.bodyTypeId ? { bodyTypeId: row.bodyTypeId } : {}),
      ...(row.engineTypeId ? { engineTypeId: row.engineTypeId } : {}),
      ...(row.transmissionId ? { transmissionId: row.transmissionId } : {}),
      ...(row.driveTypeId ? { driveTypeId: row.driveTypeId } : {}),
      ...(row.enginePower ? { enginePower: row.enginePower } : {}),
      ...(row.mileageKm ? { mileageKm: row.mileageKm } : {}),
      ...(row.locationText ? { locationText: row.locationText } : {}),
      ...(row.description ? { description: row.description } : {}),
      acceptsExchange: row.acceptsExchange,
      installmentAvailable: row.installmentAvailable,
      ...(row.media[0]?.key ? { coverMediaKey: row.media[0].key } : {}),
    });
  }
}
