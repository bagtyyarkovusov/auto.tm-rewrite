import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { EnvSchema } from "./env.schema";

const baseEnv = {
  NODE_ENV: "test",
  PORT: "3006",
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  TOTP_SECRET_ENCRYPTION_KEY: "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
};

describe("EnvSchema socket defaults", () => {
  it("defaults Socket.IO settings to single-node mode", () => {
    const env = EnvSchema.parse(baseEnv);

    expect(env.SOCKET_IO_NAMESPACE).toBe("/ws/chat");
    expect(env.SOCKET_IO_CORS_ORIGIN).toBe("*");
    expect(env.SOCKET_IO_REDIS_ADAPTER_ENABLED).toBe(false);
  });

  it("parses Redis adapter enabled flag", () => {
    const env = EnvSchema.parse({
      ...baseEnv,
      SOCKET_IO_REDIS_ADAPTER_ENABLED: "true",
    });

    expect(env.SOCKET_IO_REDIS_ADAPTER_ENABLED).toBe(true);
  });

  it("preserves REDIS_URL when the Redis adapter is enabled", () => {
    const env = EnvSchema.parse({
      ...baseEnv,
      SOCKET_IO_REDIS_ADAPTER_ENABLED: "true",
    });

    expect(env.REDIS_URL).toBe("redis://localhost:6379");
  });

  it("applies a custom Socket.IO namespace", () => {
    const env = EnvSchema.parse({
      ...baseEnv,
      SOCKET_IO_NAMESPACE: "/custom",
    });

    expect(env.SOCKET_IO_NAMESPACE).toBe("/custom");
  });
});

describe("API environment template", () => {
  it("documents the required TOTP secret encryption key", () => {
    const template = readFileSync(resolve(__dirname, "../.env.template"), "utf8");
    const match = template.match(/^TOTP_SECRET_ENCRYPTION_KEY=([^\s#]+)/m);

    expect(match?.[1]).toBeDefined();
    expect(Buffer.from(match?.[1] ?? "", "base64")).toHaveLength(32);
  });
});

const deployedEnv = {
  ...baseEnv,
  NODE_ENV: "production",
  APP_ENV: "production",
  DATABASE_URL: "postgres://user:pass@postgres.railway.internal:5432/railway",
  REDIS_URL: "redis://default:pass@redis.railway.internal:6379",
  MINIO_ENDPOINT: "http://minio.railway.internal:9000",
  MINIO_PUBLIC_URL: "https://minio-production.up.railway.app",
  MINIO_ACCESS_KEY: "deployed-key",
  MINIO_SECRET_KEY: "deployed-secret",
  JWT_ACCESS_SECRET: `a${"1".repeat(40)}`,
  JWT_REFRESH_SECRET: `b${"2".repeat(40)}`,
  SOCKET_IO_CORS_ORIGIN: "https://admin.auto.tm",
};

function reviewerDemoAccount(index: number): { phone: string; code: string } {
  return {
    phone: `+99365${String(index).padStart(6, "0")}`,
    code: String(index).repeat(6),
  };
}

describe("EnvSchema reviewer-era safety (fail-closed outside CI)", () => {
  it("allows OTP test mode and the test SMS driver only when NODE_ENV=test", () => {
    expect(() =>
      EnvSchema.parse({
        ...baseEnv,
        OTP_TEST_MODE: "true",
        OTP_TEST_CODE_RESPONSE: "true",
        SMS_DRIVER: "test",
      }),
    ).not.toThrow();
  });

  it("rejects OTP_TEST_MODE outside CI", () => {
    expect(() =>
      EnvSchema.parse({ ...baseEnv, NODE_ENV: "development", OTP_TEST_MODE: "true" }),
    ).toThrow(/OTP_TEST_MODE/);
    expect(() =>
      EnvSchema.parse({ ...deployedEnv, OTP_TEST_MODE: "true" }),
    ).toThrow(/OTP_TEST_MODE/);
  });

  it("rejects OTP_TEST_CODE_RESPONSE outside CI", () => {
    expect(() =>
      EnvSchema.parse({ ...deployedEnv, OTP_TEST_CODE_RESPONSE: "true" }),
    ).toThrow(/OTP_TEST_CODE_RESPONSE/);
  });

  it("rejects SMS_DRIVER=test outside CI", () => {
    expect(() =>
      EnvSchema.parse({ ...baseEnv, NODE_ENV: "development", SMS_DRIVER: "test" }),
    ).toThrow(/SMS_DRIVER/);
    expect(() => EnvSchema.parse({ ...deployedEnv, SMS_DRIVER: "test" })).toThrow(
      /SMS_DRIVER/,
    );
  });

  it("accepts SMS_DRIVER=mock in deployed environments", () => {
    expect(() =>
      EnvSchema.parse({ ...deployedEnv, SMS_DRIVER: "mock" }),
    ).not.toThrow();
  });

  it("defaults reviewer demo-account bypass off with no configured accounts", () => {
    const env = EnvSchema.parse(baseEnv);

    expect(env.REVIEW_DEMO_ACCOUNT_ENABLED).toBe(false);
    expect(env.REVIEW_DEMO_ACCOUNTS_JSON).toBe("[]");
  });

  it("requires 3 to 5 secret-managed reviewer demo accounts when enabled", () => {
    const accounts = JSON.stringify([
      reviewerDemoAccount(1),
      reviewerDemoAccount(2),
      reviewerDemoAccount(3),
    ]);

    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        REVIEW_DEMO_ACCOUNT_ENABLED: "true",
        REVIEW_DEMO_ACCOUNTS_JSON: accounts,
      }),
    ).not.toThrow();
  });

  it("rejects enabled reviewer bypass with too few, too many, malformed, or duplicate accounts", () => {
    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        REVIEW_DEMO_ACCOUNT_ENABLED: "true",
        REVIEW_DEMO_ACCOUNTS_JSON: JSON.stringify([
          reviewerDemoAccount(1),
          reviewerDemoAccount(2),
        ]),
      }),
    ).toThrow(/REVIEW_DEMO_ACCOUNTS_JSON/);

    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        REVIEW_DEMO_ACCOUNT_ENABLED: "true",
        REVIEW_DEMO_ACCOUNTS_JSON: JSON.stringify([
          reviewerDemoAccount(1),
          reviewerDemoAccount(2),
          reviewerDemoAccount(3),
          reviewerDemoAccount(4),
          reviewerDemoAccount(5),
          reviewerDemoAccount(6),
        ]),
      }),
    ).toThrow(/REVIEW_DEMO_ACCOUNTS_JSON/);

    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        REVIEW_DEMO_ACCOUNT_ENABLED: "true",
        REVIEW_DEMO_ACCOUNTS_JSON: "not-json",
      }),
    ).toThrow(/REVIEW_DEMO_ACCOUNTS_JSON/);

    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        REVIEW_DEMO_ACCOUNT_ENABLED: "true",
        REVIEW_DEMO_ACCOUNTS_JSON: JSON.stringify([
          reviewerDemoAccount(1),
          { ...reviewerDemoAccount(2), phone: reviewerDemoAccount(1).phone },
          reviewerDemoAccount(3),
        ]),
      }),
    ).toThrow(/REVIEW_DEMO_ACCOUNTS_JSON/);
  });
});

describe("EnvSchema deployed-environment endpoint rules", () => {
  it("accepts a coherent production configuration", () => {
    const env = EnvSchema.parse(deployedEnv);
    expect(env.APP_ENV).toBe("production");
  });

  it("rejects loopback data endpoints in staging and production", () => {
    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      }),
    ).toThrow(/DATABASE_URL/);
    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        APP_ENV: "staging",
        REDIS_URL: "redis://127.0.0.1:6379",
      }),
    ).toThrow(/REDIS_URL/);
  });

  it("rejects staging hosts from production and production hosts from staging", () => {
    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        DATABASE_URL: "postgres://u:p@postgres-staging.internal:5432/db",
      }),
    ).toThrow(/DATABASE_URL/);
    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        APP_ENV: "staging",
        MINIO_PUBLIC_URL: "https://minio-production.up.railway.app",
      }),
    ).toThrow(/MINIO_PUBLIC_URL/);
  });

  it("requires distinct private and public MinIO endpoints in deployed environments", () => {
    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        MINIO_ENDPOINT: "https://minio-production.up.railway.app",
        MINIO_PUBLIC_URL: "https://minio-production.up.railway.app",
      }),
    ).toThrow(/MINIO_PUBLIC_URL/);
  });

  it("rejects internal MinIO public URLs and non-HTTPS production media URLs", () => {
    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        MINIO_PUBLIC_URL: "http://minio.railway.internal:9000",
      }),
    ).toThrow(/MINIO_PUBLIC_URL/);
    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        MINIO_PUBLIC_URL: "http://minio-production.up.railway.app",
      }),
    ).toThrow(/MINIO_PUBLIC_URL/);
  });

  it("allows local development to use one MinIO endpoint for private and public access", () => {
    expect(() =>
      EnvSchema.parse({
        ...baseEnv,
        MINIO_ENDPOINT: "http://localhost:9000",
        MINIO_PUBLIC_URL: "http://localhost:9000",
      }),
    ).not.toThrow();
  });

  it("rejects default MinIO credentials and placeholder JWT secrets in deployed envs", () => {
    expect(() =>
      EnvSchema.parse({ ...deployedEnv, MINIO_SECRET_KEY: "minioadmin" }),
    ).toThrow(/MINIO_ACCESS_KEY/);
    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        JWT_ACCESS_SECRET: "replace_me_with_64_char_random_string_padded",
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("rejects identical JWT secrets and wildcard Socket.IO CORS in production", () => {
    expect(() =>
      EnvSchema.parse({
        ...deployedEnv,
        JWT_REFRESH_SECRET: deployedEnv.JWT_ACCESS_SECRET,
      }),
    ).toThrow(/JWT_REFRESH_SECRET/);
    expect(() =>
      EnvSchema.parse({ ...deployedEnv, SOCKET_IO_CORS_ORIGIN: "*" }),
    ).toThrow(/SOCKET_IO_CORS_ORIGIN/);
  });

  it("allows loopback endpoints in development", () => {
    expect(() => EnvSchema.parse(baseEnv)).not.toThrow();
  });
});

describe("EnvSchema deploy metadata", () => {
  it("defaults APP_ENV to development and AUTOTM_COMMIT_SHA to unknown", () => {
    const env = EnvSchema.parse(baseEnv);
    expect(env.APP_ENV).toBe("development");
    expect(env.AUTOTM_COMMIT_SHA).toBe("unknown");
  });
});
