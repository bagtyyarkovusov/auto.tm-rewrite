// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useBlockUser } from "./useBlockUser";

const mockPost = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: (...args: unknown[]) => mockPost(...args),
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

describe("useBlockUser", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("posts to /me/blocked-users and returns blocked: true", async () => {
    mockPost.mockResolvedValue({ blocked: true });

    const { result } = renderHook(() => useBlockUser(), { wrapper });

    result.current.mutate({ userId: "550e8400-e29b-41d4-a716-446655440001" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ blocked: true });
    expect(mockPost).toHaveBeenCalledWith(
      "/me/blocked-users",
      { userId: "550e8400-e29b-41d4-a716-446655440001" },
      expect.any(Object),
    );
  });
});
