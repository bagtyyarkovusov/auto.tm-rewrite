import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

export interface PurgeExpiredAccountsInput {
  now: Date;
}

export interface PurgeExpiredAccountsResult {
  purgedCount: number;
}

/** Sign-in code records are kept this long, then deleted (privacy policy). */
const CODE_REQUEST_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class PurgeExpiredAccounts {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async execute(input: PurgeExpiredAccountsInput): Promise<PurgeExpiredAccountsResult> {
    const expiredUsers = await this.prisma.user.findMany({
      where: { deletionScheduledAt: { lte: input.now } },
      select: { id: true, phone: true, email: true },
    });

    try {
      for (const user of expiredUsers) {
        await this.purgeUser(user);
      }
    } finally {
      // Every run also drops sign-in code records past their retention, so
      // the phone, email and IP they hold are gone after 30 days for
      // everyone. A purge that fails must not hold this back.
      await this.prisma.otpRequest.deleteMany({
        where: { createdAt: { lt: new Date(input.now.getTime() - CODE_REQUEST_RETENTION_MS) } },
      });
    }

    return { purgedCount: expiredUsers.length };
  }

  private async purgeUser(user: {
    id: string;
    phone: string | null;
    email: string | null;
  }): Promise<void> {
    const userId = user.id;
    // Code requests are matched by User, and by the purged phone and email
    // for a request made before sign-in, which carries no User id. A request
    // another User made to the same number (two sellers may confirm one
    // contact phone) is theirs and stays until it is 30 days old.
    const signedOutRequestsTo = [user.phone, user.email].filter(
      (value): value is string => value !== null,
    );
    const codeRequestMatches = [
      { userId },
      ...(signedOutRequestsTo.length > 0
        ? [{ userId: null, destination: { in: signedOutRequestsTo } }]
        : []),
    ];
    await this.prisma.$transaction([
      // Free both Sign-in Methods and clear profile PII (ADR-0054). The name
      // number and avatar index stay; they identify nobody (#638).
      this.prisma.user.update({
        where: { id: userId },
        data: {
          phone: null,
          phoneVerifiedAt: null,
          email: null,
          emailVerifiedAt: null,
          displayName: null,
          avatarKey: null,
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

      // Prune confirmed Listing contact phones (ADR-0081)
      this.prisma.verifiedContactPhone.deleteMany({ where: { sellerId: userId } }),

      // Prune sign-in and contact phone code requests for this User
      this.prisma.otpRequest.deleteMany({ where: { OR: codeRequestMatches } }),

      // Kept Listings stay archived; nobody can reach a purged User, so their
      // contact phone goes too
      this.prisma.listing.updateMany({ where: { sellerId: userId }, data: { contactPhone: null } }),
    ]);
  }
}
