// @vitest-environment happy-dom

import type { ListingsSchemas } from "@auto-tm/contracts";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useListingCount } from "./useListingCount";

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

describe("useListingCount", () => {
  beforeEach(() => {
    mockGet.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("fetches count for empty filters", async () => {
    mockGet.mockResolvedValue({ totalMatching: 100 });

    const { result } = renderHook(() => useListingCount({}), { wrapper });

    vi.advanceTimersByTime(300);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.totalMatching).toBe(100);
    expect(mockGet).toHaveBeenCalledWith(
      "/listings/count?",
      expect.any(Object),
      { auth: false },
    );
  });

  it("appends only defined filter fields", async () => {
    mockGet.mockResolvedValue({ totalMatching: 12 });

    renderHook(
      () =>
        useListingCount({
          filters: {
            brandId: "brand-1",
            modelId: undefined,
            cityId: "",
            priceMin: null,
            condition: "used",
          } as unknown as ListingsSchemas.ListingFilter,
        }),
      { wrapper },
    );

    vi.advanceTimersByTime(300);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    const url = String(mockGet.mock.calls[0]?.[0]);
    expect(url).toContain("brandId=brand-1");
    expect(url).toContain("condition=used");
    expect(url).not.toContain("modelId=");
    expect(url).not.toContain("cityId=");
    expect(url).not.toContain("priceMin=");
  });

  it("debounces filter changes", async () => {
    mockGet.mockResolvedValue({ totalMatching: 0 });

    const { result, rerender } = renderHook(
      ({ filters }) => useListingCount({ filters }),
      {
        wrapper,
        initialProps: {
          filters: {
            brandId: "brand-a",
          } as ListingsSchemas.ListingFilter,
        },
      },
    );

    vi.advanceTimersByTime(300);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledTimes(1);

    rerender({
      filters: {
        brandId: "brand-b",
      } as ListingsSchemas.ListingFilter,
    });
    rerender({
      filters: {
        brandId: "brand-c",
      } as ListingsSchemas.ListingFilter,
    });

    vi.advanceTimersByTime(300);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

    const lastUrl = String(mockGet.mock.calls[mockGet.mock.calls.length - 1]?.[0]);
    expect(lastUrl).toContain("brandId=brand-c");
  });

  it("does not fetch when disabled", async () => {
    mockGet.mockResolvedValue({ totalMatching: 1 });

    const { result } = renderHook(
      () => useListingCount({ filters: { brandId: "brand-1" } as ListingsSchemas.ListingFilter, enabled: false }),
      { wrapper },
    );

    vi.advanceTimersByTime(500);
    expect(result.current.isPending).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
