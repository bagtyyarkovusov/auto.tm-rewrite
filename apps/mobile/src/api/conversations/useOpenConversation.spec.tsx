// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { resolve } from "path";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useOpenConversation } from "./useOpenConversation";

const source = readFileSync(resolve(__dirname, "./useOpenConversation.ts"), "utf-8");

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

function makeOpenConversationResponse(id: string, overrides?: Record<string, unknown>) {
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
    updatedAt: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("useOpenConversation", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("posts listingId and returns parsed conversation", async () => {
    mockPost.mockResolvedValue(makeOpenConversationResponse("c1"));

    const { result } = renderHook(() => useOpenConversation(), { wrapper });

    result.current.mutate({ listingId: "listing-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe("c1");
    expect(mockPost).toHaveBeenCalledWith(
      "/conversations",
      { listingId: "listing-1" },
      expect.any(Object),
    );
  });

  it("surfaces validation error from API", async () => {
    mockPost.mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("Validation failed");
          this.name = "ApiError";
        }
        code = "VALIDATION_FAILED";
        status = 400;
      })(),
    );

    const { result } = renderHook(() => useOpenConversation(), { wrapper });

    result.current.mutate({ listingId: "listing-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "VALIDATION_FAILED",
    );
  });

  it("surfaces contract violation on bad response", async () => {
    mockPost.mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("Response did not match expected schema");
          this.name = "ApiError";
        }
        code = "CONTRACT_VIOLATION";
        status = 502;
      })(),
    );

    const { result } = renderHook(() => useOpenConversation(), { wrapper });

    result.current.mutate({ listingId: "listing-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "CONTRACT_VIOLATION",
    );
  });

  it("invalidates conversation list on success", () => {
    expect(source).toContain("queryKeys.conversations.list()");
  });

  it("invalidates conversation detail on success", () => {
    expect(source).toContain("queryKeys.conversations.detail(data.id)");
  });
});
