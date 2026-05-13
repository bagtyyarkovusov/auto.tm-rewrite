import { execSync } from "node:child_process";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { PrismaService } from "../src/prisma.service";

describe("PrismaService — Testcontainers smoke", () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let dbUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withUsername("auto_tm")
      .withPassword("auto_tm_pass")
      .withDatabase("auto_tm_test")
      .start();

    dbUrl = container.getConnectionUri();

    execSync("pnpm prisma migrate deploy", {
      cwd: new URL("..", import.meta.url).pathname,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: "pipe",
    });

    process.env["DATABASE_URL"] = dbUrl;
    prisma = new PrismaService();
  }, 120_000);

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await container.stop();
  });

  it("connects and returns zero users", async () => {
    const count = await prisma.user.count();
    expect(count).toBe(0);
  });

  it("has all Phase 1 tables (smoke)", async () => {
    const tables = [
      "users", "otp_requests", "sessions", "dealerships", "dealership_members",
      "owned_vehicles", "blocked_users",
      "brands", "models", "generations", "colors", "body_types", "regions", "cities",
      "listings", "listing_media", "favorites",
      "saved_searches",
      "conversations", "conversation_participants", "messages",
      "fcm_devices", "notification_history", "notification_preferences",
      "blog_posts",
      "audit_logs",
    ];

    for (const table of tables) {
      const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}') as exists`
      );
      expect(result[0]?.exists).toBe(true);
    }
  });
});
