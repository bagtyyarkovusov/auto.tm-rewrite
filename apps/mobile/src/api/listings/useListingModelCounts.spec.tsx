// @vitest-environment happy-dom

import type { ListingsSchemas } from "@auto-tm/contracts";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useListingModelCounts } from "./useListingModelCounts";

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

describe("useListingModelCounts", () => {
  beforeEach(() => {
    mockGet.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("fetches model counts for a brand", async () => {
    mockGet.mockResolvedValue({
      items: [{ modelId: "model-1", totalMatching: 7 }],
    });

    const { result } = renderHook(
      () =>
        useListingModelCounts({
          filters: { brandId: "brand-1" } as ListingsSchemas.ListingModelCountQuery,
        }),
      { wrapper },
    );

    vi.advanceTimersByTime(300);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0]).toEqual({
      modelId: "model-1",
      totalMatching: 7,
    });
    expect(mockGet).toHaveBeenCalledWith(
      "/listings/filter-options/models?brandId=brand-1",
      expect.any(Object),
      { auth: false },
    );
  });

  it("appends scalar filters and excludes undefined fields", async () => {
    mockGet.mockResolvedValue({ items: [] });

    renderHook(
      () =>
        useListingModelCounts({
          filters: {
            brandId: "brand-1",
            cityId: "city-1",
            priceMin: 10000,
            priceMax: undefined,
            condition: "used",
          } as unknown as ListingsSchemas.ListingModelCountQuery,
        }),
      { wrapper },
    );

    vi.advanceTimersByTime(300);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    const url = String(mockGet.mock.calls[0]?.[0]);
    expect(url).toContain("brandId=brand-1");
    expect(url).toContain("cityId=city-1");
    expect(url).toContain("priceMin=10000");
    expect(url).toContain("condition=used");
    expect(url).not.toContain("priceMax");
  });

  it("debounces filter changes", async () => {
    mockGet.mockResolvedValue({ items: [] });

    const { result, rerender } = renderHook(
      ({ filters }) => useListingModelCounts({ filters }),
      {
        wrapper,
        initialProps: {
          filters: {
            brandId: "brand-a",
          } as ListingsSchemas.ListingModelCountQuery,
        },
      },
    );

    vi.advanceTimersByTime(300);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledTimes(1);

    rerender({
      filters: { brandId: "brand-b" } as ListingsSchemas.ListingModelCountQuery,
    });
    rerender({
      filters: { brandId: "brand-c" } as ListingsSchemas.ListingModelCountQuery,
    });

    vi.advanceTimersByTime(300);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

    const lastUrl = String(mockGet.mock.calls[mockGet.mock.calls.length - 1]?.[0]);
    expect(lastUrl).toContain("brandId=brand-c");
  });

  it("does not fetch when brandId is missing", async () => {
    mockGet.mockResolvedValue({ items: [] });

    const { result } = renderHook(
      () => useListingModelCounts({ filters: undefined }),
      { wrapper },
    );

    vi.advanceTimersByTime(500);
    expect(result.current.isPending).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("does not fetch when disabled", async () => {
    mockGet.mockResolvedValue({ items: [] });

    const { result } = renderHook(
      () =>
        useListingModelCounts({
          filters: { brandId: "brand-1" } as ListingsSchemas.ListingModelCountQuery,
          enabled: false,
        }),
      { wrapper },
    );

    vi.advanceTimersByTime(500);
    expect(result.current.isPending).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
