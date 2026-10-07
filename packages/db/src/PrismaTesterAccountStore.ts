import { Prisma, type PrismaClient } from "../generated/prisma/client/client";

import type { TesterAccountStore, TesterTransaction } from "./tester-accounts";

export class PrismaTesterAccountStore implements TesterAccountStore {
  constructor(private readonly prisma: PrismaClient) {}

  transaction<T>(run: (tx: TesterTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => run({
      findUsers: (accounts) => tx.user.findMany({
        where: { OR: accounts.flatMap(({ id, phone, email }) => [{ id }, { phone }, { email }]) },
        select: { id: true, phone: true, email: true, role: true, phoneVerifiedAt: true, emailVerifiedAt: true, deletionScheduledAt: true },
      }),
      createUser: async (account, now) => {
        await tx.user.create({ data: { ...account, role: "buyer", phoneVerifiedAt: now, emailVerifiedAt: now } });
      },
      scheduleDeletion: async (ids, now) => {
        const result = await tx.user.updateMany({
          where: { id: { in: ids }, OR: [{ deletionScheduledAt: null }, { deletionScheduledAt: { gt: now } }] },
          data: { deletionScheduledAt: now },
        });
        return result.count;
      },
      deleteSessions: async (ids) => {
        const result = await tx.session.deleteMany({ where: { userId: { in: ids } } });
        return result.count;
      },
      archiveListings: async (ids) => {
        const result = await tx.listing.updateMany({ where: { sellerId: { in: ids }, status: "active" }, data: { status: "archived", archivedByDeletion: true } });
        return result.count;
      },
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
  }
}
