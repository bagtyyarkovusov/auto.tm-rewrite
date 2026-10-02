import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ThrottlerException,
  ThrottlerStorageService,
} from "@nestjs/throttler";
import { afterEach, describe, expect, it } from "vitest";

import { ClientIpThrottlerGuard } from "./client-ip-throttler.guard";

const EDGE_HOP = "100.64.0.9";

class Probe {
  handle(): void {}
}

function contextFor(headers: Record<string, string>): ExecutionContext {
  const req = { headers, ip: EDGE_HOP };
  const res = { header: () => res };
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    getClass: () => Probe,
    getHandler: () => Probe.prototype.handle,
  } as unknown as ExecutionContext;
}

describe("ClientIpThrottlerGuard", () => {
  const storages: ThrottlerStorageService[] = [];

  afterEach(() => {
    for (const storage of storages.splice(0)) storage.onApplicationShutdown();
  });

  async function guard(limit: number) {
    const storage = new ThrottlerStorageService();
    storages.push(storage);
    const instance = new ClientIpThrottlerGuard(
      [{ ttl: 60_000, limit }],
      storage,
      new Reflector(),
    );
    await instance.onModuleInit();
    return instance;
  }

  it("gives each client behind the same proxy hop its own bucket", async () => {
    const throttler = await guard(1);

    await expect(
      throttler.canActivate(contextFor({ "x-real-ip": "203.0.113.1" })),
    ).resolves.toBe(true);
    await expect(
      throttler.canActivate(contextFor({ "x-real-ip": "203.0.113.2" })),
    ).resolves.toBe(true);
    await expect(
      throttler.canActivate(contextFor({ "x-real-ip": "203.0.113.1" })),
    ).rejects.toBeInstanceOf(ThrottlerException);
  });

  it("counts a client that rotates X-Forwarded-For against one bucket", async () => {
    const throttler = await guard(1);
    const edge = { "x-real-ip": "203.0.113.1" };

    await expect(
      throttler.canActivate(contextFor({ ...edge, "x-forwarded-for": "1.1.1.1" })),
    ).resolves.toBe(true);
    await expect(
      throttler.canActivate(contextFor({ ...edge, "x-forwarded-for": "2.2.2.2" })),
    ).rejects.toBeInstanceOf(ThrottlerException);
  });
});
