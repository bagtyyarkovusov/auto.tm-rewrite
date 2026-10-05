import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaService } from "@auto-tm/db";

import { PrismaIdentityReadAdapter } from "./PrismaIdentityReadAdapter";
import { PrismaSellerProfileReadAdapter } from "./PrismaSellerProfileReadAdapter";
import {
  cleanSuiteFixtures,
  defineE2eSuite,
} from "../../../../test/helpers/e2eSuite";

const suite = defineE2eSuite("public-identity-read");
const SUITE_USERS = ["named", "unnamed", "purged"] as const;
const MEMBER_SINCE = new Date("2025-03-01T08:00:00.000Z");

describe("Public identity read adapters e2e", () => {
  let prisma: PrismaService;
  let identityRead: PrismaIdentityReadAdapter;
  let sellerProfiles: PrismaSellerProfileReadAdapter;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    identityRead = new PrismaIdentityReadAdapter(prisma);
    sellerProfiles = new PrismaSellerProfileReadAdapter(prisma);
  });

  afterAll(async () => {
    await cleanSuiteFixtures(prisma, suite, { userAliases: SUITE_USERS });
    await prisma.onModuleDestroy();
  });

  beforeEach(async () => {
    await cleanSuiteFixtures(prisma, suite, { userAliases: SUITE_USERS });
    await prisma.user.create({
      data: {
        id: suite.id("named"),
        phone: suite.phone("named"),
        phoneVerifiedAt: new Date(),
        displayName: "Aýgül",
        nameNumber: 2057,
        avatarIndex: 7,
        createdAt: MEMBER_SINCE,
      },
    });
    await prisma.user.create({
      data: {
        id: suite.id("unnamed"),
        email: `${suite.id("unnamed")}@example.test`,
        emailVerifiedAt: new Date(),
        nameNumber: 4821,
        avatarIndex: 0,
        createdAt: MEMBER_SINCE,
      },
    });
    // What the purge job leaves: no Sign-in Method, no name, no photo.
    await prisma.user.create({
      data: {
        id: suite.id("purged"),
        nameNumber: 9999,
        avatarIndex: 11,
        createdAt: MEMBER_SINCE,
      },
    });
  });

  it("gives a seller's public identity and join date, and nothing else", async () => {
    const profile = await sellerProfiles.getSellerProfile(suite.id("named"));

    expect(profile).toEqual({
      displayName: "Aýgül",
      nameNumber: 2057,
      avatarIndex: 7,
      avatarKey: null,
      deleted: false,
      memberSince: MEMBER_SINCE,
    });
  });

  it("marks a purged seller deleted and keeps the number and index", async () => {
    const profile = await sellerProfiles.getSellerProfile(suite.id("purged"));

    expect(profile).toEqual({
      displayName: null,
      nameNumber: 9999,
      avatarIndex: 11,
      avatarKey: null,
      deleted: true,
      memberSince: MEMBER_SINCE,
    });
  });

  it("reads several Users' public identities in one call, with no contact data", async () => {
    const users = await identityRead.findUsersByIds([
      suite.id("named"),
      suite.id("unnamed"),
      suite.id("purged"),
    ]);
    const byId = new Map(users.map((u) => [u.id, u]));

    expect(byId.get(suite.id("named"))).toMatchObject({
      displayName: "Aýgül",
      nameNumber: 2057,
      avatarIndex: 7,
      avatarKey: null,
      deleted: false,
    });
    expect(byId.get(suite.id("unnamed"))).toMatchObject({
      displayName: null,
      nameNumber: 4821,
      avatarIndex: 0,
      deleted: false,
    });
    expect(byId.get(suite.id("purged"))).toMatchObject({
      displayName: null,
      nameNumber: 9999,
      avatarIndex: 11,
      deleted: true,
    });
    for (const user of users) {
      expect(user).not.toHaveProperty("phone");
      expect(user).not.toHaveProperty("email");
    }
  });

  it("reads one User's public identity", async () => {
    const user = await identityRead.findUserById(suite.id("unnamed"));

    expect(user).toMatchObject({
      id: suite.id("unnamed"),
      displayName: null,
      nameNumber: 4821,
      avatarIndex: 0,
      avatarKey: null,
      deleted: false,
    });
  });
});
