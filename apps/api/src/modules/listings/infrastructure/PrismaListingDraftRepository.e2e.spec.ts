import { execSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { PrismaService } from "@auto-tm/db";

import { PrismaListingDraftRepository } from "./PrismaListingDraftRepository";
import { ListingDraft } from "../domain/ListingDraft";

describe("PrismaListingDraftRepository — Testcontainers", () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repo: PrismaListingDraftRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withUsername("auto_tm")
      .withPassword("auto_tm_pass")
      .withDatabase("auto_tm_test")
      .start();

    const dbUrl = container.getConnectionUri();
    const dbPackagePath = resolve(__dirname, "../../../../../../packages/db");

    execSync("pnpm prisma migrate deploy", {
      cwd: dbPackagePath,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: "pipe",
    });

    process.env["DATABASE_URL"] = dbUrl;
    prisma = new PrismaService();
    repo = new PrismaListingDraftRepository(prisma);
  }, 120_000);

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await container.stop();
  });

  beforeEach(async () => {
    await prisma.listingDraft.deleteMany();
    await prisma.user.deleteMany();
  });

  async function seedUser(userId: string): Promise<void> {
    await prisma.user.create({
      data: { id: userId, phone: `+9936${userId.slice(-8)}`, role: "buyer" },
    });
  }

  it("saves and retrieves a draft", async () => {
    await seedUser("user-1");
    const draft = ListingDraft.create({
      id: "draft-1",
      userId: "user-1",
      payload: { vin: "WBA123" },
    });

    const saved = await repo.save(draft);
    expect(saved.id).toBe("draft-1");
    expect(saved.userId).toBe("user-1");

    const found = await repo.findById("draft-1");
    expect(found).not.toBeNull();
    expect(found!.payload).toEqual({ vin: "WBA123" });
  });

  it("returns null for non-existent draft", async () => {
    const found = await repo.findById("non-existent");
    expect(found).toBeNull();
  });

  it("updates a draft payload", async () => {
    await seedUser("user-1");
    const draft = ListingDraft.create({
      id: "draft-1",
      userId: "user-1",
      payload: { step: 1 },
    });
    await repo.save(draft);

    const updated = draft.updatePayload({ step: 2 }, new Date());
    const saved = await repo.update(updated);

    expect(saved.payload).toEqual({ step: 2 });

    const found = await repo.findById("draft-1");
    expect(found!.payload).toEqual({ step: 2 });
  });

  it("deletes a draft", async () => {
    await seedUser("user-1");
    const draft = ListingDraft.create({ id: "draft-1", userId: "user-1" });
    await repo.save(draft);

    await repo.delete("draft-1");
    const found = await repo.findById("draft-1");
    expect(found).toBeNull();
  });

  it("lists drafts by user with pagination", async () => {
    await seedUser("user-1");
    await seedUser("user-2");
    await repo.save(ListingDraft.create({ id: "d1", userId: "user-1", payload: { a: 1 } }));
    // Small delay to ensure different updatedAt
    await new Promise((r) => setTimeout(r, 10));
    await repo.save(ListingDraft.create({ id: "d2", userId: "user-1", payload: { a: 2 } }));
    await new Promise((r) => setTimeout(r, 10));
    await repo.save(ListingDraft.create({ id: "d3", userId: "user-2", payload: { a: 3 } }));

    const result = await repo.findByUserId("user-1", { limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.userId).toBe("user-1");
    expect(result.nextCursor).toBeDefined();

    const page2 = await repo.findByUserId("user-1", {
      limit: 1,
      cursor: result.nextCursor!,
    });
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0]!.id).not.toBe(result.items[0]!.id);
    expect(page2.nextCursor).toBeUndefined();
  });

  it("orders drafts by updatedAt DESC", async () => {
    await seedUser("user-1");
    const d1 = ListingDraft.create({ id: "d1", userId: "user-1" });
    await repo.save(d1);
    await new Promise((r) => setTimeout(r, 50));

    const d2 = ListingDraft.create({ id: "d2", userId: "user-1" });
    await repo.save(d2);
    await new Promise((r) => setTimeout(r, 50));

    const d3 = ListingDraft.create({ id: "d3", userId: "user-1" });
    await repo.save(d3);

    const result = await repo.findByUserId("user-1", { limit: 10 });
    expect(result.items.map((d) => d.id)).toEqual(["d3", "d2", "d1"]);
  });
});
