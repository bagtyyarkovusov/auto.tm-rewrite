import { describe, expect, it } from "vitest";

import {
  parseReviewerScenarioAccounts,
  reviewerScenarioSeedIds,
  runReviewerScenarioSeed,
  type ReviewerScenarioSeedOptions,
  type ReviewerScenarioSeedStore,
  type ReviewerScenarioUser,
} from "./reviewer-scenario-seed";

const NOW = new Date("2026-08-09T12:00:00.000Z");

function account(phone: string, code = "123456"): { phone: string; code: string } {
  return { phone, code };
}

function reviewerJson(phones = ["+99365000001", "+99365000002", "+99365000003"]): string {
  return JSON.stringify(phones.map((phone, index) => account(phone, `${index + 1}`.repeat(6))));
}

function seedOptions(overrides: Partial<ReviewerScenarioSeedOptions> = {}): ReviewerScenarioSeedOptions {
  return {
    mode: "seed",
    reviewDemoAccountsJson: reviewerJson(),
    env: {
      appEnv: "production",
      authorization: "seed-reviewer-scenario",
      signupsEnabled: "false",
      reviewDemoAccountEnabled: "true",
    },
    now: NOW,
    ...overrides,
  };
}

interface ListingRow {
  id: string;
  sellerId: string;
}

interface ConversationRow {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageId: string;
}

interface MessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  kind: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
}

class FakeReviewerScenarioSeedStore implements ReviewerScenarioSeedStore {
  users = new Map<string, ReviewerScenarioUser>();
  usersByPhone = new Map<string, string>();
  listings = new Map<string, ListingRow>();
  conversations = new Map<string, ConversationRow>();
  participants = new Map<string, { id: string; conversationId: string; userId: string }>();
  messages = new Map<string, MessageRow>();
  reports = new Map<string, { id: string; reporterUserId: string; targetId: string }>();
  auditLogs: Array<{
    action: string;
    targetType: string;
    targetId: string;
    details: Record<string, unknown>;
  }> = [];
  deletedSessionUserIds: string[] = [];
  invalidatedDeviceUserIds: string[] = [];
  catalogSeeded = false;

  async findUserById(id: string): Promise<ReviewerScenarioUser | null> {
    return this.users.get(id) ?? null;
  }

  async findUserByPhone(phone: string): Promise<ReviewerScenarioUser | null> {
    const id = this.usersByPhone.get(phone);
    return id ? (this.users.get(id) ?? null) : null;
  }

  async upsertUser(input: {
    id: string;
    phone: string;
    displayName: string;
    role: "buyer" | "seller";
  }): Promise<ReviewerScenarioUser> {
    const existing = this.users.get(input.id);
    if (existing) {
      this.usersByPhone.delete(existing.phone);
    }
    const row = { id: input.id, phone: input.phone, role: input.role };
    this.users.set(input.id, row);
    this.usersByPhone.set(input.phone, input.id);
    return row;
  }

  async revokeUser(input: {
    id: string;
    revokedPhone: string;
    displayName: string;
  }): Promise<void> {
    const existing = this.users.get(input.id);
    if (!existing) return;
    this.usersByPhone.delete(existing.phone);
    const row = { ...existing, phone: input.revokedPhone };
    this.users.set(input.id, row);
    this.usersByPhone.set(input.revokedPhone, input.id);
  }

  async deleteSessionsByUserIds(userIds: string[]): Promise<number> {
    this.deletedSessionUserIds.push(...userIds);
    return userIds.length;
  }

  async invalidatePushDevicesByUserIds(userIds: string[]): Promise<number> {
    this.invalidatedDeviceUserIds.push(...userIds);
    return userIds.length;
  }

  async upsertCatalog(): Promise<void> {
    this.catalogSeeded = true;
  }

  async upsertListing(input: {
    id: string;
    sellerId: string;
    priceAmount: number;
    description: string;
    publishedAt: Date;
  }): Promise<void> {
    this.listings.set(input.id, { id: input.id, sellerId: input.sellerId });
  }

  async upsertConversation(input: {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    lastMessageAt: Date;
    lastMessageId: string;
  }): Promise<void> {
    this.conversations.set(input.id, {
      id: input.id,
      listingId: input.listingId,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      lastMessageId: input.lastMessageId,
    });
  }

  async upsertConversationParticipant(input: {
    id: string;
    conversationId: string;
    userId: string;
  }): Promise<void> {
    this.participants.set(input.id, {
      id: input.id,
      conversationId: input.conversationId,
      userId: input.userId,
    });
  }

  async upsertMessage(input: {
    id: string;
    conversationId: string;
    senderId: string;
    kind: "text" | "post_ref";
    body: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }): Promise<void> {
    this.messages.set(input.id, {
      id: input.id,
      conversationId: input.conversationId,
      senderId: input.senderId,
      kind: input.kind,
      body: input.body,
      metadata: input.metadata,
    });
  }

  async upsertContentReport(input: {
    id: string;
    reporterUserId: string;
    targetType: "listing";
    targetId: string;
    reason: "misleading";
    details: string;
  }): Promise<void> {
    this.reports.set(input.id, {
      id: input.id,
      reporterUserId: input.reporterUserId,
      targetId: input.targetId,
    });
  }

  async createAuditLog(input: {
    action: string;
    targetType: string;
    targetId: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    this.auditLogs.push(input);
  }
}

describe("parseReviewerScenarioAccounts", () => {
  it("maps 3 to 5 secret-managed phones to deterministic buyer/seller slots without exposing codes", () => {
    const parsed = parseReviewerScenarioAccounts(
      reviewerJson([
        "+99365000001",
        "+99365000002",
        "+99365000003",
        "+99365000004",
      ]),
    );

    expect(parsed.map((entry) => ({ id: entry.id, role: entry.role }))).toEqual([
      { id: reviewerScenarioSeedIds.buyerIds[0], role: "buyer" },
      { id: reviewerScenarioSeedIds.sellerIds[0], role: "seller" },
      { id: reviewerScenarioSeedIds.buyerIds[1], role: "buyer" },
      { id: reviewerScenarioSeedIds.sellerIds[1], role: "seller" },
    ]);
    expect(JSON.stringify(parsed)).not.toContain("123456");
  });

  it("rejects malformed or duplicate phone input", () => {
    expect(() => parseReviewerScenarioAccounts("not-json")).toThrow(/invalid/);
    expect(() => parseReviewerScenarioAccounts(JSON.stringify([account("+99365000001")]))).toThrow(/3 to 5/);
    expect(() =>
      parseReviewerScenarioAccounts(
        JSON.stringify([
          account("+99365000001"),
          account("+99365000001"),
          account("+99365000003"),
        ]),
      ),
    ).toThrow(/unique/);
  });
});

describe("reviewerScenarioSeedIds", () => {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // The API validates brandId, modelId, regionId, cityId, listingId, and
  // conversationId with z.string().uuid(). A slug id seeded straight into
  // Postgres is accepted by the database and then rejected by every request
  // that names it, so the scenario is only usable if every id is a UUID.
  it("uses UUIDs for every identifier the API validates", () => {
    const ids = [
      ...reviewerScenarioSeedIds.userIds,
      reviewerScenarioSeedIds.brandId,
      reviewerScenarioSeedIds.modelId,
      reviewerScenarioSeedIds.regionId,
      reviewerScenarioSeedIds.cityId,
      reviewerScenarioSeedIds.primaryListingId,
      reviewerScenarioSeedIds.reportableListingId,
      reviewerScenarioSeedIds.conversationId,
      reviewerScenarioSeedIds.buyerParticipantId,
      reviewerScenarioSeedIds.sellerParticipantId,
      reviewerScenarioSeedIds.firstMessageId,
      reviewerScenarioSeedIds.secondMessageId,
      reviewerScenarioSeedIds.reportId,
    ];

    for (const id of ids) {
      expect(id).toMatch(UUID_RE);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("runReviewerScenarioSeed", () => {
  it("refuses unsafe environments unless the narrow authorization and reviewer-era guards are present", async () => {
    const store = new FakeReviewerScenarioSeedStore();

    await expect(
      runReviewerScenarioSeed(store, seedOptions({ env: { ...seedOptions().env, authorization: undefined } })),
    ).resolves.toMatchObject({ exitCode: 1, message: expect.stringContaining("AUTHORIZATION") });

    await expect(
      runReviewerScenarioSeed(store, seedOptions({ env: { ...seedOptions().env, signupsEnabled: "true" } })),
    ).resolves.toMatchObject({ exitCode: 1, message: expect.stringContaining("SIGNUPS_ENABLED") });

    await expect(
      runReviewerScenarioSeed(store, seedOptions({ env: { ...seedOptions().env, appEnv: "development" } })),
    ).resolves.toMatchObject({ exitCode: 1, message: expect.stringContaining("APP_ENV") });

    expect(store.users.size).toBe(0);
    expect(store.auditLogs).toHaveLength(0);
  });

  it("creates deterministic buyer/seller users, listings, chat starting point, and reportable content", async () => {
    const store = new FakeReviewerScenarioSeedStore();

    const result = await runReviewerScenarioSeed(store, seedOptions());

    expect(result.exitCode).toBe(0);
    expect(store.users.size).toBe(3);
    expect(store.users.get(reviewerScenarioSeedIds.buyerIds[0])?.role).toBe("buyer");
    expect(store.users.get(reviewerScenarioSeedIds.sellerIds[0])?.role).toBe("seller");
    expect(store.listings.size).toBe(2);
    expect(store.conversations.get(reviewerScenarioSeedIds.conversationId)).toMatchObject({
      buyerId: reviewerScenarioSeedIds.buyerIds[0],
      sellerId: reviewerScenarioSeedIds.sellerIds[0],
      lastMessageId: reviewerScenarioSeedIds.secondMessageId,
    });
    expect(store.participants.size).toBe(2);
    expect(store.messages.size).toBe(2);
    expect(store.reports.get(reviewerScenarioSeedIds.reportId)).toMatchObject({
      reporterUserId: reviewerScenarioSeedIds.buyerIds[1],
      targetId: reviewerScenarioSeedIds.reportableListingId,
    });
  });

  it("converges on rerun without duplicating users, listings, conversations, messages, or reports", async () => {
    const store = new FakeReviewerScenarioSeedStore();

    await runReviewerScenarioSeed(store, seedOptions());
    await runReviewerScenarioSeed(store, seedOptions());

    expect(store.users.size).toBe(3);
    expect(store.listings.size).toBe(2);
    expect(store.conversations.size).toBe(1);
    expect(store.participants.size).toBe(2);
    expect(store.messages.size).toBe(2);
    expect(store.reports.size).toBe(1);
  });

  it("refuses to create or reuse privileged reviewer accounts", async () => {
    const store = new FakeReviewerScenarioSeedStore();
    store.users.set(reviewerScenarioSeedIds.buyerIds[0], {
      id: reviewerScenarioSeedIds.buyerIds[0],
      phone: "+99365000001",
      role: "admin",
    });
    store.usersByPhone.set("+99365000001", reviewerScenarioSeedIds.buyerIds[0]);

    const result = await runReviewerScenarioSeed(store, seedOptions());

    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("privileged");
    expect(store.listings.size).toBe(0);
    expect(store.auditLogs).toHaveLength(0);
  });

  it("rotates phones by updating stable users and revoking existing sessions without logging credential values", async () => {
    const store = new FakeReviewerScenarioSeedStore();

    await runReviewerScenarioSeed(store, seedOptions());
    const result = await runReviewerScenarioSeed(
      store,
      seedOptions({
        reviewDemoAccountsJson: reviewerJson([
          "+99365000901",
          "+99365000902",
          "+99365000903",
        ]),
      }),
    );

    expect(result.rotatedUserIds).toEqual([
      reviewerScenarioSeedIds.buyerIds[0],
      reviewerScenarioSeedIds.sellerIds[0],
      reviewerScenarioSeedIds.buyerIds[1],
    ]);
    expect(store.deletedSessionUserIds).toEqual(result.rotatedUserIds);
    expect(store.invalidatedDeviceUserIds).toEqual(result.rotatedUserIds);
    const auditJson = JSON.stringify(store.auditLogs);
    expect(auditJson).toContain("REVIEWER_SCENARIO_ROTATE");
    expect(auditJson).not.toContain("+99365000901");
    expect(auditJson).not.toContain("111111");
  });

  it("revokes reviewer accounts while preserving stable user ids for audit history", async () => {
    const store = new FakeReviewerScenarioSeedStore();

    await runReviewerScenarioSeed(store, seedOptions());
    const result = await runReviewerScenarioSeed(store, seedOptions({ mode: "revoke" }));

    expect(result.exitCode).toBe(0);
    expect(result.revokedUserIds).toEqual(reviewerScenarioSeedIds.userIds.slice(0, 3));
    expect(store.users.get(reviewerScenarioSeedIds.buyerIds[0])?.phone).toBe(
      `revoked:${reviewerScenarioSeedIds.buyerIds[0]}`,
    );
    expect(store.deletedSessionUserIds).toEqual(result.revokedUserIds);
    expect(store.auditLogs.at(-1)?.action).toBe("REVIEWER_SCENARIO_REVOKE");
  });
});
