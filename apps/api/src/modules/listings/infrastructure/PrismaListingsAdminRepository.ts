import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { ListingsAdminPort } from "../domain/ports/ListingsAdminPort";

@Injectable()
export class PrismaListingsAdminRepository implements ListingsAdminPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async banActiveListing(listingId: string, tx?: unknown): Promise<{ status: string }> {
    const client = this.getClient(tx);
    const row = await client.listing.update({
      where: { id: listingId, status: "active" },
      data: { status: "banned" },
    });
    return { status: row.status };
  }

  async unbanBannedListing(listingId: string, tx?: unknown): Promise<{ status: string }> {
    const client = this.getClient(tx);
    const row = await client.listing.update({
      where: { id: listingId, status: "banned" },
      data: { status: "active" },
    });
    return { status: row.status };
  }

  private getClient(tx?: unknown): PrismaService {
    return (tx as PrismaService | undefined) ?? this.prisma;
  }
}
