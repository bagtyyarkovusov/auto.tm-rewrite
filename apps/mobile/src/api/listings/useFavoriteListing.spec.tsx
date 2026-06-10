// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { resolve } from "path";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useFavoriteListing } from "./useFavoriteListing";

const source = readFileSync(resolve(__dirname, "./useFavoriteListing.ts"), "utf-8");

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

describe("useFavoriteListing", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("posts to /listings/:id/favorite and returns parsed response", async () => {
    mockPost.mockResolvedValue({
      id: "fav-1",
      userId: "user-1",
      listingId: "listing-1",
      createdAt: "2026-06-01T12:00:00.000Z",
    });

    const { result } = renderHook(() => useFavoriteListing(), { wrapper });

    result.current.mutate("listing-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe("fav-1");
    expect(mockPost).toHaveBeenCalledWith(
      "/listings/listing-1/favorite",
      {},
      expect.any(Object),
    );
  });

  it("surfaces API error", async () => {
    mockPost.mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("Not found");
          this.name = "ApiError";
        }
        code = "LISTING_NOT_FOUND";
        status = 404;
      })(),
    );

    const { result } = renderHook(() => useFavoriteListing(), { wrapper });

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
