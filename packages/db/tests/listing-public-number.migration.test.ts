import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";

const MIGRATION = "20260929000000_add_listing_public_number";
const migrationsDir = new URL("../prisma/migrations", import.meta.url).pathname;

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
    await db.query(`INSERT INTO listings (id, "sellerId", "brandId", "modelId", "cityId",
      "priceAmount", "updatedAt") VALUES
      ('old-1', 'seller', 'brand', 'model', 'city', 100, now()),
      ('old-2', 'seller', 'brand', 'model', 'city', 200, now())`);

    await db.query(readFileSync(join(migrationsDir, MIGRATION, "migration.sql"), "utf-8"));
  }, 120_000);

  afterAll(async () => {
    await db?.end();
    await container?.stop();
  });

  it("numbers existing Listings and gives the next number to a new Listing", async () => {
    const existing = await db.query<{ publicNumber: number }>(
      `SELECT "publicNumber" FROM listings ORDER BY id`,
    );
    expect(existing.rows.map((row) => row.publicNumber)).toEqual([1, 2]);

    const added = await db.query<{ publicNumber: number }>(`INSERT INTO listings (
      id, "sellerId", "brandId", "modelId", "cityId", "priceAmount", "updatedAt"
    ) VALUES ('new-1', 'seller', 'brand', 'model', 'city', 300, now())
    RETURNING "publicNumber"`);
    expect(added.rows[0]?.publicNumber).toBe(3);

    await expect(db.query(`UPDATE listings SET "publicNumber" = 1 WHERE id = 'new-1'`))
      .rejects.toThrow(/listings_publicNumber_key/);
  });
});
