import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import { Favorite } from "../domain/Favorite";
import {
  INACTIVE_VISIBLE_LISTING_STATUSES,
  VISIBLE_LISTING_STATUSES,
  type ListingStatus,
} from "../domain/ListingStatus";
import type {
  FavoriteRepository,
  VisibleFavoriteCounts,
  VisibleFavoriteOptions,
} from "../domain/ports/FavoriteRepository";

const ACTIVE_ONLY_STATUSES: readonly ListingStatus[] = ["active"];

/** A Listing a User can see: not deleted and in one of `statuses`. */
function visibleListing(statuses: readonly ListingStatus[]) {
  return { deletedAt: null, status: { in: [...statuses] } };
}

@Injectable()
export class PrismaFavoriteRepository implements FavoriteRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async add(userId: string, listingId: string): Promise<Favorite> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.favorite.findUnique({
        where: { userId_listingId: { userId, listingId } },
      });
      if (existing) {
        return this.toDomain(existing);
      }

      const created = await tx.favorite.create({
        data: { userId, listingId },
      });

      await tx.listing.update({
        where: { id: listingId },
        data: { favoriteCount: { increment: 1 } },
      });

      return this.toDomain(created);
    });
  }

  async remove(userId: string, listingId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.favorite.deleteMany({
        where: { userId, listingId },
      });

      if (result.count > 0) {
        await tx.listing.update({
          where: { id: listingId },
          data: { favoriteCount: { decrement: 1 } },
        });
      }

      return result.count > 0;
    });
  }

  async exists(userId: string, listingId: string): Promise<boolean> {
    const row = await this.prisma.favorite.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    return row !== null;
  }

  async favoritedListingIds(userId: string, listingIds: string[]): Promise<Set<string>> {
    if (listingIds.length === 0) return new Set();

    const rows = await this.prisma.favorite.findMany({
      where: { userId, listingId: { in: listingIds } },
      select: { listingId: true },
    });
    return new Set(rows.map((r) => r.listingId));
  }

  async listVisibleByUserId(
    userId: string,
    opts?: VisibleFavoriteOptions,
  ): Promise<{ items: Favorite[]; nextCursor?: { timestamp: string; id: string } }> {
    const take = (opts?.limit ?? 20) + 1;
    const statuses = opts?.activeOnly ? ACTIVE_ONLY_STATUSES : VISIBLE_LISTING_STATUSES;

    const rows = await this.prisma.favorite.findMany({
      where: { userId, listing: visibleListing(statuses) },
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(opts?.cursor
        ? {
            skip: 1,
            cursor: { id: opts.cursor.id },
          }
        : {}),
    });

    const hasMore = rows.length === take;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    const result: {
      items: Favorite[];
      nextCursor?: { timestamp: string; id: string };
    } = {
      items: items.map((r) => this.toDomain(r)),
    };

    if (hasMore && last) {
      result.nextCursor = { timestamp: last.createdAt.toISOString(), id: last.id };
    }

    return result;
  }

  async countVisibleByUserId(userId: string): Promise<VisibleFavoriteCounts> {
    const [total, inactive] = await Promise.all([
      this.prisma.favorite.count({
        where: { userId, listing: visibleListing(VISIBLE_LISTING_STATUSES) },
      }),
      this.prisma.favorite.count({
        where: { userId, listing: visibleListing(INACTIVE_VISIBLE_LISTING_STATUSES) },
      }),
    ]);
    return { total, inactive };
  }

  private toDomain(row: {
    id: string;
    userId: string;
    listingId: string;
    createdAt: Date;
  }): Favorite {
    return Favorite.create({
      id: row.id,
      userId: row.userId,
      listingId: row.listingId,
      createdAt: row.createdAt,
    });
  }
}
