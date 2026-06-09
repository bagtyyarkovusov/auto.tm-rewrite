// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useBrands } from "./useBrands";

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

describe("useBrands", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("returns the parsed brand list", async () => {
    mockGet.mockResolvedValue({
      items: [{ id: "b1", slug: "toyota", name: "Toyota" }],
      nextCursor: null,
      hasMore: false,
    });

    const { result } = renderHook(() => useBrands("en"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0]?.name).toBe("Toyota");
    expect(mockGet).toHaveBeenCalledWith(
      "/catalog/brands?limit=300",
      expect.any(Object),
      { auth: false },
    );
  });

  it("calls the correct endpoint with locale", async () => {
    mockGet.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    });

    renderHook(() => useBrands("ru"), { wrapper });
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet).toHaveBeenCalledWith(
      "/catalog/brands?limit=300",
      expect.any(Object),
      { auth: false },
    );
  });

  it("surfaces a contract violation when the API returns garbage", async () => {
    mockGet.mockRejectedValue(
      new (class extends Error {
        constructor(
          public code: string,
          public status: number,
          message?: string,
        ) {
          super(message ?? code);
          this.name = "ApiError";
        }
      })("CONTRACT_VIOLATION", 502, "Bad response"),
    );

    const { result } = renderHook(() => useBrands("en"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(
      (result.current.error as unknown as { code: string }).code,
    ).toBe("CONTRACT_VIOLATION");
  });

  it("includes locale in the query key", async () => {
    mockGet.mockResolvedValue({
      items: [{ id: "b1", slug: "toyota", name: "Toyota" }],
      nextCursor: null,
      hasMore: false,
    });

    const { result, rerender } = renderHook(
      ({ locale }: { locale: "en" | "ru" }) => useBrands(locale),
      {
        wrapper,
        initialProps: { locale: "en" },
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    mockGet.mockReset();
    mockGet.mockResolvedValue({
      items: [{ id: "b2", slug: "lada", name: "Lada" }],
      nextCursor: null,
      hasMore: false,
    });

    rerender({ locale: "ru" });
    await waitFor(() =>
      expect(result.current.data?.items[0]?.name).toBe("Lada"),
    );
    expect(mockGet).toHaveBeenCalledWith(
      "/catalog/brands?limit=300",
      expect.any(Object),
      { auth: false },
    );
  });
});
