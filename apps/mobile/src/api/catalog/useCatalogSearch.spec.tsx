// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useCatalogSearch } from "./useCatalogSearch";

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

describe("useCatalogSearch", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({
      results: [{ kind: "brand", brandId: "toyota", label: "Toyota" }],
    });
  });

  it("searches the catalog in any spelling, as typed", async () => {
    const { result } = renderHook(() => useCatalogSearch("тойота", "ru"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.results[0]?.brandId).toBe("toyota");
    expect(mockGet).toHaveBeenCalledWith(
      `/catalog/search?q=${encodeURIComponent("тойота")}&locale=ru`,
      expect.any(Object),
      { auth: false },
    );
  });

  it("trims the query", async () => {
    renderHook(() => useCatalogSearch("  toyta ", "en"), { wrapper });
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0]?.[0]).toBe("/catalog/search?q=toyta&locale=en");
  });

  it("does not call the API for an empty or one-letter query", async () => {
    renderHook(() => useCatalogSearch("t", "en"), { wrapper });
    renderHook(() => useCatalogSearch("", "en"), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(mockGet).not.toHaveBeenCalled();
  });
});
