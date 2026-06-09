import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

export interface PurgeExpiredAccountsInput {
  now: Date;
}

export interface PurgeExpiredAccountsResult {
  purgedCount: number;
}

@Injectable()
export class PurgeExpiredAccounts {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async execute(input: PurgeExpiredAccountsInput): Promise<PurgeExpiredAccountsResult> {
    const expiredUsers = await this.prisma.user.findMany({
      where: { deletionScheduledAt: { lte: input.now } },
      select: { id: true },
    });

    for (const user of expiredUsers) {
      await this.purgeUser(user.id);
    }

    return { purgedCount: expiredUsers.length };
  }

  private async purgeUser(userId: string): Promise<void> {
    await this.prisma.$transaction([
      // Tombstone PII
      this.prisma.user.update({
        where: { id: userId },
        data: {
          phone: `deleted:${userId}`,
          displayName: null,
          avatarUrl: null,
          deletionScheduledAt: null,
        },
      }),

      // Prune sessions
      this.prisma.session.deleteMany({ where: { userId } }),

      // Prune TOTP enrollment (cascades to backup codes)
      this.prisma.totpEnrollment.deleteMany({ where: { userId } }),

      // Prune FCM devices
      this.prisma.fcmDevice.deleteMany({ where: { userId } }),

      // Prune notification history
      this.prisma.notificationHistory.deleteMany({ where: { userId } }),

      // Prune notification preferences
      this.prisma.notificationPreference.deleteMany({ where: { userId } }),

      // Prune saved searches
      this.prisma.savedSearch.deleteMany({ where: { userId } }),

      // Prune favorites
      this.prisma.favorite.deleteMany({ where: { userId } }),

      // Prune owned vehicles (garage)
      this.prisma.ownedVehicle.deleteMany({ where: { userId } }),

      // Prune blocked users (both directions)
      this.prisma.blockedUser.deleteMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      }),

      // Prune dealership memberships
      this.prisma.dealershipMember.deleteMany({ where: { userId } }),

      // Prune listing drafts
      this.prisma.listingDraft.deleteMany({ where: { userId } }),
    ]);
  }
}
