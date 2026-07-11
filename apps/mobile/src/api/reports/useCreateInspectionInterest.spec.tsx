// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useCreateInspectionInterest } from "./useCreateInspectionInterest";

const mockPost = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: (...args: unknown[]) => mockPost(...args),
    patch: vi.fn(),
    put: vi.fn(),
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

describe("useCreateInspectionInterest", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("posts to /listings/:id/inspection-interest and parses response", async () => {
    mockPost.mockResolvedValue({
      id: "interest-1",
      listingId: "listing-1",
      requesterUserId: "user-1",
      side: "buyer",
      willingnessToPayTmt: 500,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      reusedExisting: false,
    });

    const { result } = renderHook(() => useCreateInspectionInterest(), {
      wrapper,
    });

    result.current.mutate({
      listingId: "listing-1",
      willingnessToPayTmt: 500,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.side).toBe("buyer");
    expect(result.current.data?.willingnessToPayTmt).toBe(500);
    expect(mockPost).toHaveBeenCalledWith(
      "/listings/listing-1/inspection-interest",
      { willingnessToPayTmt: 500 },
      expect.any(Object),
    );
  });

  it("omits willingnessToPayTmt from body when undefined", async () => {
    mockPost.mockResolvedValue({
      id: "interest-2",
      listingId: "listing-2",
      requesterUserId: "user-2",
      side: "seller",
      willingnessToPayTmt: null,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      reusedExisting: true,
    });

    const { result } = renderHook(() => useCreateInspectionInterest(), {
      wrapper,
    });

    result.current.mutate({ listingId: "listing-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalledWith(
      "/listings/listing-2/inspection-interest",
      {},
      expect.any(Object),
    );
  });

  it("surfaces FEATURE_DISABLED API error", async () => {
    mockPost.mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("Feature disabled");
          this.name = "ApiError";
        }
        code = "FORBIDDEN";
        status = 403;
        details = { reason: "FEATURE_DISABLED" };
      })(),
    );

    const { result } = renderHook(() => useCreateInspectionInterest(), {
      wrapper,
    });

    result.current.mutate({ listingId: "listing-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      (result.current.error as unknown as { code: string }).code,
    ).toBe("FORBIDDEN");
  });
});
