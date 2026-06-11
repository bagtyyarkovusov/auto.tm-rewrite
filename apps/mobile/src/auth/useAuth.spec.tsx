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
});
