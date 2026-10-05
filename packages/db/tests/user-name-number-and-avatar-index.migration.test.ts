import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

const MIGRATION = "20261005120000_add_user_name_number_and_avatar_index";
const migrationsDir = new URL("../prisma/migrations", import.meta.url).pathname;
const EXISTING_USERS = 200;

function migrationNames(filter: (name: string) => boolean): string[] {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && filter(entry.name))
    .map((entry) => entry.name)
    .sort();
}

interface UserRow {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  nameNumber: number;
  avatarIndex: number;
  avatarKey: string | null;
}

describe(`${MIGRATION} — Testcontainers`, () => {
  let container: StartedPostgreSqlContainer;
  let db: Client;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withUsername("auto_tm")
      .withPassword("auto_tm_pass")
      .withDatabase("auto_tm_test")
      .start();
    db = new Client({ connectionString: container.getConnectionUri() });
    await db.connect();

    for (const name of migrationNames((name) => name < MIGRATION)) {
      await db.query(readFileSync(join(migrationsDir, name, "migration.sql"), "utf-8"));
    }

    // Users as they exist before the deploy: some with a name and a photo URL.
    await db.query(
      `INSERT INTO users (id, phone, "phoneVerifiedAt", "displayName", "avatarUrl", "updatedAt")
       SELECT 'user-' || lpad(n::text, 4, '0'),
              '+9936' || lpad(n::text, 7, '0'),
              now(),
              CASE WHEN n % 2 = 0 THEN 'Name ' || n END,
              CASE WHEN n % 3 = 0 THEN 'https://example.com/' || n || '.jpg' END,
              now()
       FROM generate_series(1, $1::int) AS n`,
      [EXISTING_USERS],
    );

    // Apply this migration and any that follow it, as `migrate deploy` would.
    for (const name of migrationNames((name) => name >= MIGRATION)) {
      await db.query(readFileSync(join(migrationsDir, name, "migration.sql"), "utf-8"));
    }
  }, 120_000);

  afterAll(async () => {
    await db?.end();
    await container?.stop();
  });

  async function users(): Promise<UserRow[]> {
    const result = await db.query<UserRow>(
      `SELECT id, "displayName", "avatarUrl", "nameNumber", "avatarIndex", "avatarKey"
       FROM users ORDER BY id`,
    );
    return result.rows;
  }

  it("gives every existing User a name number and an avatar index in range", async () => {
    const rows = await users();

    expect(rows).toHaveLength(EXISTING_USERS);
    for (const row of rows) {
      expect(row.nameNumber).toBeGreaterThanOrEqual(1000);
      expect(row.nameNumber).toBeLessThanOrEqual(9999);
      expect(row.avatarIndex).toBeGreaterThanOrEqual(0);
      expect(row.avatarIndex).toBeLessThanOrEqual(11);
    }
  });

  it("draws the values per User, not one constant for the table", async () => {
    const rows = await users();

    expect(new Set(rows.map((row) => row.nameNumber)).size).toBeGreaterThan(1);
    expect(new Set(rows.map((row) => row.avatarIndex)).size).toBeGreaterThan(1);
  });

  it("leaves displayName and avatarUrl unchanged and avatarKey null", async () => {
    const rows = await users();

    expect(rows.find((row) => row.id === "user-0002")).toMatchObject({
      displayName: "Name 2",
      avatarUrl: null,
      avatarKey: null,
    });
    expect(rows.find((row) => row.id === "user-0003")).toMatchObject({
      displayName: null,
      avatarUrl: "https://example.com/3.jpg",
      avatarKey: null,
    });
    expect(rows.filter((row) => row.displayName !== null)).toHaveLength(EXISTING_USERS / 2);
    expect(rows.every((row) => row.avatarKey === null)).toBe(true);
  });

  it("assigns both values to a User created by an API that does not know the columns", async () => {
    const created = await db.query<{ nameNumber: number; avatarIndex: number }>(
      `INSERT INTO users (id, email, "emailVerifiedAt", "updatedAt")
       VALUES ('old-api', 'old@example.com', now(), now())
       RETURNING "nameNumber", "avatarIndex"`,
    );

    expect(created.rows[0]?.nameNumber).toBeGreaterThanOrEqual(1000);
    expect(created.rows[0]?.nameNumber).toBeLessThanOrEqual(9999);
    expect(created.rows[0]?.avatarIndex).toBeGreaterThanOrEqual(0);
    expect(created.rows[0]?.avatarIndex).toBeLessThanOrEqual(11);
  });

  it.each([
    [`"nameNumber" = 999`, "users_nameNumber_range_check"],
    [`"nameNumber" = 10000`, "users_nameNumber_range_check"],
    [`"avatarIndex" = -1`, "users_avatarIndex_range_check"],
    [`"avatarIndex" = 12`, "users_avatarIndex_range_check"],
  ])("refuses %s", async (assignment, constraint) => {
    await expect(db.query(`UPDATE users SET ${assignment} WHERE id = 'user-0001'`))
      .rejects.toThrow(constraint);
  });

  it("changes the users table in one statement", () => {
    const path = join(migrationsDir, MIGRATION, "migration.sql");
    expect(existsSync(path)).toBe(true);
    const statements = readFileSync(path, "utf-8")
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .split(";")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatch(/^ALTER TABLE "users"/);
  });
});
