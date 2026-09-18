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

describe("useAuth", () => {
  beforeEach(() => {
    mockLoadAuthSession.mockReset();
    sessionListener = undefined;
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

    sessionListener?.();

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
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

    sessionListener?.();

    await waitFor(() => expect(result.current.phone).toBe("+99361000000"));
  });

  it("clears the phone when the session goes away", async () => {
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

    sessionListener?.();

    await waitFor(() => expect(result.current.phone).toBe(""));
    expect(result.current.isAuthenticated).toBe(false);
  });
});
