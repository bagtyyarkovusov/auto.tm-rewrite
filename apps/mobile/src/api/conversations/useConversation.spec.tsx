// @vitest-environment happy-dom

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { queryKeys } from "../queryKeys";

import { seedConversationDetail, useConversation } from "./useConversation";

const mockGet = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const CONVERSATION_ID = "550e8400-e29b-41d4-a716-446655440001";

function summary(overrides?: Record<string, unknown>) {
  return {
    id: CONVERSATION_ID,
    listing: null,
    buyerId: "550e8400-e29b-41d4-a716-4466554400b1",
    sellerId: "550e8400-e29b-41d4-a716-4466554400b2",
    myRole: "buyer" as const,
    peer: {
      id: "550e8400-e29b-41d4-a716-4466554400b2",
      displayName: "Merdan",
      nameNumber: 2057,
      avatarIndex: 7,
      avatarKey: null,
      deleted: false,
    },
    blockedByMe: false,
    updatedAt: "2026-07-01T10:00:00.000Z",
    unreadCount: 0,
    mutedAt: null,
    ...overrides,
  };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("useConversation", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("reads GET /conversations/:id under the detail key", async () => {
    mockGet.mockResolvedValue({ ...summary(), sendRestriction: "chat_disabled" });
    const { client, wrapper } = setup();

    const { result } = renderHook(() => useConversation(CONVERSATION_ID), { wrapper });

    await waitFor(() => expect(result.current.data?.sendRestriction).toBe("chat_disabled"));
    expect(mockGet).toHaveBeenCalledWith(`/conversations/${CONVERSATION_ID}`, expect.any(Object));
    expect(client.getQueryData(queryKeys.conversations.detail(CONVERSATION_ID))).toBe(result.current.data);
  });

  it("starts from the list cache and still refreshes from the API", async () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { client, wrapper } = setup();
    client.setQueryData(queryKeys.conversations.list(), {
      pages: [{ items: [summary({ peer: { id: "p", displayName: "From list", nameNumber: 2057, avatarIndex: 7, avatarKey: null, deleted: false } })], nextCursor: null }],
      pageParams: [null],
    });

    const { result } = renderHook(() => useConversation(CONVERSATION_ID), { wrapper });

    expect(result.current.data?.peer.displayName).toBe("From list");
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
  });

  it("does not request anything without an ID", () => {
    const { wrapper } = setup();
    renderHook(() => useConversation(""), { wrapper });
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("seedConversationDetail", () => {
  it("stores the summary as stale so the screen refreshes it", () => {
    const { client } = setup();
    seedConversationDetail(client, summary());

    const state = client.getQueryState(queryKeys.conversations.detail(CONVERSATION_ID));
    expect(state?.data).toEqual(summary());
    expect(state?.dataUpdatedAt).toBe(0);
  });

  it("keeps a send restriction already read for the Conversation", () => {
    const { client } = setup();
    client.setQueryData(queryKeys.conversations.detail(CONVERSATION_ID), {
      ...summary(),
      sendRestriction: "blocked_by_me",
    });

    seedConversationDetail(client, summary({ mutedAt: "2026-07-02T10:00:00.000Z" }));

    expect(client.getQueryData(queryKeys.conversations.detail(CONVERSATION_ID))).toEqual(
      expect.objectContaining({ sendRestriction: "blocked_by_me", mutedAt: "2026-07-02T10:00:00.000Z" }),
    );
  });
});
