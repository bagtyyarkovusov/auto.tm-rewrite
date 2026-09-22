import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

const MIGRATION = "20260922000000_add_user_sign_in_methods";
const migrationsDir = new URL("../prisma/migrations", import.meta.url).pathname;

function migrationSql(name: string): string {
  return readFileSync(join(migrationsDir, name, "migration.sql"), "utf-8");
}

const LIVE_ID = "00000000-0000-4000-8000-000000000001";
const TOMBSTONED_ID = "00000000-0000-4000-8000-000000000002";
const LIVE_CREATED_AT = new Date("2026-01-02T03:04:05.000Z");

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

    const earlier = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name < MIGRATION)
      .map((entry) => entry.name)
      .sort();
    for (const name of earlier) {
      await db.query(migrationSql(name));
    }

    // Users as they exist before the migration: a live phone User and one
    // purged under the old `deleted:<id>` phone tombstone.
    await db.query(
      `INSERT INTO users (id, phone, "createdAt", "updatedAt") VALUES ($1, $2, $3, now()), ($4, $5, now(), now())`,
      [LIVE_ID, "+99361111111", LIVE_CREATED_AT, TOMBSTONED_ID, `deleted:${TOMBSTONED_ID}`],
    );

    await db.query(migrationSql(MIGRATION));
  }, 120_000);

  afterAll(async () => {
    await db.end();
    await container.stop();
  });

  async function userRow(id: string) {
    const { rows } = await db.query(
      `SELECT phone, "phoneVerifiedAt", email, "emailVerifiedAt" FROM users WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  it("keeps existing phones and backfills phoneVerifiedAt = createdAt", async () => {
    const row = await userRow(LIVE_ID);
    expect(row.phone).toBe("+99361111111");
    expect(row.phoneVerifiedAt).toEqual(LIVE_CREATED_AT);
    expect(row.email).toBeNull();
    expect(row.emailVerifiedAt).toBeNull();
  });

  it("frees phones held by the old deleted:<id> tombstone", async () => {
    const row = await userRow(TOMBSTONED_ID);
    expect(row.phone).toBeNull();
    expect(row.phoneVerifiedAt).toBeNull();
  });

  it("rejects a stored phone or email without its verified-at time", async () => {
    await expect(
      db.query(
        `INSERT INTO users (id, phone, "updatedAt") VALUES (gen_random_uuid(), '+99362222222', now())`,
      ),
    ).rejects.toThrow(/users_phone_verified_check/);
    await expect(
      db.query(
        `INSERT INTO users (id, email, "updatedAt") VALUES (gen_random_uuid(), 'a@example.com', now())`,
      ),
    ).rejects.toThrow(/users_email_verified_check/);
    await expect(
      db.query(
        `INSERT INTO users (id, "emailVerifiedAt", "updatedAt") VALUES (gen_random_uuid(), now(), now())`,
      ),
    ).rejects.toThrow(/users_email_verified_check/);
  });

  it("keeps phone and email unique while allowing many Users with neither", async () => {
    await db.query(
      `INSERT INTO users (id, email, "emailVerifiedAt", "updatedAt") VALUES (gen_random_uuid(), 'dup@example.com', now(), now())`,
    );
    await expect(
      db.query(
        `INSERT INTO users (id, email, "emailVerifiedAt", "updatedAt") VALUES (gen_random_uuid(), 'dup@example.com', now(), now())`,
      ),
    ).rejects.toThrow(/users_email_key/);
    await expect(
      db.query(
        `INSERT INTO users (id, phone, "phoneVerifiedAt", "updatedAt") VALUES (gen_random_uuid(), '+99361111111', now(), now())`,
      ),
    ).rejects.toThrow(/users_phone_key/);

    await db.query(
      `INSERT INTO users (id, "updatedAt") VALUES (gen_random_uuid(), now()), (gen_random_uuid(), now())`,
    );
  });

  it("lets a later User take a phone and email freed by the purge", async () => {
    const purgedId = "00000000-0000-4000-8000-000000000003";
    await db.query(
      `INSERT INTO users (id, phone, "phoneVerifiedAt", email, "emailVerifiedAt", "updatedAt")
       VALUES ($1, '+99363333333', now(), 'reuse@example.com', now(), now())`,
      [purgedId],
    );

    // The day-30 purge's User update (apps/worker PurgeExpiredAccounts).
    await db.query(
      `UPDATE users SET phone = NULL, "phoneVerifiedAt" = NULL, email = NULL, "emailVerifiedAt" = NULL WHERE id = $1`,
      [purgedId],
    );

    await db.query(
      `INSERT INTO users (id, phone, "phoneVerifiedAt", email, "emailVerifiedAt", "updatedAt")
       VALUES (gen_random_uuid(), '+99363333333', now(), 'reuse@example.com', now(), now())`,
    );
    const { rows } = await db.query(
      `SELECT count(*)::int AS n FROM users WHERE phone = '+99363333333' AND email = 'reuse@example.com'`,
    );
    expect(rows[0].n).toBe(1);
  });
});
