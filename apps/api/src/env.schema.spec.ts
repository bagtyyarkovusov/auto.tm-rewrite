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
