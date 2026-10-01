import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

const MIGRATION = "20261002000000_remove_reported_listing_status";
const migrationsDir = new URL("../prisma/migrations", import.meta.url).pathname;
const migrationSql = readFileSync(join(migrationsDir, MIGRATION, "migration.sql"), "utf-8");

async function insertListing(db: Client, id: string, status: string): Promise<void> {
  await db.query(
    `INSERT INTO listings (id, "sellerId", "brandId", "modelId", "cityId", "priceAmount",
      status, "updatedAt")
     VALUES ($1, 'seller', 'brand', 'model', 'city', 100, $2::"ListingStatus", now())`,
    [id, status],
  );
}

async function enumLabels(db: Client): Promise<string[]> {
  const result = await db.query<{ enumlabel: string }>(
    `SELECT e.enumlabel FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'ListingStatus' ORDER BY e.enumsortorder`,
  );
  return result.rows.map((row) => row.enumlabel);
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

    const earlier = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name < MIGRATION)
      .map((entry) => entry.name)
      .sort();
    for (const name of earlier) {
      await db.query(readFileSync(join(migrationsDir, name, "migration.sql"), "utf-8"));
    }

    await db.query(`INSERT INTO users (id, phone, "phoneVerifiedAt", "updatedAt")
      VALUES ('seller', '+99361111111', now(), now())`);
    for (const [table, id] of [
      ["brands", "brand"],
      ["regions", "region"],
    ] as const) {
      await db.query(`INSERT INTO ${table} (id, slug, "nameRu", "nameTk", "nameEn", "updatedAt")
        VALUES ($1, $1, $1, $1, $1, now())`, [id]);
    }
    await db.query(`INSERT INTO models (id, "brandId", slug, "nameRu", "nameTk", "nameEn", "updatedAt")
      VALUES ('model', 'brand', 'model', 'model', 'model', 'model', now())`);
    await db.query(`INSERT INTO cities (id, "regionId", slug, "nameRu", "nameTk", "nameEn", "updatedAt")
      VALUES ('city', 'region', 'city', 'city', 'city', 'city', now())`);
  }, 120_000);

  afterAll(async () => {
    await db?.end();
    await container?.stop();
  });

  it("fails and changes nothing while a Listing still holds reported", async () => {
    await insertListing(db, "reported-1", "reported");

    try {
      await expect(db.query(migrationSql)).rejects.toThrow(/invalid input value for enum/);
      await db.query("ROLLBACK");

      expect(await enumLabels(db)).toContain("reported");
      const row = await db.query<{ status: string }>(
        `SELECT status::text AS status FROM listings WHERE id = 'reported-1'`,
      );
      expect(row.rows[0]?.status).toBe("reported");
    } finally {
      // Runs even when an assertion above fails, so the second case does not
      // trip over this row and hide the original failure behind an enum-cast error.
      // ROLLBACK is a no-op outside a transaction and clears an aborted one.
      await db.query("ROLLBACK");
      await db.query(`DELETE FROM listings WHERE id = 'reported-1'`);
    }
  });

  it("removes reported, keeps stored statuses and the draft default", async () => {
    for (const status of ["draft", "active", "sold", "archived", "banned"]) {
      await insertListing(db, `kept-${status}`, status);
    }

    await db.query(migrationSql);

    expect(await enumLabels(db)).toEqual([
      "draft",
      "pending_review",
      "active",
      "sold",
      "archived",
      "rejected",
      "banned",
    ]);

    const kept = await db.query<{ id: string; status: string }>(
      `SELECT id, status::text AS status FROM listings WHERE id LIKE 'kept-%' ORDER BY id`,
    );
    expect(kept.rows.map((row) => [row.id, row.status])).toEqual([
      ["kept-active", "active"],
      ["kept-archived", "archived"],
      ["kept-banned", "banned"],
      ["kept-draft", "draft"],
      ["kept-sold", "sold"],
    ]);

    await db.query(`INSERT INTO listings (id, "sellerId", "brandId", "modelId", "cityId",
      "priceAmount", "updatedAt") VALUES ('defaulted', 'seller', 'brand', 'model', 'city', 100, now())`);
    const defaulted = await db.query<{ status: string }>(
      `SELECT status::text AS status FROM listings WHERE id = 'defaulted'`,
    );
    expect(defaulted.rows[0]?.status).toBe("draft");

    await expect(insertListing(db, "reported-2", "reported")).rejects.toThrow(
      /invalid input value for enum/,
    );
  });
});
