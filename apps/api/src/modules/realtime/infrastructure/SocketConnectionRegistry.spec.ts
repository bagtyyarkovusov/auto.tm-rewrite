import { describe, it, expect, beforeEach } from "vitest";

import { SocketConnectionRegistry } from "./SocketConnectionRegistry";

describe("SocketConnectionRegistry", () => {
  let registry: SocketConnectionRegistry;

  beforeEach(() => {
    registry = new SocketConnectionRegistry();
  });

  it("tracks a single connection", () => {
    registry.register("socket-1", "user-1");

    expect(registry.isUserOnline("user-1")).toBe(true);
    expect(registry.getSocketCountForUser("user-1")).toBe(1);
    expect(registry.getOnlineUserCount()).toBe(1);
  });

  it("counts multiple sockets for the same user", () => {
    registry.register("socket-1", "user-1");
    registry.register("socket-2", "user-1");

    expect(registry.getSocketCountForUser("user-1")).toBe(2);
    expect(registry.getOnlineUserCount()).toBe(1);
  });

  it("removes a user from online set when their last socket disconnects", () => {
    registry.register("socket-1", "user-1");
    registry.register("socket-2", "user-1");

    registry.unregister("socket-1");
    expect(registry.isUserOnline("user-1")).toBe(true);
    expect(registry.getSocketCountForUser("user-1")).toBe(1);

    registry.unregister("socket-2");
    expect(registry.isUserOnline("user-1")).toBe(false);
    expect(registry.getSocketCountForUser("user-1")).toBe(0);
    expect(registry.getOnlineUserCount()).toBe(0);
  });

  it("ignores unregistering an unknown socket", () => {
    registry.unregister("socket-unknown");

    expect(registry.getOnlineUserCount()).toBe(0);
  });

  it("does not double-count duplicate registrations for the same socket", () => {
    registry.register("socket-1", "user-1");
    registry.register("socket-1", "user-1");

    expect(registry.getSocketCountForUser("user-1")).toBe(1);
  });

  it("tracks multiple users independently", () => {
    registry.register("socket-a", "user-1");
    registry.register("socket-b", "user-2");

    expect(registry.getOnlineUserCount()).toBe(2);
    expect(registry.isUserOnline("user-1")).toBe(true);
    expect(registry.isUserOnline("user-2")).toBe(true);
  });
});
