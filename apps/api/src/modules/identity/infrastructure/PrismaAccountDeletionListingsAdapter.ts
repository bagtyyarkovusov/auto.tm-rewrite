import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type { AccountDeletionListingsPort } from "../domain/ports/AccountDeletionListingsPort";

@Injectable()
export class PrismaAccountDeletionListingsAdapter implements AccountDeletionListingsPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async archiveActiveListingsBySeller(sellerId: string): Promise<void> {
    await this.prisma.listing.updateMany({
      where: {
        sellerId,
        status: "active",
      },
      data: {
        status: "archived",
        archivedByDeletion: true,
      },
    });
  }

  async republishArchivedByDeletionListingsBySeller(sellerId: string): Promise<void> {
    await this.prisma.listing.updateMany({
      where: {
        sellerId,
        status: "archived",
        archivedByDeletion: true,
      },
      data: {
        status: "active",
        archivedByDeletion: false,
        publishedAt: new Date(),
      },
    });
  }
}
