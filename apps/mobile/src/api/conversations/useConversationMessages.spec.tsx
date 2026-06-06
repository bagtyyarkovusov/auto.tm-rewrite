// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useConversationMessages } from "./useConversationMessages";

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

function makeMessage(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    conversationId: "conv-1",
    senderId: "user-1",
    text: "Hello",
    createdAt: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("useConversationMessages", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("fetches first page and parses messages", async () => {
    mockGet.mockResolvedValue({
      items: [makeMessage("m1"), makeMessage("m2")],
      nextCursor: null,
    });

    const { result } = renderHook(
      () => useConversationMessages({ conversationId: "conv-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]?.items).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledWith(
      "/conversations/conv-1/messages?limit=20",
      expect.any(Object),
    );
  });

  it("fetches next page using cursor", async () => {
    mockGet.mockResolvedValueOnce({
      items: [makeMessage("m1")],
      nextCursor: "cursor-1",
    });
    mockGet.mockResolvedValueOnce({
      items: [makeMessage("m2")],
      nextCursor: null,
    });

    const { result } = renderHook(
      () => useConversationMessages({ conversationId: "conv-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toHaveLength(1);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mockGet).toHaveBeenLastCalledWith(
      "/conversations/conv-1/messages?limit=20&cursor=cursor-1",
      expect.any(Object),
    );
  });

  it("handles empty message list", async () => {
    mockGet.mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    const { result } = renderHook(
      () => useConversationMessages({ conversationId: "conv-1" }),
      { wrapper },
    );

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

    const { result } = renderHook(
      () => useConversationMessages({ conversationId: "conv-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "CONTRACT_VIOLATION",
    );
  });

  it("surfaces network error", async () => {
    mockGet.mockRejectedValue(new Error("Network request failed"));

    const { result } = renderHook(
      () => useConversationMessages({ conversationId: "conv-1" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("respects custom limit", async () => {
    mockGet.mockResolvedValue({
      items: [makeMessage("m1")],
      nextCursor: null,
    });

    renderHook(
      () => useConversationMessages({ conversationId: "conv-1", limit: 10 }),
      { wrapper },
    );

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet).toHaveBeenCalledWith(
      "/conversations/conv-1/messages?limit=10",
      expect.any(Object),
    );
  });

  it("is disabled when conversationId is empty", async () => {
    const { result } = renderHook(
      () => useConversationMessages({ conversationId: "" }),
      { wrapper },
    );

    expect(result.current.isPending).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
