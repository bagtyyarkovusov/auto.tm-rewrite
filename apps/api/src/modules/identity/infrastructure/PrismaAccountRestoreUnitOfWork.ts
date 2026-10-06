import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type {
  AccountRestoreUnitOfWork,
  AccountRestoreWrites,
} from "../domain/ports/AccountRestoreUnitOfWork";

/**
 * Runs the restore writes in one interactive Prisma transaction, so the
 * republished Listings and the cleared deletion schedule commit together or
 * roll back together when the work throws.
 */
@Injectable()
export class PrismaAccountRestoreUnitOfWork implements AccountRestoreUnitOfWork {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  run<T>(work: (writes: AccountRestoreWrites) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) =>
      work({
        republishListingsArchivedByDeletion: async (sellerId) => {
          await tx.listing.updateMany({
            where: { sellerId, status: "archived", archivedByDeletion: true },
            data: { status: "active", archivedByDeletion: false, publishedAt: new Date() },
          });
        },
        clearDeletionSchedule: async (userId) => {
          await tx.user.update({
            where: { id: userId },
            data: { deletionScheduledAt: null },
          });
        },
      }),
    );
  }
}
