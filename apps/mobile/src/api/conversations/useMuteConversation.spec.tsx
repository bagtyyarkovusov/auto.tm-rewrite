// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { queryKeys } from "../queryKeys";

import { useMuteConversation } from "./useMuteConversation";

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

const CONVERSATION_ID = "550e8400-e29b-41d4-a716-446655440001";

function makeConversation(overrides?: Record<string, unknown>) {
  return {
    id: CONVERSATION_ID,
    listing: null,
    buyerId: "550e8400-e29b-41d4-a716-4466554400b1",
    sellerId: "550e8400-e29b-41d4-a716-4466554400b2",
    myRole: "buyer",
    updatedAt: "2026-07-01T10:00:00.000Z",
    unreadCount: 0,
    mutedAt: null,
    ...overrides,
  };
}

function seedListCache(client: QueryClient, items: unknown[] = [makeConversation()]) {
  client.setQueryData(queryKeys.conversations.list(), {
    pages: [{ items, nextCursor: null }],
    pageParams: [null],
  });
}

function readListItems(client: QueryClient) {
  const data = client.getQueryData<{
    pages: Array<{ items: Array<{ id: string; mutedAt?: string | null }> }>;
  }>(queryKeys.conversations.list());
  return data?.pages.flatMap((page) => page.items) ?? [];
}

function makeWrapper(client: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("useMuteConversation", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("posts the mute flag and parses the response", async () => {
    mockPost.mockResolvedValue({
      conversationId: CONVERSATION_ID,
      mutedAt: "2026-07-16T08:00:00.000Z",
    });

    const client = makeClient();
    const { result } = renderHook(() => useMuteConversation(), {
      wrapper: makeWrapper(client),
    });

    result.current.mutate({ conversationId: CONVERSATION_ID, muted: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.mutedAt).toBe("2026-07-16T08:00:00.000Z");
    expect(mockPost).toHaveBeenCalledWith(
      `/conversations/${CONVERSATION_ID}/mute`,
      { muted: true },
      expect.any(Object),
    );
  });

  it("optimistically patches the conversation list cache and keeps the patch on success", async () => {
    mockPost.mockResolvedValue({
      conversationId: CONVERSATION_ID,
      mutedAt: "2026-07-16T08:00:00.000Z",
    });

    const client = makeClient();
    seedListCache(client);

    const { result } = renderHook(() => useMuteConversation(), {
      wrapper: makeWrapper(client),
    });

    result.current.mutate({ conversationId: CONVERSATION_ID, muted: true });

    await waitFor(() => {
      const items = readListItems(client);
      expect(items[0]?.mutedAt).not.toBeNull();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(readListItems(client)[0]?.mutedAt).not.toBeNull();
  });

  it("optimistically clears mutedAt when unmuting", async () => {
    mockPost.mockResolvedValue({
      conversationId: CONVERSATION_ID,
      mutedAt: null,
    });

    const client = makeClient();
    seedListCache(client, [
      makeConversation({ mutedAt: "2026-07-10T08:00:00.000Z" }),
    ]);

    const { result } = renderHook(() => useMuteConversation(), {
      wrapper: makeWrapper(client),
    });

    result.current.mutate({ conversationId: CONVERSATION_ID, muted: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(readListItems(client)[0]?.mutedAt).toBeNull();
  });

  it("rolls the list cache back when the mutation fails", async () => {
    mockPost.mockRejectedValue(new Error("NETWORK_ERROR"));

    const client = makeClient();
    seedListCache(client);

    const { result } = renderHook(() => useMuteConversation(), {
      wrapper: makeWrapper(client),
    });

    result.current.mutate({ conversationId: CONVERSATION_ID, muted: true });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(readListItems(client)[0]?.mutedAt).toBeNull();
  });

  it("invalidates the conversation list and detail on settle", async () => {
    mockPost.mockResolvedValue({
      conversationId: CONVERSATION_ID,
      mutedAt: "2026-07-16T08:00:00.000Z",
    });

    const client = makeClient();
    seedListCache(client);
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useMuteConversation(), {
      wrapper: makeWrapper(client),
    });

    result.current.mutate({ conversationId: CONVERSATION_ID, muted: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.conversations.list(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.conversations.detail(CONVERSATION_ID),
    });
  });

  it("does not touch unrelated conversations in the list cache", async () => {
    mockPost.mockResolvedValue({
      conversationId: CONVERSATION_ID,
      mutedAt: "2026-07-16T08:00:00.000Z",
    });

    const otherId = "550e8400-e29b-41d4-a716-446655440099";
    const client = makeClient();
    seedListCache(client, [
      makeConversation(),
      makeConversation({ id: otherId, mutedAt: null }),
    ]);

    const { result } = renderHook(() => useMuteConversation(), {
      wrapper: makeWrapper(client),
    });

    result.current.mutate({ conversationId: CONVERSATION_ID, muted: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const items = readListItems(client);
    expect(items.find((item) => item.id === otherId)?.mutedAt).toBeNull();
    expect(
      items.find((item) => item.id === CONVERSATION_ID)?.mutedAt,
    ).not.toBeNull();
  });
});
