// @vitest-environment happy-dom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useAuth } from "./useAuth";

const mockLoadAuthSession = vi.fn();
let sessionListener: (() => void) | undefined;

vi.mock("./session", () => ({
  loadAuthSession: (...args: unknown[]) => mockLoadAuthSession(...args),
  subscribeAuthSession: (listener: () => void) => {
    sessionListener = listener;
    return () => {
      if (sessionListener === listener) {
        sessionListener = undefined;
      }
    };
  },
}));

let mockSnapshot: unknown;

vi.mock("./sessionSnapshot", () => ({
  peekAuthSession: () => mockSnapshot,
}));

describe("useAuth", () => {
  beforeEach(() => {
    mockLoadAuthSession.mockReset();
    sessionListener = undefined;
    mockSnapshot = undefined;
  });

  // Android recreated the Activity: every screen mounts again while the app
  // process, and what it knows about the session, stays alive.
  it("is signed in on its first render when the app already read the session", () => {
    mockSnapshot = { user: { id: "user-abc", phone: "+99361000000" } };
    mockLoadAuthSession.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userId).toBe("user-abc");
    expect(result.current.phone).toBe("+99361000000");
  });

  it("is signed out on its first render when the app already knows there is no session", () => {
    mockSnapshot = null;
    mockLoadAuthSession.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userId).toBeNull();
  });

  it("does not know yet on its first render after a cold start", () => {
    mockLoadAuthSession.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBeNull();
  });

  it("follows the stored session when it differs from what the app remembered", async () => {
    mockSnapshot = { user: { id: "user-abc", phone: "+99361000000" } };
    mockLoadAuthSession.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
    expect(result.current.userId).toBeNull();
  });

  it("updates mounted consumers when auth session changes", async () => {
    mockLoadAuthSession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        accessToken: "token-123",
        refreshToken: "refresh-123",
        user: {
          id: "user-abc",
          phone: "+99361000000",
          displayName: null,
          role: "buyer",
        },
        storedAt: new Date().toISOString(),
      });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
    expect(result.current.userId).toBeNull();

    sessionListener?.();

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.userId).toBe("user-abc");
  });

  // The sell tab reads `phone` for the Step 7 contact placeholder. Signing in
  // from the sheet that tab raises must fill it without a remount (#321 sweep).
  it("exposes the session phone and picks it up on sign-in", async () => {
    mockLoadAuthSession.mockResolvedValueOnce(null).mockResolvedValueOnce({
      accessToken: "token-123",
      refreshToken: "refresh-123",
      user: {
        id: "user-abc",
        phone: "+99361000000",
        displayName: null,
        role: "seller",
      },
      storedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
    expect(result.current.phone).toBe("");
    expect(result.current.userId).toBeNull();

    sessionListener?.();

    await waitFor(() => expect(result.current.phone).toBe("+99361000000"));
    expect(result.current.userId).toBe("user-abc");
  });

  it("updates the User identity when an authenticated session changes", async () => {
    const session = { user: { id: "user-abc", phone: "+99361000000" } };
    mockLoadAuthSession.mockResolvedValueOnce(session).mockResolvedValueOnce({
      ...session,
      user: { ...session.user, id: "user-def" },
    });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.userId).toBe("user-abc"));

    sessionListener?.();

    await waitFor(() => expect(result.current.userId).toBe("user-def"));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.phone).toBe("+99361000000");
  });

  it("loads the User identity and clears it with the phone when the session goes away", async () => {
    mockLoadAuthSession
      .mockResolvedValueOnce({
        accessToken: "token-123",
        refreshToken: "refresh-123",
        user: {
          id: "user-abc",
          phone: "+99361000000",
          displayName: null,
          role: "seller",
        },
        storedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.phone).toBe("+99361000000"));
    expect(result.current.userId).toBe("user-abc");

    sessionListener?.();

    await waitFor(() => expect(result.current.phone).toBe(""));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userId).toBeNull();
  });
});
