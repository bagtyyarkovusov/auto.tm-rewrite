// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { resolve } from "path";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useUnfavoriteListing } from "./useUnfavoriteListing";

const source = readFileSync(resolve(__dirname, "./useUnfavoriteListing.ts"), "utf-8");

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

describe("useUnfavoriteListing", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it("deletes /listings/:id/favorite and returns parsed response", async () => {
    mockDelete.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUnfavoriteListing(), { wrapper });

    result.current.mutate("listing-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(
      "/listings/listing-1/favorite",
      expect.any(Object),
    );
  });

  it("surfaces API error", async () => {
    mockDelete.mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("Not found");
          this.name = "ApiError";
        }
        code = "LISTING_NOT_FOUND";
        status = 404;
      })(),
    );

    const { result } = renderHook(() => useUnfavoriteListing(), { wrapper });

    result.current.mutate("listing-1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "LISTING_NOT_FOUND",
    );
  });

  it("invalidates listing detail on success", () => {
    expect(source).toContain("queryKeys.listings.detail(listingId)");
  });

  it("invalidates favorites query on success", () => {
    expect(source).toContain("queryKeys.favorites.all()");
  });
});
