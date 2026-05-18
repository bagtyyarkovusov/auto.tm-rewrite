import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import { ListingMedia } from "../domain/ListingMedia";
import type { ListingMediaRepository } from "../domain/ports/ListingMediaRepository";

@Injectable()
export class PrismaListingMediaRepository implements ListingMediaRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(media: ListingMedia): Promise<ListingMedia> {
    const row = await this.prisma.listingMedia.create({
      data: {
        id: media.id,
        listingId: media.listingId,
        kind: media.kind,
        key: media.key,
        sortOrder: media.sortOrder,
        width: media.width ?? null,
        height: media.height ?? null,
        durationMs: media.durationMs ?? null,
        posterKey: media.posterKey ?? null,
        createdAt: media.createdAt,
      },
    });
    return this.toDomain(row);
  }

  async findById(id: string): Promise<ListingMedia | null> {
    const row = await this.prisma.listingMedia.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByListingId(listingId: string): Promise<ListingMedia[]> {
    const rows = await this.prisma.listingMedia.findMany({
      where: { listingId },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.listingMedia.delete({ where: { id } });
  }

  async updateSortOrder(
    listingId: string,
    orders: { mediaId: string; sortOrder: number }[],
  ): Promise<void> {
    await this.prisma.$transaction(
      orders.map((o) =>
        this.prisma.listingMedia.update({
          where: { id: o.mediaId, listingId },
          data: { sortOrder: o.sortOrder },
        }),
      ),
    );
  }

  private toDomain(row: {
    id: string;
    listingId: string;
    kind: string;
    key: string;
    sortOrder: number;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    posterKey: string | null;
    createdAt: Date;
  }): ListingMedia {
    return ListingMedia.create({
      id: row.id,
      listingId: row.listingId,
      kind: row.kind as "image" | "video",
      key: row.key,
      sortOrder: row.sortOrder,
      ...(row.width !== null ? { width: row.width } : {}),
      ...(row.height !== null ? { height: row.height } : {}),
      ...(row.durationMs !== null ? { durationMs: row.durationMs } : {}),
      ...(row.posterKey !== null ? { posterKey: row.posterKey } : {}),
      createdAt: row.createdAt,
    });
  }
}
