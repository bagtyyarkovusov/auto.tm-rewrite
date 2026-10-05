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

describe("subscribeAuthUserChange", () => {
  const otherSession = {
    ...session,
    user: { ...session.user, id: "550e8400-e29b-41d4-a716-446655440001" },
  };

  /** The session module as a newly started app has it. */
  async function startApp() {
    vi.resetModules();
    return import("./session");
  }

  beforeEach(() => {
    store.clear();
  });

  it("tells the listener when another User signs in after the previous User's session ended", async () => {
    const app = await startApp();
    await app.storeAuthSession(session as never);
    await app.clearAuthSession();
    const listener = vi.fn();
    app.subscribeAuthUserChange(listener);

    await app.storeAuthSession(otherSession as never);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("tells the listener before the session listeners hear of the new session", async () => {
    const app = await startApp();
    await app.storeAuthSession(session as never);
    await app.clearAuthSession();
    const heard: string[] = [];
    app.subscribeAuthSession(() => heard.push("session"));
    app.subscribeAuthUserChange(() => heard.push("user"));

    await app.storeAuthSession(otherSession as never);

    expect(heard).toEqual(["user", "session"]);
  });

  it("signs the new User in and tells every listener when a user-change listener throws", async () => {
    const app = await startApp();
    await app.storeAuthSession(session as never);
    await app.clearAuthSession();
    const sessionListener = vi.fn();
    const laterListener = vi.fn();
    app.subscribeAuthSession(sessionListener);
    app.subscribeAuthUserChange(() => {
      throw new Error("listener failed");
    });
    app.subscribeAuthUserChange(laterListener);
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(app.storeAuthSession(otherSession as never)).resolves.toBeUndefined();

    expect(logged).toHaveBeenCalledTimes(1);
    logged.mockRestore();
    expect(laterListener).toHaveBeenCalledTimes(1);
    expect(sessionListener).toHaveBeenCalledTimes(1);
    expect((await app.loadAuthSession())?.user.id).toBe(otherSession.user.id);
  });

  it("knows the previous User from the session the app started with", async () => {
    await storeAuthSession(session as never);
    const app = await startApp();
    await app.loadAuthSession();
    await app.clearAuthSession();
    const listener = vi.fn();
    app.subscribeAuthUserChange(listener);

    await app.storeAuthSession(otherSession as never);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stays quiet when the same User's tokens are replaced or they sign in again", async () => {
    const app = await startApp();
    await app.storeAuthSession(session as never);
    const listener = vi.fn();
    app.subscribeAuthUserChange(listener);

    await app.storeAuthSession({ ...session, accessToken: "refreshed" } as never);
    await app.clearAuthSession();
    await app.storeAuthSession(session as never);

    expect(listener).not.toHaveBeenCalled();
  });

  it("stays quiet for the first sign-in after the app starts signed out", async () => {
    const app = await startApp();
    const listener = vi.fn();
    app.subscribeAuthUserChange(listener);

    await app.storeAuthSession(session as never);

    expect(listener).not.toHaveBeenCalled();
  });

  it("stops telling a listener that unsubscribed", async () => {
    const app = await startApp();
    await app.storeAuthSession(session as never);
    const listener = vi.fn();
    app.subscribeAuthUserChange(listener)();

    await app.storeAuthSession(otherSession as never);

    expect(listener).not.toHaveBeenCalled();
  });
});
