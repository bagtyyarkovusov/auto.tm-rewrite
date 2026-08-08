const REVIEWER_SEED_AUTHORIZATION = "seed-reviewer-scenario";
const REVIEWER_PHONE_RE = /^\+993\d{8}$/;

type ReviewerRole = "buyer" | "seller";
type ReviewerMode = "seed" | "revoke";

const ACCOUNT_SLOTS: Array<{ id: string; role: ReviewerRole; displayName: string }> = [
  {
    id: "autotm-reviewer-buyer-1",
    role: "buyer",
    displayName: "Reviewer Buyer 1",
  },
  {
    id: "autotm-reviewer-seller-1",
    role: "seller",
    displayName: "Reviewer Seller 1",
  },
  {
    id: "autotm-reviewer-buyer-2",
    role: "buyer",
    displayName: "Reviewer Buyer 2",
  },
  {
    id: "autotm-reviewer-seller-2",
    role: "seller",
    displayName: "Reviewer Seller 2",
  },
  {
    id: "autotm-reviewer-buyer-3",
    role: "buyer",
    displayName: "Reviewer Buyer 3",
  },
];

const REVIEWER_USER_IDS = ACCOUNT_SLOTS.map((slot) => slot.id);

const CATALOG = {
  brandId: "autotm-reviewer-brand",
  brandSlug: "autotm-reviewer",
  modelId: "autotm-reviewer-model",
  modelSlug: "review-scenario",
  regionId: "autotm-reviewer-region",
  regionSlug: "reviewer-region",
  cityId: "autotm-reviewer-city",
  citySlug: "reviewer-city",
};

const PRIMARY_LISTING_ID = "autotm-reviewer-listing-primary";
const REPORTABLE_LISTING_ID = "autotm-reviewer-listing-reportable";
const CONVERSATION_ID = "autotm-reviewer-conversation-primary";
const FIRST_MESSAGE_ID = "autotm-reviewer-message-001";
const SECOND_MESSAGE_ID = "autotm-reviewer-message-002";
const REPORT_ID = "autotm-reviewer-report-listing-001";

export interface ReviewerScenarioSeedEnv {
  appEnv: string | undefined;
  authorization: string | undefined;
  signupsEnabled: string | undefined;
  reviewDemoAccountEnabled: string | undefined;
}

export interface ReviewerScenarioSeedOptions {
  mode: ReviewerMode;
  reviewDemoAccountsJson: string;
  env: ReviewerScenarioSeedEnv;
  now: Date;
}

export interface ReviewerScenarioUser {
  id: string;
  phone: string;
  role: string;
}

export interface ReviewerScenarioSeedStore {
  findUserById(id: string): Promise<ReviewerScenarioUser | null>;
  findUserByPhone(phone: string): Promise<ReviewerScenarioUser | null>;
  upsertUser(input: {
    id: string;
    phone: string;
    displayName: string;
    role: ReviewerRole;
  }): Promise<ReviewerScenarioUser>;
  revokeUser(input: {
    id: string;
    revokedPhone: string;
    displayName: string;
  }): Promise<void>;
  deleteSessionsByUserIds(userIds: string[]): Promise<number>;
  invalidatePushDevicesByUserIds(userIds: string[], invalidatedAt: Date): Promise<number>;
  upsertCatalog(input: {
    brandId: string;
    brandSlug: string;
    modelId: string;
    modelSlug: string;
    regionId: string;
    regionSlug: string;
    cityId: string;
    citySlug: string;
  }): Promise<void>;
  upsertListing(input: {
    id: string;
    sellerId: string;
    priceAmount: number;
    description: string;
    publishedAt: Date;
  }): Promise<void>;
  upsertConversation(input: {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    lastMessageAt: Date;
    lastMessageId: string;
  }): Promise<void>;
  upsertConversationParticipant(input: {
    id: string;
    conversationId: string;
    userId: string;
    lastReadAt: Date | null;
    lastDeliveredAt: Date | null;
  }): Promise<void>;
  upsertMessage(input: {
    id: string;
    conversationId: string;
    senderId: string;
    kind: "text" | "post_ref";
    body: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }): Promise<void>;
  upsertContentReport(input: {
    id: string;
    reporterUserId: string;
    targetType: "listing";
    targetId: string;
    reason: "misleading";
    details: string;
  }): Promise<void>;
  createAuditLog(input: {
    action: string;
    targetType: string;
    targetId: string;
    details: Record<string, unknown>;
  }): Promise<void>;
}

interface ParsedReviewerAccount {
  phone: string;
}

interface ReviewerScenarioAccount {
  id: string;
  phone: string;
  role: ReviewerRole;
  displayName: string;
}

export interface ReviewerScenarioSeedResult {
  exitCode: number;
  message: string;
  seededUserIds: string[];
  rotatedUserIds: string[];
  revokedUserIds: string[];
}

function parseEnabledFlag(value: string | undefined): boolean {
  return value === "true";
}

function safeFailure(message: string): ReviewerScenarioSeedResult {
  return {
    exitCode: 1,
    message,
    seededUserIds: [],
    rotatedUserIds: [],
    revokedUserIds: [],
  };
}

export function parseReviewerScenarioAccounts(
  reviewDemoAccountsJson: string,
): ReviewerScenarioAccount[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(reviewDemoAccountsJson);
  } catch {
    throw new Error("Reviewer demo accounts JSON is invalid");
  }

  if (!Array.isArray(parsed) || parsed.length < 3 || parsed.length > 5) {
    throw new Error("Reviewer scenario seed requires 3 to 5 reviewer accounts");
  }

  const seenPhones = new Set<string>();
  return parsed.map((entry: unknown, index: number) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as ParsedReviewerAccount).phone !== "string"
    ) {
      throw new Error("Each reviewer account must include a phone");
    }

    const phone = (entry as ParsedReviewerAccount).phone;
    if (!REVIEWER_PHONE_RE.test(phone)) {
      throw new Error("Reviewer account phones must be +993 E.164 values");
    }
    if (seenPhones.has(phone)) {
      throw new Error("Reviewer account phones must be unique");
    }
    seenPhones.add(phone);

    const slot = ACCOUNT_SLOTS[index];
    if (!slot) {
      throw new Error("Reviewer account slot is not available");
    }

    return {
      id: slot.id,
      phone,
      role: slot.role,
      displayName: slot.displayName,
    };
  });
}

function assertSeedEnvironment(options: ReviewerScenarioSeedOptions): ReviewerScenarioSeedResult | null {
  if (options.env.authorization !== REVIEWER_SEED_AUTHORIZATION) {
    return safeFailure(
      "Reviewer scenario seed refused: set REVIEWER_SCENARIO_SEED_AUTHORIZATION=seed-reviewer-scenario",
    );
  }

  if (!parseEnabledFlag(options.env.reviewDemoAccountEnabled)) {
    return safeFailure(
      "Reviewer scenario seed refused: REVIEW_DEMO_ACCOUNT_ENABLED must be true",
    );
  }

  if (options.mode === "seed" && options.env.signupsEnabled !== "false") {
    return safeFailure(
      "Reviewer scenario seed refused: SIGNUPS_ENABLED must be false",
    );
  }

  const allowedAppEnvs = new Set(["staging", "production"]);
  if (!allowedAppEnvs.has(options.env.appEnv ?? "")) {
    return safeFailure(
      "Reviewer scenario seed refused: APP_ENV must be staging or production",
    );
  }

  return null;
}

async function assertNoPrivilegedOrHijackedAccounts(
  store: ReviewerScenarioSeedStore,
  accounts: ReviewerScenarioAccount[],
): Promise<ReviewerScenarioSeedResult | null> {
  for (const account of accounts) {
    const byId = await store.findUserById(account.id);
    if (byId && byId.role !== "buyer" && byId.role !== "seller") {
      return safeFailure(
        `Reviewer scenario seed refused: configured user slot ${account.id} is privileged`,
      );
    }

    const byPhone = await store.findUserByPhone(account.phone);
    if (byPhone && byPhone.id !== account.id) {
      return safeFailure(
        "Reviewer scenario seed refused: a reviewer phone is already owned by another user",
      );
    }
    if (byPhone && byPhone.role !== "buyer" && byPhone.role !== "seller") {
      return safeFailure(
        "Reviewer scenario seed refused: a reviewer phone resolves to a privileged user",
      );
    }
  }

  return null;
}

export async function runReviewerScenarioSeed(
  store: ReviewerScenarioSeedStore,
  options: ReviewerScenarioSeedOptions,
): Promise<ReviewerScenarioSeedResult> {
  const environmentFailure = assertSeedEnvironment(options);
  if (environmentFailure) return environmentFailure;

  let accounts: ReviewerScenarioAccount[];
  try {
    accounts = parseReviewerScenarioAccounts(options.reviewDemoAccountsJson);
  } catch (error) {
    return safeFailure(error instanceof Error ? error.message : String(error));
  }

  if (options.mode === "revoke") {
    const revokedUserIds: string[] = [];
    for (const id of REVIEWER_USER_IDS) {
      const existing = await store.findUserById(id);
      if (!existing) continue;
      if (existing.role !== "buyer" && existing.role !== "seller") {
        return safeFailure(
          `Reviewer scenario revocation refused: configured user slot ${id} is privileged`,
        );
      }
      await store.revokeUser({
        id,
        revokedPhone: `revoked:${id}`,
        displayName: `Revoked ${id}`,
      });
      revokedUserIds.push(id);
    }

    await store.deleteSessionsByUserIds(revokedUserIds);
    await store.invalidatePushDevicesByUserIds(revokedUserIds, options.now);
    await store.createAuditLog({
      action: "REVIEWER_SCENARIO_REVOKE",
      targetType: "reviewer_scenario",
      targetId: "store-review",
      details: {
        mode: "revoke",
        accountCount: revokedUserIds.length,
        revokedUserIds,
        occurredAt: options.now.toISOString(),
      },
    });

    return {
      exitCode: 0,
      message: `Reviewer scenario revoked ${revokedUserIds.length} accounts`,
      seededUserIds: [],
      rotatedUserIds: [],
      revokedUserIds,
    };
  }

  const accountFailure = await assertNoPrivilegedOrHijackedAccounts(store, accounts);
  if (accountFailure) return accountFailure;

  const rotatedUserIds: string[] = [];
  const seededUserIds: string[] = [];
  for (const account of accounts) {
    const existing = await store.findUserById(account.id);
    if (existing && existing.phone !== account.phone) {
      rotatedUserIds.push(account.id);
    }
    const user = await store.upsertUser(account);
    seededUserIds.push(user.id);
  }

  if (rotatedUserIds.length > 0) {
    await store.deleteSessionsByUserIds(rotatedUserIds);
    await store.invalidatePushDevicesByUserIds(rotatedUserIds, options.now);
  }

  const buyer = accounts.find((account) => account.role === "buyer");
  const seller = accounts.find((account) => account.role === "seller");
  const reporter = accounts.find(
    (account) => account.role === "buyer" && account.id !== buyer?.id,
  ) ?? buyer;
  if (!buyer || !seller || !reporter) {
    return safeFailure("Reviewer scenario seed requires distinct buyer and seller accounts");
  }

  await store.upsertCatalog(CATALOG);
  await store.upsertListing({
    id: PRIMARY_LISTING_ID,
    sellerId: seller.id,
    priceAmount: 245000,
    description:
      "Store review scenario listing. Deterministic demo data only; not a real vehicle.",
    publishedAt: options.now,
  });
  await store.upsertListing({
    id: REPORTABLE_LISTING_ID,
    sellerId: seller.id,
    priceAmount: 198000,
    description:
      "Reportable store review scenario listing with intentionally incomplete disclosure copy.",
    publishedAt: options.now,
  });

  const firstMessageAt = new Date(options.now.getTime() - 60_000);
  await store.upsertConversation({
    id: CONVERSATION_ID,
    listingId: PRIMARY_LISTING_ID,
    buyerId: buyer.id,
    sellerId: seller.id,
    lastMessageAt: options.now,
    lastMessageId: SECOND_MESSAGE_ID,
  });
  await store.upsertConversationParticipant({
    id: `${CONVERSATION_ID}-buyer`,
    conversationId: CONVERSATION_ID,
    userId: buyer.id,
    lastReadAt: options.now,
    lastDeliveredAt: options.now,
  });
  await store.upsertConversationParticipant({
    id: `${CONVERSATION_ID}-seller`,
    conversationId: CONVERSATION_ID,
    userId: seller.id,
    lastReadAt: firstMessageAt,
    lastDeliveredAt: firstMessageAt,
  });
  await store.upsertMessage({
    id: FIRST_MESSAGE_ID,
    conversationId: CONVERSATION_ID,
    senderId: buyer.id,
    kind: "text",
    body: "Hello, is this review scenario listing still available?",
    metadata: null,
    createdAt: firstMessageAt,
  });
  await store.upsertMessage({
    id: SECOND_MESSAGE_ID,
    conversationId: CONVERSATION_ID,
    senderId: seller.id,
    kind: "post_ref",
    body: null,
    metadata: {
      listingId: REPORTABLE_LISTING_ID,
      snapshot: {
        brandId: CATALOG.brandId,
        modelId: CATALOG.modelId,
        displayPriceTmt: 198000,
        priceCurrency: "TMT",
        status: "active",
        year: 2020,
      },
    },
    createdAt: options.now,
  });

  await store.upsertContentReport({
    id: REPORT_ID,
    reporterUserId: reporter.id,
    targetType: "listing",
    targetId: REPORTABLE_LISTING_ID,
    reason: "misleading",
    details:
      "Store review scenario report. Deterministic demo data only; not a real moderation case.",
  });

  await store.createAuditLog({
    action:
      rotatedUserIds.length > 0
        ? "REVIEWER_SCENARIO_ROTATE"
        : "REVIEWER_SCENARIO_SEED",
    targetType: "reviewer_scenario",
    targetId: "store-review",
    details: {
      mode: "seed",
      accountCount: seededUserIds.length,
      seededUserIds,
      rotatedUserIds,
      listingIds: [PRIMARY_LISTING_ID, REPORTABLE_LISTING_ID],
      conversationId: CONVERSATION_ID,
      reportId: REPORT_ID,
      occurredAt: options.now.toISOString(),
    },
  });

  return {
    exitCode: 0,
    message: `Reviewer scenario converged ${seededUserIds.length} accounts, 2 listings, 1 conversation, and 1 report`,
    seededUserIds,
    rotatedUserIds,
    revokedUserIds: [],
  };
}

export const reviewerScenarioSeedIds = {
  userIds: REVIEWER_USER_IDS,
  primaryListingId: PRIMARY_LISTING_ID,
  reportableListingId: REPORTABLE_LISTING_ID,
  conversationId: CONVERSATION_ID,
  reportId: REPORT_ID,
};
