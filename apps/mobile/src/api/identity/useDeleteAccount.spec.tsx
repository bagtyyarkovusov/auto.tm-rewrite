// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useDeleteAccount } from "./useDeleteAccount";

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

describe("useDeleteAccount", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it("calls DELETE /me and resolves on success", async () => {
    mockDelete.mockResolvedValue({});

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockDelete).toHaveBeenCalledWith("/me", expect.any(Object));
  });

  it("surfaces API errors", async () => {
    const { ApiError } = await import("../client");
    mockDelete.mockRejectedValue(
      new ApiError("USER_NOT_FOUND", 404, "User not found."),
    );

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect((result.current.error as unknown as { code: string }).code).toBe(
      "USER_NOT_FOUND",
    );
  });
});
