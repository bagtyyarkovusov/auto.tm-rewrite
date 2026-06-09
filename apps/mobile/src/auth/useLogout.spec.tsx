// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useLogout } from "./useLogout";

const mockLoadAuthSession = vi.fn();
const mockClearAuthSession = vi.fn();
const mockPost = vi.fn();
const mockReplace = vi.fn();

vi.mock("./session", () => ({
  loadAuthSession: (...args: unknown[]) => mockLoadAuthSession(...args),
  clearAuthSession: (...args: unknown[]) => mockClearAuthSession(...args),
}));

vi.mock("../api/client", () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useLogout", () => {
  beforeEach(() => {
    mockLoadAuthSession.mockReset();
    mockClearAuthSession.mockReset();
    mockPost.mockReset();
    mockReplace.mockReset();
  });

  it("calls server logout with refresh token, clears session and cache, and redirects", async () => {
    mockLoadAuthSession.mockResolvedValue({
      accessToken: "token-123",
      refreshToken: "refresh-123",
      user: { id: "user-abc" },
      storedAt: new Date().toISOString(),
    });
    mockPost.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalledWith(
      "/auth/logout",
      { refreshToken: "refresh-123" },
      undefined,
      { auth: false },
    );
    expect(mockClearAuthSession).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
  });

  it("still clears session and redirects when server logout fails", async () => {
    mockLoadAuthSession.mockResolvedValue({
      accessToken: "token-123",
      refreshToken: "refresh-123",
      user: { id: "user-abc" },
      storedAt: new Date().toISOString(),
    });
    mockPost.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useLogout(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalled();
    expect(mockClearAuthSession).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
  });

  it("still clears session and redirects when no local session exists", async () => {
    mockLoadAuthSession.mockResolvedValue(null);

    const { result } = renderHook(() => useLogout(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockClearAuthSession).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
  });
});
