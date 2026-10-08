import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { BullModule, getQueueToken } from "@nestjs/bullmq";
import type { Queue, RedisClient } from "bullmq";
import { AuthSchemas } from "@auto-tm/contracts";
import { bullTestRoot } from "../../../../test/helpers/bullTestRoot";
import {
  RedisReservedPhoneAttemptLedger,
  reservedPhoneAttemptKey,
} from "./RedisReservedPhoneAttemptLedger";
import { RESERVED_PHONE_FAILURE_POLICY } from "../domain/ReservedPhoneFailurePolicy";

// These tests exercise the real Redis Lua script; the in-memory ledger cannot
// prove TTL behaviour. They run in the container-backed lane (this file is an
// e2e spec) where REDIS_URL points at a real server.
describe("RedisReservedPhoneAttemptLedger against real Redis", () => {
  let module: TestingModule;
  let ledger: RedisReservedPhoneAttemptLedger;
  let redis: RedisClient;
  const destination = "+99370000999";
  const key = reservedPhoneAttemptKey(destination);

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        bullTestRoot(),
        BullModule.registerQueue({ name: AuthSchemas.EMAIL_CODE_QUEUE }),
      ],
      providers: [RedisReservedPhoneAttemptLedger],
    }).compile();
    ledger = module.get(RedisReservedPhoneAttemptLedger);
    redis = await module.get<Queue>(getQueueToken(AuthSchemas.EMAIL_CODE_QUEUE)).client;
  });

  beforeEach(async () => {
    await redis.del(key);
  });

  afterAll(async () => {
    await redis?.del(key);
    await module?.close();
  });

  it("owns the window TTL from the first failure and never extends it mid-window", async () => {
    await expect(ledger.recordAttempt({ destination, failed: true }))
      .resolves.toEqual({ locked: false });
    const pttl = await redis.pttl(key);
    expect(pttl).toBeGreaterThan(0);
    expect(pttl).toBeLessThanOrEqual(RESERVED_PHONE_FAILURE_POLICY.failureWindowMs);

    // Shrink the window; failures 2-4 must not refresh the deadline.
    await redis.pexpire(key, 10_000);
    for (let i = 0; i < 3; i++) {
      await expect(ledger.recordAttempt({ destination, failed: true }))
        .resolves.toEqual({ locked: false });
      expect(await redis.pttl(key)).toBeLessThanOrEqual(10_000);
    }
  });

  it("starts a full lock at the fifth failure, even near the window end", async () => {
    for (let i = 0; i < 4; i++) {
      await expect(ledger.recordAttempt({ destination, failed: true }))
        .resolves.toEqual({ locked: false });
    }
    await redis.pexpire(key, 5_000);
    await expect(ledger.recordAttempt({ destination, failed: true }))
      .resolves.toEqual({ locked: true });
    const pttl = await redis.pttl(key);
    expect(pttl).toBeGreaterThan(RESERVED_PHONE_FAILURE_POLICY.lockMs - 10_000);
    expect(pttl).toBeLessThanOrEqual(RESERVED_PHONE_FAILURE_POLICY.lockMs);
  });

  it("never extends a lock on blocked or successful reads", async () => {
    for (let i = 0; i < 5; i++) {
      await ledger.recordAttempt({ destination, failed: true });
    }
    await redis.pexpire(key, 10_000);
    await expect(ledger.recordAttempt({ destination, failed: false }))
      .resolves.toEqual({ locked: true });
    await expect(ledger.recordAttempt({ destination, failed: true }))
      .resolves.toEqual({ locked: true });
    expect(await redis.pttl(key)).toBeLessThanOrEqual(10_000);
  });

  it("resets the failure count on a successful attempt", async () => {
    await ledger.recordAttempt({ destination, failed: true });
    await expect(ledger.recordAttempt({ destination, failed: false }))
      .resolves.toEqual({ locked: false });
    expect(await redis.exists(key)).toBe(0);
  });

  it("gives a TTL-less key a bounded lock instead of locking forever", async () => {
    await redis.set(key, RESERVED_PHONE_FAILURE_POLICY.maxFailures);
    await redis.persist(key);
    expect(await redis.pttl(key)).toBe(-1);
    await expect(ledger.recordAttempt({ destination, failed: false }))
      .resolves.toEqual({ locked: true });
    const pttl = await redis.pttl(key);
    expect(pttl).toBeGreaterThan(0);
    expect(pttl).toBeLessThanOrEqual(RESERVED_PHONE_FAILURE_POLICY.lockMs);
  });
});
