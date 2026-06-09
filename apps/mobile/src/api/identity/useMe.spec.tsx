// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useMe } from "./useMe";

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

describe("useMe", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("returns parsed me response", async () => {
    mockGet.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      phone: "+99361000000",
      displayName: "Aşgabat",
      role: "buyer",
      avatarUrl: null,
      locale: "ru",
      createdAt: "2024-01-15T08:30:00.000Z",
    });

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.phone).toBe("+99361000000");
    expect(result.current.data?.displayName).toBe("Aşgabat");
    expect(result.current.data?.role).toBe("buyer");
    expect(mockGet).toHaveBeenCalledWith("/me", expect.any(Object));
  });

  it("surfaces a contract violation when API returns garbage", async () => {
    mockGet.mockRejectedValue(
      new (class extends Error {
        constructor(
          public code: string,
          public status: number,
          message?: string,
        ) {
          super(message ?? code);
          this.name = "ApiError";
        }
      })("CONTRACT_VIOLATION", 502, "Bad response"),
    );

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect((result.current.error as unknown as { code: string }).code).toBe(
      "CONTRACT_VIOLATION",
    );
  });
});
