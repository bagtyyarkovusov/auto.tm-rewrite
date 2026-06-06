// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";

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
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "CONTRACT_VIOLATION",
    );
  });

  it("surfaces network error", async () => {
    mockGet.mockRejectedValue(new Error("Network request failed"));

    const { result } = renderHook(() => useListings(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("appends only defined filter fields to request params", async () => {
    mockGet.mockResolvedValue({
      items: [makeFeedItem("l1")],
      nextCursor: null,
    });

    const filters: ListingsSchemas.ListingFilter = {
      brandId: "brand-1",
      modelId: "model-1",
      cityId: "city-1",
      priceMin: 50000,
      priceMax: 150000,
      yearMin: 2018,
      yearMax: 2024,
      condition: "used",
    };

    renderHook(() => useListings({ filters }), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    const url = String(mockGet.mock.calls[0]?.[0]);
    expect(url).toContain("limit=20");
    expect(url).toContain("brandId=brand-1");
    expect(url).toContain("modelId=model-1");
    expect(url).toContain("cityId=city-1");
    expect(url).toContain("priceMin=50000");
    expect(url).toContain("priceMax=150000");
    expect(url).toContain("yearMin=2018");
    expect(url).toContain("yearMax=2024");
    expect(url).toContain("condition=used");
  });

  it("omits undefined, null and empty filter values from params", async () => {
    mockGet.mockResolvedValue({
      items: [makeFeedItem("l1")],
      nextCursor: null,
    });

    const filters = {
      brandId: "brand-1",
      modelId: undefined,
      cityId: "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      priceMin: null as any,
    } as ListingsSchemas.ListingFilter;

    renderHook(() => useListings({ filters }), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    const url = String(mockGet.mock.calls[0]?.[0]);
    expect(url).toContain("brandId=brand-1");
    expect(url).not.toContain("modelId=");
    expect(url).not.toContain("cityId=");
    expect(url).not.toContain("priceMin=");
  });

  it("varies query key by filter set", async () => {
    mockGet.mockResolvedValue({
      items: [makeFeedItem("l1")],
      nextCursor: null,
    });

    const { result, rerender } = renderHook(
      ({ filters }) => useListings({ filters }),
      {
        wrapper,
        initialProps: { filters: { brandId: "brand-a" } as ListingsSchemas.ListingFilter },
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledTimes(1);

    rerender({ filters: { brandId: "brand-b" } as ListingsSchemas.ListingFilter });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

    const firstUrl = String(mockGet.mock.calls[0]?.[0]);
    const secondUrl = String(mockGet.mock.calls[1]?.[0]);
    expect(firstUrl).toContain("brandId=brand-a");
    expect(secondUrl).toContain("brandId=brand-b");
  });
});
