import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
  setItemAsync: vi.fn((key: string, value: string) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((key: string) => {
    store.delete(key);
    return Promise.resolve();
  }),
}));

import {
  loadAuthSession,
  storeAuthSession,
  subscribeAuthSession,
  updateStoredSessionUser,
} from "./session";

const session = {
  accessToken: "access",
  refreshToken: "refresh",
  user: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    phone: null,
    email: "buyer@example.com",
    displayName: null,
    role: "buyer" as const,
  },
};

describe("updateStoredSessionUser", () => {
  beforeEach(() => {
    store.clear();
  });

  it("refreshes the stored User's Sign-in Methods and keeps the tokens", async () => {
    await storeAuthSession(session as never);
    const listener = vi.fn();
    const unsubscribe = subscribeAuthSession(listener);

    await updateStoredSessionUser({
      phone: "+99361000000",
      email: "buyer@example.com",
    });
    unsubscribe();

    const stored = await loadAuthSession();
    expect(stored?.accessToken).toBe("access");
    expect(stored?.refreshToken).toBe("refresh");
    expect(stored?.user.phone).toBe("+99361000000");
    expect(stored?.user.email).toBe("buyer@example.com");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing when signed out", async () => {
    await updateStoredSessionUser({ phone: "+99361000000", email: null });

    expect(await loadAuthSession()).toBeNull();
  });
});
