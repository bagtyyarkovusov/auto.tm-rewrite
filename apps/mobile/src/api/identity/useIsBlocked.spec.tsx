// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useIsBlocked } from "./useIsBlocked";

const mockGet = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      public status: number,
      message?: string,
    ) {
      super(message ?? code);
      this.name = "ApiError";
    }
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useIsBlocked", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("returns blocked: true when a block exists", async () => {
    mockGet.mockResolvedValue({ blocked: true });

    const { result } = renderHook(
      () => useIsBlocked("550e8400-e29b-41d4-a716-446655440001"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ blocked: true });
    expect(mockGet).toHaveBeenCalledWith(
      "/me/blocked-users/550e8400-e29b-41d4-a716-446655440001",
      expect.any(Object),
    );
  });

  it("is disabled when userId is empty", async () => {
    const { result } = renderHook(() => useIsBlocked("", { enabled: true }), {
      wrapper,
    });

    expect(result.current.isPending).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
