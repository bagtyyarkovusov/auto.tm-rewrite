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

  it("records last-seen when the last socket disconnects", () => {
    registry.register("socket-1", "user-1");

    const before = new Date();
    registry.unregister("socket-1");
    const after = new Date();

    expect(registry.isUserOnline("user-1")).toBe(false);
    const lastSeen = registry.getLastSeenAt("user-1");
    expect(lastSeen).toBeDefined();
    expect(lastSeen!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastSeen!.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("clears last-seen when a user comes back online", () => {
    registry.register("socket-1", "user-1");
    registry.unregister("socket-1");
    expect(registry.getLastSeenAt("user-1")).toBeDefined();

    registry.register("socket-2", "user-1");
    expect(registry.getLastSeenAt("user-1")).toBeUndefined();
  });

  it("does not record last-seen while the user still has other sockets", () => {
    registry.register("socket-1", "user-1");
    registry.register("socket-2", "user-1");

    registry.unregister("socket-1");
    expect(registry.isUserOnline("user-1")).toBe(true);
    expect(registry.getLastSeenAt("user-1")).toBeUndefined();
  });
});
