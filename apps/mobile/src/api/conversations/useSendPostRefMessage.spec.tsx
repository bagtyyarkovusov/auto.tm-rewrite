// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { resolve } from "path";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useSendPostRefMessage } from "./useSendPostRefMessage";

const source = readFileSync(resolve(__dirname, "./useSendPostRefMessage.ts"), "utf-8");

const mockPost = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: (...args: unknown[]) => mockPost(...args),
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

function makeMessageResponse(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    conversationId: "conv-1",
    senderId: "user-1",
    kind: "post_ref",
    text: null,
    metadata: {
      listingId: "listing-1",
      brandId: "brand-1",
      modelId: "model-1",
      displayPriceTmt: 50000,
      priceCurrency: "TMT",
      status: "active",
      available: true,
    },
    createdAt: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("useSendPostRefMessage", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("posts post-ref message and returns parsed message", async () => {
    mockPost.mockResolvedValue(makeMessageResponse("m1"));

    const { result } = renderHook(() => useSendPostRefMessage(), { wrapper });

    result.current.mutate({ conversationId: "conv-1", listingId: "listing-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe("m1");
    expect(mockPost).toHaveBeenCalledWith(
      "/conversations/conv-1/messages/post-ref",
      {
        metadata: { listingId: "listing-1" },
      },
      expect.any(Object),
    );
  });

  it("passes clientMessageId when provided", async () => {
    mockPost.mockResolvedValue(makeMessageResponse("m2"));

    const { result } = renderHook(() => useSendPostRefMessage(), { wrapper });

    result.current.mutate({
      conversationId: "conv-1",
      listingId: "listing-1",
      clientMessageId: "client-1",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalledWith(
      "/conversations/conv-1/messages/post-ref",
      {
        metadata: { listingId: "listing-1" },
        clientMessageId: "client-1",
      },
      expect.any(Object),
    );
  });

  it("surfaces API errors", async () => {
    mockPost.mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("Forbidden");
          this.name = "ApiError";
        }
        code = "FORBIDDEN";
        status = 403;
      })(),
    );

    const { result } = renderHook(() => useSendPostRefMessage(), { wrapper });

    result.current.mutate({ conversationId: "conv-1", listingId: "listing-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "FORBIDDEN",
    );
  });

  it("invalidates messages query on success", () => {
    expect(source).toContain("queryKeys.conversations.messages(variables.conversationId)");
  });

  it("invalidates conversation list on success", () => {
    expect(source).toContain("queryKeys.conversations.list()");
  });

  it("invalidates conversation detail on success", () => {
    expect(source).toContain("queryKeys.conversations.detail(variables.conversationId)");
  });
});
