// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useUnblockUser } from "./useUnblockUser";

const mockDelete = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
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

describe("useUnblockUser", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it("deletes /me/blocked-users/:userId and returns unblocked: true", async () => {
    mockDelete.mockResolvedValue({ unblocked: true });

    const { result } = renderHook(() => useUnblockUser(), { wrapper });

    result.current.mutate({ userId: "550e8400-e29b-41d4-a716-446655440001" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ unblocked: true });
    expect(mockDelete).toHaveBeenCalledWith(
      "/me/blocked-users/550e8400-e29b-41d4-a716-446655440001",
      expect.any(Object),
    );
  });
});
