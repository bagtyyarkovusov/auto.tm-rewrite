import { describe, it, expect } from "vitest";
import type { INestApplicationContext } from "@nestjs/common";
import { Server } from "socket.io";

import { RealtimeIoAdapter } from "./RealtimeIoAdapter";

function buildAppContext(): INestApplicationContext {
  return {
    get: () => undefined,
  } as unknown as INestApplicationContext;
}

describe("RealtimeIoAdapter", () => {
  it("configures successfully with the Redis adapter disabled", async () => {
    const adapter = new RealtimeIoAdapter(buildAppContext(), {
      corsOrigin: "*",
      redisAdapterEnabled: false,
      redisUrl: undefined,
    });

    await expect(adapter.configure()).resolves.toBeUndefined();
  });

  it("throws when Redis adapter is enabled without a Redis URL", async () => {
    const adapter = new RealtimeIoAdapter(buildAppContext(), {
      corsOrigin: "*",
      redisAdapterEnabled: true,
      redisUrl: undefined,
    });

    await expect(adapter.configure()).rejects.toThrow(
      "Redis URL is required when the Socket.IO Redis adapter is enabled",
    );
  });

  it("creates a single-node Socket.IO server when Redis adapter is disabled", () => {
    const adapter = new RealtimeIoAdapter(buildAppContext(), {
      corsOrigin: "*",
      redisAdapterEnabled: false,
      redisUrl: undefined,
    });
    const server = adapter.createIOServer(0);

    expect(server).toBeInstanceOf(Server);
  });
});
