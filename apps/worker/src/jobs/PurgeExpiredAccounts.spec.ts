import { describe, it, expect, beforeEach } from "vitest";
import type { PrismaService } from "@auto-tm/db";

import { PurgeExpiredAccounts } from "./PurgeExpiredAccounts";

const NOW = new Date("2026-06-09T12:00:00Z");

function makeFakePrisma() {
  const state = {
    users: [] as Array<{
      id: string;
      phone: string;
      displayName: string | null;
      avatarUrl: string | null;
      deletionScheduledAt: Date | null;
    }>,
    sessions: [] as Array<{ id: string; userId: string }>,
    totpEnrollments: [] as Array<{ id: string; userId: string }>,
    fcmDevices: [] as Array<{ id: string; userId: string }>,
    notificationHistory: [] as Array<{ id: string; userId: string }>,
    notificationPreferences: [] as Array<{ id: string; userId: string }>,
    savedSearches: [] as Array<{ id: string; userId: string }>,
    favorites: [] as Array<{ id: string; userId: string }>,
    ownedVehicles: [] as Array<{ id: string; userId: string }>,
    blockedUsers: [] as Array<{ id: string; blockerId: string; blockedId: string }>,
    dealershipMembers: [] as Array<{ id: string; userId: string }>,
    listingDrafts: [] as Array<{ id: string; userId: string }>,
  };

  const prismaLike = {
    user: {
      findMany: async (args: { where: { deletionScheduledAt?: { lte?: Date } } }) => {
        const lte = args.where.deletionScheduledAt?.lte;
        if (lte) {
          return state.users.filter((u) => u.deletionScheduledAt && u.deletionScheduledAt <= lte);
        }
        return state.users;
      },
      update: async (args: { where: { id: string }; data: Partial<typeof state.users[number]> }) => {
        const idx = state.users.findIndex((u) => u.id === args.where.id);
        if (idx !== -1) {
          const existing = state.users[idx];
          if (existing) {
            state.users[idx] = { ...existing, ...args.data };
          }
        }
        return state.users[idx];
      },
    },

    session: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = state.sessions.length;
        const kept = state.sessions.filter((s) => s.userId !== args.where.userId);
        state.sessions.splice(0, state.sessions.length, ...kept);
        return { count: before - state.sessions.length };
      },
    },

    totpEnrollment: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = state.totpEnrollments.length;
        const kept = state.totpEnrollments.filter((e) => e.userId !== args.where.userId);
        state.totpEnrollments.splice(0, state.totpEnrollments.length, ...kept);
        return { count: before - state.totpEnrollments.length };
      },
    },

    fcmDevice: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = state.fcmDevices.length;
        const kept = state.fcmDevices.filter((d) => d.userId !== args.where.userId);
        state.fcmDevices.splice(0, state.fcmDevices.length, ...kept);
        return { count: before - state.fcmDevices.length };
      },
    },

    notificationHistory: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = state.notificationHistory.length;
        const kept = state.notificationHistory.filter((n) => n.userId !== args.where.userId);
        state.notificationHistory.splice(0, state.notificationHistory.length, ...kept);
        return { count: before - state.notificationHistory.length };
      },
    },

    notificationPreference: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = state.notificationPreferences.length;
        const kept = state.notificationPreferences.filter((n) => n.userId !== args.where.userId);
        state.notificationPreferences.splice(0, state.notificationPreferences.length, ...kept);
        return { count: before - state.notificationPreferences.length };
      },
    },

    savedSearch: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = state.savedSearches.length;
        const kept = state.savedSearches.filter((s) => s.userId !== args.where.userId);
        state.savedSearches.splice(0, state.savedSearches.length, ...kept);
        return { count: before - state.savedSearches.length };
      },
    },

    favorite: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = state.favorites.length;
        const kept = state.favorites.filter((f) => f.userId !== args.where.userId);
        state.favorites.splice(0, state.favorites.length, ...kept);
        return { count: before - state.favorites.length };
      },
    },

    ownedVehicle: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = state.ownedVehicles.length;
        const kept = state.ownedVehicles.filter((v) => v.userId !== args.where.userId);
        state.ownedVehicles.splice(0, state.ownedVehicles.length, ...kept);
        return { count: before - state.ownedVehicles.length };
      },
    },

    blockedUser: {
      deleteMany: async (args: { where: { OR?: Array<{ blockerId: string } | { blockedId: string }> } }) => {
        const before = state.blockedUsers.length;
        const ors = args.where.OR ?? [];
        const userId = ors.find((o): o is { blockerId: string } => "blockerId" in o)?.blockerId;
        const kept = state.blockedUsers.filter((b) => !(b.blockerId === userId || b.blockedId === userId));
        state.blockedUsers.splice(0, state.blockedUsers.length, ...kept);
        return { count: before - state.blockedUsers.length };
      },
    },

    dealershipMember: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = state.dealershipMembers.length;
        const kept = state.dealershipMembers.filter((d) => d.userId !== args.where.userId);
        state.dealershipMembers.splice(0, state.dealershipMembers.length, ...kept);
        return { count: before - state.dealershipMembers.length };
      },
    },

    listingDraft: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = state.listingDrafts.length;
        const kept = state.listingDrafts.filter((d) => d.userId !== args.where.userId);
        state.listingDrafts.splice(0, state.listingDrafts.length, ...kept);
        return { count: before - state.listingDrafts.length };
      },
    },

    $transaction: async (ops: Array<Promise<unknown>>) => {
      await Promise.all(ops);
    },
  };

  return { ...state, prisma: prismaLike as unknown as PrismaService };
}

describe("PurgeExpiredAccounts", () => {
  let fake: ReturnType<typeof makeFakePrisma>;
  let job: PurgeExpiredAccounts;

  beforeEach(() => {
    fake = makeFakePrisma();
    job = new PurgeExpiredAccounts(fake.prisma);
  });

  it("purges users whose deletion grace has expired", async () => {
    fake.users.push({
      id: "user-expired",
      phone: "+99361234567",
      displayName: "Expired",
      avatarUrl: "https://example.com/avatar.jpg",
      deletionScheduledAt: new Date(NOW.getTime() - 24 * 60 * 60 * 1000),
    });
    fake.users.push({
      id: "user-future",
      phone: "+99361234568",
      displayName: "Future",
      avatarUrl: null,
      deletionScheduledAt: new Date(NOW.getTime() + 24 * 60 * 60 * 1000),
    });
    fake.sessions.push({ id: "sess-1", userId: "user-expired" });
    fake.favorites.push({ id: "fav-1", userId: "user-expired" });

    const result = await job.execute({ now: NOW });

    expect(result.purgedCount).toBe(1);

    const purged = fake.users.find((u) => u.id === "user-expired");
    expect(purged).toBeDefined();
    expect(purged?.phone).toBe("deleted:user-expired");
    expect(purged?.displayName).toBeNull();
    expect(purged?.avatarUrl).toBeNull();
    expect(purged?.deletionScheduledAt).toBeNull();

    const kept = fake.users.find((u) => u.id === "user-future");
    expect(kept).toBeDefined();
    expect(kept?.phone).toBe("+99361234568");
    expect(kept?.deletionScheduledAt).not.toBeNull();
  });

  it("prunes private rows for purged users", async () => {
    fake.users.push({
      id: "user-1",
      phone: "+99361234567",
      displayName: "Name",
      avatarUrl: null,
      deletionScheduledAt: new Date(NOW.getTime() - 1000),
    });
    fake.sessions.push({ id: "s1", userId: "user-1" });
    fake.totpEnrollments.push({ id: "t1", userId: "user-1" });
    fake.fcmDevices.push({ id: "f1", userId: "user-1" });
    fake.notificationHistory.push({ id: "n1", userId: "user-1" });
    fake.notificationPreferences.push({ id: "np1", userId: "user-1" });
    fake.savedSearches.push({ id: "ss1", userId: "user-1" });
    fake.favorites.push({ id: "fav1", userId: "user-1" });
    fake.ownedVehicles.push({ id: "ov1", userId: "user-1" });
    fake.blockedUsers.push({ id: "bu1", blockerId: "user-1", blockedId: "other" });
    fake.dealershipMembers.push({ id: "dm1", userId: "user-1" });
    fake.listingDrafts.push({ id: "ld1", userId: "user-1" });

    await job.execute({ now: NOW });

    expect(fake.sessions).toHaveLength(0);
    expect(fake.totpEnrollments).toHaveLength(0);
    expect(fake.fcmDevices).toHaveLength(0);
    expect(fake.notificationHistory).toHaveLength(0);
    expect(fake.notificationPreferences).toHaveLength(0);
    expect(fake.savedSearches).toHaveLength(0);
    expect(fake.favorites).toHaveLength(0);
    expect(fake.ownedVehicles).toHaveLength(0);
    expect(fake.blockedUsers).toHaveLength(0);
    expect(fake.dealershipMembers).toHaveLength(0);
    expect(fake.listingDrafts).toHaveLength(0);
  });

  it("returns zero when no users have expired grace", async () => {
    fake.users.push({
      id: "user-1",
      phone: "+99361234567",
      displayName: "Name",
      avatarUrl: null,
      deletionScheduledAt: new Date(NOW.getTime() + 24 * 60 * 60 * 1000),
    });

    const result = await job.execute({ now: NOW });

    expect(result.purgedCount).toBe(0);
    const first = fake.users[0];
    expect(first?.phone).toBe("+99361234567");
  });
});
