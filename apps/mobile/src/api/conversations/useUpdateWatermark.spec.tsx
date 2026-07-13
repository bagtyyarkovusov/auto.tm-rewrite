// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { queryKeys } from "../queryKeys";

import { useUpdateWatermark } from "./useUpdateWatermark";

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

describe("useUpdateWatermark", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("posts lastReadAt and parses the response", async () => {
    mockPost.mockResolvedValue({
      conversationId: "550e8400-e29b-41d4-a716-446655440001",
      lastReadAt: "2026-06-01T12:00:00.000Z",
    });

    const { result } = renderHook(() => useUpdateWatermark(), { wrapper });

    result.current.mutate({
      conversationId: "550e8400-e29b-41d4-a716-446655440001",
      lastReadAt: "2026-06-01T12:00:00.000Z",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalledWith(
      "/conversations/550e8400-e29b-41d4-a716-446655440001/watermark",
      { lastReadAt: "2026-06-01T12:00:00.000Z" },
      expect.any(Object),
    );
  });

  it("posts lastDeliveredAt", async () => {
    mockPost.mockResolvedValue({
      conversationId: "550e8400-e29b-41d4-a716-446655440001",
      lastDeliveredAt: "2026-06-01T12:00:00.000Z",
    });

    const { result } = renderHook(() => useUpdateWatermark(), { wrapper });

    result.current.mutate({
      conversationId: "550e8400-e29b-41d4-a716-446655440001",
      lastDeliveredAt: "2026-06-01T12:00:00.000Z",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalledWith(
      "/conversations/550e8400-e29b-41d4-a716-446655440001/watermark",
      { lastDeliveredAt: "2026-06-01T12:00:00.000Z" },
      expect.any(Object),
    );
  });

  it("invalidates conversation list and detail on success", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const invalidateQueriesSpy = vi.spyOn(client, "invalidateQueries");

    mockPost.mockResolvedValue({
      conversationId: "550e8400-e29b-41d4-a716-446655440001",
      lastReadAt: "2026-06-01T12:00:00.000Z",
    });

    const { result } = renderHook(() => useUpdateWatermark(), {
      wrapper: customWrapper,
    });

    result.current.mutate({
      conversationId: "550e8400-e29b-41d4-a716-446655440001",
      lastReadAt: "2026-06-01T12:00:00.000Z",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.conversations.list(),
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.conversations.detail(
        "550e8400-e29b-41d4-a716-446655440001",
      ),
    });
  });
});
