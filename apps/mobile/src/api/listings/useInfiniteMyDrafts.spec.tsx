// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useInfiniteMyDrafts } from "./useInfiniteMyDrafts";

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

function makeDraft(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    userId: "user-1",
    payload: {
      currentStep: 3,
      brandId: "brand-1",
      modelId: "model-1",
      year: 2020,
      photos: [],
    },
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("useInfiniteMyDrafts", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("fetches first page and parses response", async () => {
    mockGet.mockResolvedValue({
      items: [makeDraft("d1"), makeDraft("d2")],
      nextCursor: null,
    });

    const { result } = renderHook(() => useInfiniteMyDrafts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]?.items).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledWith(
      "/me/drafts?limit=20",
      expect.any(Object),
    );
  });

  it("fetches next page using cursor", async () => {
    mockGet.mockResolvedValueOnce({
      items: [makeDraft("d1")],
      nextCursor: "cursor-1",
    });
    mockGet.mockResolvedValueOnce({
      items: [makeDraft("d2")],
      nextCursor: null,
    });

    const { result } = renderHook(() => useInfiniteMyDrafts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toHaveLength(1);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mockGet).toHaveBeenLastCalledWith(
      "/me/drafts?limit=20&cursor=cursor-1",
      expect.any(Object),
    );
  });

  it("handles empty result", async () => {
    mockGet.mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    const { result } = renderHook(() => useInfiniteMyDrafts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.items).toHaveLength(0);
    expect(result.current.hasNextPage).toBe(false);
  });
});
