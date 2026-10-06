import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type {
  AccountDeletionUnitOfWork,
  AccountDeletionWrites,
} from "../domain/ports/AccountDeletionUnitOfWork";

/**
 * Runs the deletion writes in one interactive Prisma transaction, so the
 * deletion schedule and the archived Listings commit together or roll back
 * together when the work throws.
 */
@Injectable()
export class PrismaAccountDeletionUnitOfWork implements AccountDeletionUnitOfWork {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  run<T>(work: (writes: AccountDeletionWrites) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) =>
      work({
        scheduleDeletion: async (userId, deletionScheduledAt) => {
          await tx.user.update({
            where: { id: userId },
            data: { deletionScheduledAt },
          });
        },
        archiveActiveListings: async (sellerId) => {
          await tx.listing.updateMany({
            where: { sellerId, status: "active" },
            data: { status: "archived", archivedByDeletion: true },
          });
        },
      }),
    );
  }
}
