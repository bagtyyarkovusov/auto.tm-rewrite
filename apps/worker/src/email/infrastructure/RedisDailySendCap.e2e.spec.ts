import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Redis } from "ioredis";

import { RedisDailySendCap } from "./RedisDailySendCap";

// Runs against the Redis in REDIS_URL (local compose or the CI runner) under a
// unique key prefix, and deletes only its own keys.
const redisUrl = process.env["REDIS_URL"] ?? "";

describe.skipIf(redisUrl === "")("RedisDailySendCap — real Redis", () => {
  const prefix = `test:email:daily-sends:${randomUUID()}:`;
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis(redisUrl);
  });

  afterAll(async () => {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) await redis.del(...keys);
    await redis.quit();
  });

  const monday = new Date("2026-09-21T23:59:00Z");
  const tuesday = new Date("2026-09-22T00:01:00Z");

  it("allows sends up to the cap per UTC day, then refuses", async () => {
    const cap = new RedisDailySendCap(redis, 2, prefix);

    expect(await cap.reserve("a", monday)).toEqual({ allowed: true });
    expect(await cap.reserve("b", monday)).toEqual({ allowed: true });
    expect(await cap.reserve("c", monday)).toEqual({ allowed: false, cap: 2 });
    expect(await cap.reserve("c", tuesday)).toEqual({ allowed: true });
  });

  it("counts a repeated send ID once", async () => {
    const cap = new RedisDailySendCap(redis, 1, `${prefix}repeat:`);

    expect(await cap.reserve("a", monday)).toEqual({ allowed: true });
    expect(await cap.reserve("a", monday)).toEqual({ allowed: true });
    expect(await cap.reserve("b", monday)).toEqual({ allowed: false, cap: 1 });
  });

  it("never exceeds the cap under concurrent reservations", async () => {
    const cap = new RedisDailySendCap(redis, 5, `${prefix}race:`);

    const decisions = await Promise.all(
      Array.from({ length: 20 }, (_, i) => cap.reserve(`job-${i}`, monday)),
    );

    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(5);
  });

  it("expires each day's key", async () => {
    const cap = new RedisDailySendCap(redis, 3, `${prefix}ttl:`);
    await cap.reserve("a", monday);

    expect(await redis.ttl(`${prefix}ttl:2026-09-21`)).toBeGreaterThan(0);
  });
});
