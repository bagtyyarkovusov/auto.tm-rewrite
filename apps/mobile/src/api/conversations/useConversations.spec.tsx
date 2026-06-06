// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useConversations } from "./useConversations";

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

function makeConversationSummary(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    listing: {
      id: "listing-1",
      brandId: "brand-1",
      modelId: "model-1",
      year: 2020,
      displayPriceTmt: 100000,
      priceCurrency: "TMT" as const,
      coverMediaKey: "cover-1",
      status: "active",
    },
    buyerId: "buyer-1",
    sellerId: "seller-1",
    myRole: "buyer" as const,
    lastMessage: {
      id: "msg-1",
      conversationId: id,
      senderId: "seller-1",
      text: "Hello",
      createdAt: "2026-06-01T12:00:00.000Z",
    },
    updatedAt: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("useConversations", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("fetches first page and parses conversation list", async () => {
    mockGet.mockResolvedValue({
      items: [makeConversationSummary("c1"), makeConversationSummary("c2")],
      nextCursor: null,
    });

    const { result } = renderHook(() => useConversations(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]?.items).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledWith(
      "/conversations?limit=20",
      expect.any(Object),
    );
  });

  it("fetches next page using cursor", async () => {
    mockGet.mockResolvedValueOnce({
      items: [makeConversationSummary("c1")],
      nextCursor: "cursor-1",
    });
    mockGet.mockResolvedValueOnce({
      items: [makeConversationSummary("c2")],
      nextCursor: null,
    });

    const { result } = renderHook(() => useConversations(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toHaveLength(1);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mockGet).toHaveBeenLastCalledWith(
      "/conversations?limit=20&cursor=cursor-1",
      expect.any(Object),
    );
  });

  it("handles empty conversation list", async () => {
    mockGet.mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    const { result } = renderHook(() => useConversations(), { wrapper });

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

    const { result } = renderHook(() => useConversations(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "CONTRACT_VIOLATION",
    );
  });

  it("surfaces network error", async () => {
    mockGet.mockRejectedValue(new Error("Network request failed"));

    const { result } = renderHook(() => useConversations(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("respects custom limit", async () => {
    mockGet.mockResolvedValue({
      items: [makeConversationSummary("c1")],
      nextCursor: null,
    });

    renderHook(() => useConversations({ limit: 10 }), { wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet).toHaveBeenCalledWith(
      "/conversations?limit=10",
      expect.any(Object),
    );
  });
});
