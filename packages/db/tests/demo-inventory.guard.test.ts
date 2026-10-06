import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertDemoInventoryTarget } from "../scripts/demo-inventory/guard";

// Every value is fake. Nothing here opens a connection.
const SECRET = "sk-FAKE-SECRET-must-never-be-printed";

const production = {
  APP_ENV: "production",
  SIGNUPS_ENABLED: "false",
  DEMO_INVENTORY_AUTHORIZATION: "seed-demo-inventory",
  DATABASE_URL: `postgresql://autotm:${SECRET}@postgres.railway.internal:5432/railway`,
  MINIO_ENDPOINT: "http://minio.railway.internal:9000",
  MINIO_ACCESS_KEY: "autotm",
  MINIO_SECRET_KEY: SECRET,
};

const local = {
  APP_ENV: "development",
  DEMO_INVENTORY_AUTHORIZATION: "seed-demo-inventory",
  DATABASE_URL: `postgresql://auto_tm:${SECRET}@localhost:5433/auto_tm`,
  MINIO_ENDPOINT: "http://127.0.0.1:9000",
  MINIO_ACCESS_KEY: "minioadmin",
  MINIO_SECRET_KEY: SECRET,
};

function refusal(env: Record<string, string | undefined>, mode: "seed" | "remove"): string {
  try {
    assertDemoInventoryTarget(env, mode);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the guard to refuse");
}

describe("demo inventory guard", () => {
  it("accepts production and staging on private Railway connections", () => {
    expect(assertDemoInventoryTarget(production, "seed")).toEqual({
      databaseUrl: production.DATABASE_URL,
      minioEndpoint: production.MINIO_ENDPOINT,
      minioAccessKey: production.MINIO_ACCESS_KEY,
      minioSecretKey: production.MINIO_SECRET_KEY,
      minioRegion: "us-east-1",
    });
    expect(() =>
      assertDemoInventoryTarget({ ...production, APP_ENV: "staging", SIGNUPS_ENABLED: "true" }, "seed"),
    ).not.toThrow();
  });

  it("accepts a development or test database only on a loopback host", () => {
    expect(() => assertDemoInventoryTarget(local, "seed")).not.toThrow();
    expect(() => assertDemoInventoryTarget({ ...local, APP_ENV: "test" }, "seed")).not.toThrow();
    expect(refusal({ ...local, DATABASE_URL: production.DATABASE_URL }, "seed")).toMatch(
      /DATABASE_URL must be a loopback host/,
    );
    expect(refusal({ ...local, MINIO_ENDPOINT: production.MINIO_ENDPOINT }, "seed")).toMatch(
      /MINIO_ENDPOINT must be a loopback host/,
    );
  });

  it("refuses a wrong environment", () => {
    for (const appEnv of [undefined, "", "prod", "preview", "Production"]) {
      expect(refusal({ ...production, APP_ENV: appEnv }, "seed")).toMatch(
        /APP_ENV must be production, staging, development or test/,
      );
    }
  });

  it("refuses a missing or wrong authorization, and one meant for the other mode", () => {
    for (const authorization of [undefined, "", "true", "seed-reviewer-scenario"]) {
      expect(
        refusal({ ...production, DEMO_INVENTORY_AUTHORIZATION: authorization }, "seed"),
      ).toMatch(/set DEMO_INVENTORY_AUTHORIZATION=seed-demo-inventory/);
    }
    expect(refusal(production, "remove")).toMatch(
      /set DEMO_INVENTORY_AUTHORIZATION=remove-demo-inventory/,
    );
    expect(
      refusal({ ...production, DEMO_INVENTORY_AUTHORIZATION: "remove-demo-inventory" }, "seed"),
    ).toMatch(/set DEMO_INVENTORY_AUTHORIZATION=seed-demo-inventory/);
    expect(() =>
      assertDemoInventoryTarget(
        { ...production, DEMO_INVENTORY_AUTHORIZATION: "remove-demo-inventory" },
        "remove",
      ),
    ).not.toThrow();
  });

  it("refuses a public or loopback database origin in a deployed environment", () => {
    for (const host of [
      "roundhouse.proxy.rlwy.net:41234",
      "postgres-production.up.railway.app:5432",
      "db.example.com:5432",
      "localhost:5432",
      "postgres.railway.internal.example.com:5432",
    ]) {
      expect(
        refusal({ ...production, DATABASE_URL: `postgresql://autotm:${SECRET}@${host}/railway` }, "seed"),
      ).toMatch(/DATABASE_URL must be a private Railway host/);
    }
    expect(refusal({ ...production, DATABASE_URL: "mysql://postgres.railway.internal/x" }, "seed")).toMatch(
      /DATABASE_URL must be a PostgreSQL URL/,
    );
  });

  it("refuses a database URL whose host or port parameter would redirect the connection", () => {
    // The driver lets `?host=` and `?port=` override the URL's own host, so a private-looking URL
    // could still reach a public proxy.
    for (const query of ["host=roundhouse.proxy.rlwy.net&port=41234", "host=db.example.com", "port=41234"]) {
      expect(
        refusal({ ...production, DATABASE_URL: `${production.DATABASE_URL}?${query}` }, "seed"),
      ).toMatch(/DATABASE_URL must not set a host or port parameter/);
      expect(refusal({ ...local, DATABASE_URL: `${local.DATABASE_URL}?${query}` }, "seed")).toMatch(
        /DATABASE_URL must not set a host or port parameter/,
      );
    }
    expect(() =>
      assertDemoInventoryTarget({ ...production, DATABASE_URL: `${production.DATABASE_URL}?sslmode=disable` }, "seed"),
    ).not.toThrow();
  });

  it("refuses a public MinIO origin in a deployed environment", () => {
    for (const endpoint of [
      "https://minio-production.up.railway.app",
      "https://media.autotm.bagtyyar.dev",
      "http://localhost:9000",
    ]) {
      expect(refusal({ ...production, MINIO_ENDPOINT: endpoint }, "seed")).toMatch(
        /MINIO_ENDPOINT must be a private Railway host/,
      );
      expect(
        refusal(
          { ...production, DEMO_INVENTORY_AUTHORIZATION: "remove-demo-inventory", MINIO_ENDPOINT: endpoint },
          "remove",
        ),
      ).toMatch(/MINIO_ENDPOINT must be a private Railway host/);
    }
  });

  it("seeds production only while it is reviewer-only, and removes regardless", () => {
    for (const signups of [undefined, "true", ""]) {
      expect(refusal({ ...production, SIGNUPS_ENABLED: signups }, "seed")).toMatch(
        /SIGNUPS_ENABLED must be false to seed production/,
      );
    }
    expect(() =>
      assertDemoInventoryTarget(
        { ...production, SIGNUPS_ENABLED: "true", DEMO_INVENTORY_AUTHORIZATION: "remove-demo-inventory" },
        "remove",
      ),
    ).not.toThrow();
  });

  it("requires every connection variable and never prints a value", () => {
    for (const key of ["DATABASE_URL", "MINIO_ENDPOINT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY"] as const) {
      expect(refusal({ ...production, [key]: undefined }, "seed")).toMatch(new RegExp(`requires ${key}`));
    }
    const messages = [
      refusal({ ...production, DATABASE_URL: `postgresql://u:${SECRET}@db.example.com/x` }, "seed"),
      refusal({ ...production, DATABASE_URL: `not a url ${SECRET}` }, "seed"),
      refusal({ ...production, MINIO_ENDPOINT: `http://${SECRET}` }, "seed"),
      refusal({ ...production, DEMO_INVENTORY_AUTHORIZATION: SECRET }, "seed"),
      refusal({ ...production, APP_ENV: SECRET }, "seed"),
    ];
    for (const message of messages) {
      expect(message).not.toContain(SECRET);
      expect(message).not.toContain("db.example.com");
    }
  });
});

describe("demo-inventory.ts entry point", () => {
  const packageDir = fileURLToPath(new URL("..", import.meta.url));
  const run = (args: string[], env: Record<string, string>) =>
    spawnSync(process.execPath, ["--import", "tsx", "scripts/demo-inventory.ts", ...args], {
      cwd: packageDir,
      // Only these variables: nothing from the developer's shell can authorize a run.
      env: { PATH: process.env["PATH"] ?? "", ...env },
      encoding: "utf8",
    });

  it("refuses an unauthorized run before connecting, and prints no secret", () => {
    const result = run(["--mode", "seed"], { ...production, DEMO_INVENTORY_AUTHORIZATION: "" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Demo inventory seed refused: set DEMO_INVENTORY_AUTHORIZATION=seed-demo-inventory");
    expect(result.stdout + result.stderr).not.toContain(SECRET);
  });

  it("does not let a seed authorization run a removal", () => {
    const result = run(["--mode", "remove"], production);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Demo inventory remove refused: set DEMO_INVENTORY_AUTHORIZATION=remove-demo-inventory");
  });

  it("needs a mode", () => {
    const result = run([], production);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Usage: demo-inventory.ts --mode seed|remove");
  });
});
