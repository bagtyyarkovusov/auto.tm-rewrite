import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import { Listing } from "../domain/Listing";
import type { FeedRankingPort } from "../domain/ports/FeedRankingPort";
import type { FeedCursor, ListingFilterCriteria } from "../domain/types";

@Injectable()
export class ChronologicalRankingAdapter implements FeedRankingPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async rank(query: {
    viewerId?: string;
    filters?: ListingFilterCriteria;
    cursor?: FeedCursor;
    limit: number;
  }): Promise<{ items: Listing[]; nextCursor?: FeedCursor }> {
    const take = query.limit + 1;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.listing.findMany({
      where: {
        deletedAt: null,
        OR: [
          { status: "active" },
          { status: "sold", soldAt: { gt: fourteenDaysAgo } },
        ],
        ...(query.cursor
          ? {
              AND: [
                {
                  OR: [
                    { publishedAt: { lt: new Date(query.cursor.timestamp) } },
                    {
                      publishedAt: {
                        equals: new Date(query.cursor.timestamp),
                      },
                      id: { lt: query.cursor.id },
                    },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take,
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
    createdAt: Date;
    updatedAt: Date;
  }): Listing {
    return Listing.create({
      id: row.id,
      sellerId: row.sellerId,
      status: row.status as "active" | "sold" | "archived",
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
    });
  }
}
