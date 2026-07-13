import { describe, it, expect } from "vitest";
import { Server } from "socket.io";

import { RealtimeIoAdapter } from "./RealtimeIoAdapter";

describe("RealtimeIoAdapter", () => {
  it("configures successfully with the Redis adapter disabled", async () => {
    const adapter = new RealtimeIoAdapter({} as never, {
      redisAdapterEnabled: false,
      redisUrl: undefined,
    });

    await expect(adapter.configure()).resolves.toBeUndefined();
  });

  it("throws when Redis adapter is enabled without a Redis URL", async () => {
    const adapter = new RealtimeIoAdapter({} as never, {
      redisAdapterEnabled: true,
      redisUrl: undefined,
    });

    await expect(adapter.configure()).rejects.toThrow(
      "Redis URL is required when the Socket.IO Redis adapter is enabled",
    );
  });

  it("creates a single-node Socket.IO server when Redis adapter is disabled", () => {
    const adapter = new RealtimeIoAdapter({} as never, {
      redisAdapterEnabled: false,
      redisUrl: undefined,
    });
    const server = adapter.createIOServer(0);

    expect(server).toBeInstanceOf(Server);
  });
});
