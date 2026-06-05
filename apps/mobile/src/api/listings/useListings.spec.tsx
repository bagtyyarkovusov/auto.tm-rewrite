// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useListings } from "./useListings";

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

function makeFeedItem(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    sellerId: "user-1",
    status: "active",
    brandId: "brand-1",
    modelId: "model-1",
    year: 2020,
    priceAmount: 100000,
    priceCurrency: "TMT",
    displayPriceTmt: 100000,
    cityId: "city-1",
    publishedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("useListings", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("fetches first page and parses feed response", async () => {
    mockGet.mockResolvedValue({
      items: [makeFeedItem("l1"), makeFeedItem("l2")],
      nextCursor: null,
    });

    const { result } = renderHook(() => useListings(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]?.items).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledWith(
      "/listings?limit=20",
      expect.any(Object),
      { auth: false },
    );
  });

  it("fetches next page using cursor", async () => {
    mockGet.mockResolvedValueOnce({
      items: [makeFeedItem("l1")],
      nextCursor: "cursor-1",
    });
    mockGet.mockResolvedValueOnce({
      items: [makeFeedItem("l2")],
      nextCursor: null,
    });

    const { result } = renderHook(() => useListings(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toHaveLength(1);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mockGet).toHaveBeenLastCalledWith(
      "/listings?limit=20&cursor=cursor-1",
      expect.any(Object),
      { auth: false },
    );
  });

  it("handles empty feed", async () => {
    mockGet.mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    const { result } = renderHook(() => useListings(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.items).toHaveLength(0);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("surfaces contract violation on bad response", async () => {
    mockGet.mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("Response did not match expected schema");
          this.name = "ApiError";
        }
        code = "CONTRACT_VIOLATION";
        status = 502;
      })(),
    );

    const { result } = renderHook(() => useListings(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe("CONTRACT_VIOLATION");
  });

  it("surfaces network error", async () => {
    mockGet.mockRejectedValue(new Error("Network request failed"));

    const { result } = renderHook(() => useListings(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
