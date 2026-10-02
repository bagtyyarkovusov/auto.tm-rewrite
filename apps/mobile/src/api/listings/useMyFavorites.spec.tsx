// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useMyFavorites } from "./useMyFavorites";

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

function makeFavoriteItem(id: string, overrides?: Record<string, unknown>) {
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

describe("useMyFavorites", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("fetches first page and parses response", async () => {
    mockGet.mockResolvedValue({
      items: [makeFavoriteItem("l1"), makeFavoriteItem("l2")],
      nextCursor: null,
      counts: { total: 2, inactive: 0 },
    });

    const { result } = renderHook(() => useMyFavorites(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]?.items).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledWith(
      "/favorites?limit=20&activeOnly=false",
      expect.any(Object),
    );
  });

  it("fetches next page using cursor", async () => {
    mockGet.mockResolvedValueOnce({
      items: [makeFavoriteItem("l1")],
      nextCursor: "cursor-1",
      counts: { total: 2, inactive: 0 },
    });
    mockGet.mockResolvedValueOnce({
      items: [makeFavoriteItem("l2")],
      nextCursor: null,
      counts: { total: 2, inactive: 0 },
    });

    const { result } = renderHook(() => useMyFavorites(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toHaveLength(1);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mockGet).toHaveBeenLastCalledWith(
      "/favorites?limit=20&activeOnly=false&cursor=cursor-1",
      expect.any(Object),
    );
  });

  it("asks for active Listings only when activeOnly is set, keeping each position in its own cache", async () => {
    mockGet.mockImplementation(async (url: string) => ({
      items: [makeFavoriteItem(url.includes("activeOnly=true") ? "active" : "any")],
      nextCursor: url.includes("activeOnly=true") ? "next-active" : null,
      counts: { total: 3, inactive: 2 },
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const shared = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const active = renderHook(() => useMyFavorites({ activeOnly: true }), { wrapper: shared });
    await waitFor(() => expect(active.result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenLastCalledWith("/favorites?limit=20&activeOnly=true", expect.any(Object));
    expect(active.result.current.data?.pages[0]?.counts).toEqual({ total: 3, inactive: 2 });

    active.result.current.fetchNextPage();
    await waitFor(() => expect(active.result.current.data?.pages).toHaveLength(2));
    expect(mockGet).toHaveBeenLastCalledWith("/favorites?limit=20&activeOnly=true&cursor=next-active", expect.any(Object));

    const all = renderHook(() => useMyFavorites({ activeOnly: false }), { wrapper: shared });
    await waitFor(() => expect(all.result.current.isSuccess).toBe(true));
    expect(all.result.current.data?.pages[0]?.items[0]?.id).toBe("any");
    expect(active.result.current.data?.pages[0]?.items[0]?.id).toBe("active");
  });

  it("handles empty favorites", async () => {
    mockGet.mockResolvedValue({
      items: [],
      nextCursor: null,
      counts: { total: 0, inactive: 0 },
    });

    const { result } = renderHook(() => useMyFavorites(), { wrapper });

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

    const { result } = renderHook(() => useMyFavorites(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "CONTRACT_VIOLATION",
    );
  });

  it("surfaces network error", async () => {
    mockGet.mockRejectedValue(new Error("Network request failed"));

    const { result } = renderHook(() => useMyFavorites(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
