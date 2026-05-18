import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type { Prisma } from "@auto-tm/db";

import { ListingDraft } from "../domain/ListingDraft";
import type { ListingDraftRepository } from "../domain/ports/ListingDraftRepository";

@Injectable()
export class PrismaListingDraftRepository implements ListingDraftRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(draft: ListingDraft): Promise<ListingDraft> {
    const row = await this.prisma.listingDraft.create({
      data: {
        id: draft.id,
        userId: draft.userId,
        payload: draft.payload as Prisma.InputJsonValue,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      },
    });
    return this.toDomain(row);
  }

  async findById(id: string): Promise<ListingDraft | null> {
    const row = await this.prisma.listingDraft.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(
    userId: string,
    opts?: { cursor?: { timestamp: string; id: string } | undefined; limit?: number | undefined },
  ): Promise<{ items: ListingDraft[]; nextCursor?: { timestamp: string; id: string } | undefined }> {
    const take = (opts?.limit ?? 20) + 1;

    const rows = await this.prisma.listingDraft.findMany({
      where: { userId },
      take,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
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
    const nextCursor = hasMore && last
      ? { timestamp: last.updatedAt.toISOString(), id: last.id }
      : undefined;

    return { items: items.map((r) => this.toDomain(r as { id: string; userId: string; payload: unknown; createdAt: Date; updatedAt: Date })), nextCursor };
  }

  async update(draft: ListingDraft): Promise<ListingDraft> {
    const row = await this.prisma.listingDraft.update({
      where: { id: draft.id },
      data: {
        payload: draft.payload as Prisma.InputJsonValue,
        updatedAt: draft.updatedAt,
      },
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.listingDraft.delete({ where: { id } });
  }

  private toDomain(row: {
    id: string;
    userId: string;
    payload: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ListingDraft {
    return new ListingDraft(
      row.id,
      row.userId,
      row.payload as Record<string, unknown>,
      row.createdAt,
      row.updatedAt,
    );
  }
}
