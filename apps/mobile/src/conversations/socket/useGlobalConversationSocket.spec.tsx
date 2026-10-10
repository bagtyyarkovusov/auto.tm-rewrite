// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { queryKeys } from "../../api/queryKeys";

const CONV_ID = "550e8400-e29b-41d4-a716-446655440001";
const MSG_ID = "550e8400-e29b-41d4-a716-446655440002";
const USER_ID = "550e8400-e29b-41d4-a716-446655440003";

const mockSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  joinConversation: vi.fn(),
  leaveConversation: vi.fn(),
  sendTextMessage: vi.fn(),
  sendImageMessage: vi.fn(),
  sendTypingStart: vi.fn(),
  sendTypingStop: vi.fn(),
  markDelivered: vi.fn(),
  markRead: vi.fn(),
  markConversationRead: vi.fn(),
  deleteMessage: vi.fn(),
  subscribeStatus: vi.fn().mockReturnValue(() => {}),
  subscribeMessage: vi.fn().mockReturnValue(() => {}),
  subscribeWatermark: vi.fn().mockReturnValue(() => {}),
  subscribeDeletedMessage: vi.fn().mockReturnValue(() => {}),
  subscribeTyping: vi.fn().mockReturnValue(() => {}),
  subscribePresence: vi.fn().mockReturnValue(() => {}),
  getStatus: vi.fn().mockReturnValue("idle"),
  isConnected: vi.fn().mockReturnValue(false),
};

vi.mock("./ConversationSocket", () => ({
  ConversationSocket: vi.fn().mockImplementation(() => mockSocket),
  getSharedConversationSocket: () => mockSocket,
}));

import { useGlobalConversationSocket } from "./useGlobalConversationSocket";

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useGlobalConversationSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.getStatus.mockReturnValue("idle");
    mockSocket.connect.mockResolvedValue(undefined);
    mockSocket.subscribeStatus.mockReturnValue(() => {});
    mockSocket.subscribeMessage.mockReturnValue(() => {});
  });

  it("connects the shared socket on mount and disconnects on unmount", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const hook = renderHook(() => useGlobalConversationSocket(), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(mockSocket.connect).toHaveBeenCalledTimes(1));

    hook.unmount();
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("invalidates the list, unread counts and detail on message:new without creating a messages cache", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueriesSpy = vi.spyOn(client, "invalidateQueries");

    let messageHandler: (event: unknown) => void = () => {};
    mockSocket.subscribeMessage.mockImplementation((handler) => {
      messageHandler = handler;
      return () => {};
    });

    renderHook(() => useGlobalConversationSocket(), {
      wrapper: wrapperFor(client),
    });

    act(() => {
      messageHandler({
        message: {
          id: MSG_ID,
          conversationId: CONV_ID,
          senderId: USER_ID,
          kind: "text",
          text: "Hi while you were away",
          createdAt: "2026-06-01T12:00:00.000Z",
        },
      });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.conversations.list(),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.conversations.unreadCounts(),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.conversations.detail(CONV_ID),
      });
    });

    // The Conversation screen owns the messages cache; the global listener
    // must not create one for a Conversation that is not open.
    expect(
      client.getQueryData(queryKeys.conversations.messages(CONV_ID)),
    ).toBeUndefined();
  });

  it("invalidates the list and unread counts on reconnect, but not on the first connect", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueriesSpy = vi.spyOn(client, "invalidateQueries");

    let statusHandler: (status: string) => void = () => {};
    mockSocket.subscribeStatus.mockImplementation((handler) => {
      statusHandler = handler as (status: string) => void;
      return () => {};
    });
    mockSocket.getStatus.mockReturnValue("idle");

    renderHook(() => useGlobalConversationSocket(), {
      wrapper: wrapperFor(client),
    });

    act(() => {
      statusHandler("connected");
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();

    act(() => {
      statusHandler("disconnected");
      statusHandler("connected");
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.conversations.list(),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.conversations.unreadCounts(),
      });
    });
  });

  it("reconciles when recovery passes through an error status", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateQueriesSpy = vi.spyOn(client, "invalidateQueries");

    let statusHandler: (status: string) => void = () => {};
    mockSocket.subscribeStatus.mockImplementation((handler) => {
      statusHandler = handler as (status: string) => void;
      return () => {};
    });
    mockSocket.getStatus.mockReturnValue("connected");

    renderHook(() => useGlobalConversationSocket(), {
      wrapper: wrapperFor(client),
    });

    // A failed reconnection attempt reports "error" (connect_error); the
    // successful retry after it is still a recovery and must reconcile.
    act(() => {
      statusHandler("disconnected");
      statusHandler("error");
      statusHandler("connected");
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.conversations.list(),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.conversations.unreadCounts(),
      });
    });
  });
});
