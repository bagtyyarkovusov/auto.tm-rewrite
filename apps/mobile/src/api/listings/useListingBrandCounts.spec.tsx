// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useListingBrandCounts } from "./useListingBrandCounts";

const mockGet = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useListingBrandCounts", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ items: [{ brandId: "toyota", totalMatching: 4 }] });
  });

  it("loads brand counts for the current filters", async () => {
    const { result } = renderHook(
      () => useListingBrandCounts({ filters: { cityId: "c1", yearMin: 2015 } }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0]).toEqual({ brandId: "toyota", totalMatching: 4 });
    expect(mockGet).toHaveBeenCalledWith(
      "/listings/filter-options/brands?cityId=c1&yearMin=2015",
      expect.any(Object),
      { auth: false },
    );
  });

  it("loads all brand counts with no filters", async () => {
    renderHook(() => useListingBrandCounts({}), { wrapper });
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0]?.[0]).toBe("/listings/filter-options/brands?");
  });
});
