// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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
  markDelivered: vi.fn(),
  markRead: vi.fn(),
  markConversationRead: vi.fn(),
  deleteMessage: vi.fn(),
  subscribeStatus: vi.fn().mockReturnValue(() => {}),
  subscribeMessage: vi.fn().mockReturnValue(() => {}),
  subscribeWatermark: vi.fn().mockReturnValue(() => {}),
  subscribeDeletedMessage: vi.fn().mockReturnValue(() => {}),
  getStatus: vi.fn().mockReturnValue("idle"),
  isConnected: vi.fn().mockReturnValue(false),
};

vi.mock("./ConversationSocket", () => ({
  ConversationSocket: vi.fn().mockImplementation(() => mockSocket),
}));

import { useConversationSocket } from "./useConversationSocket";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useConversationSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.getStatus.mockReturnValue("idle");
  });

  it("connects and joins the conversation room", async () => {
    mockSocket.joinConversation.mockResolvedValue({
      ok: true,
      room: "conversation:conv-1",
    });

    renderHook(() => useConversationSocket(CONV_ID), { wrapper });

    await waitFor(() => expect(mockSocket.connect).toHaveBeenCalled());
  });

  it("provides a sendTextMessage function that delegates to the socket", async () => {
    mockSocket.sendTextMessage.mockResolvedValue({
      ok: true,
      message: {
        id: MSG_ID,
        conversationId: CONV_ID,
        senderId: USER_ID,
        kind: "text",
        text: "Hello",
        createdAt: "2026-06-01T12:00:00.000Z",
        clientMessageId: "client-1",
      },
    });

    const { result } = renderHook(
      () => useConversationSocket(CONV_ID),
      { wrapper },
    );

    const response = await result.current.sendTextMessage({
      conversationId: CONV_ID,
      text: "Hello",
      clientMessageId: "client-1",
    });

    expect(mockSocket.sendTextMessage).toHaveBeenCalledWith({
      conversationId: CONV_ID,
      text: "Hello",
      clientMessageId: "client-1",
    });
    expect(response.ok).toBe(true);
  });

  it("patches the messages query cache on message:new without duplicates", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    client.setQueryData(queryKeys.conversations.messages(CONV_ID), {
      pages: [
        {
          items: [
            {
              id: MSG_ID,
              conversationId: CONV_ID,
              senderId: USER_ID,
              kind: "text",
              text: "Existing",
              createdAt: "2026-06-01T11:00:00.000Z",
            },
          ],
          nextCursor: null,
        },
      ],
      pageParams: [null],
    });

    let messageHandler: (event: unknown) => void = () => {};
    mockSocket.subscribeMessage.mockImplementation((handler) => {
      messageHandler = handler;
      return () => {};
    });

    renderHook(() => useConversationSocket(CONV_ID), {
      wrapper: customWrapper,
    });

    const newMessage = {
      id: "550e8400-e29b-41d4-a716-446655440004",
      conversationId: CONV_ID,
      senderId: USER_ID,
      kind: "text",
      text: "New message",
      createdAt: "2026-06-01T12:00:00.000Z",
    };

    messageHandler({ message: newMessage });

    await waitFor(() => {
      const data = client.getQueryData<{
        pages: Array<{ items: unknown[]; nextCursor: string | null }>;
      }>(queryKeys.conversations.messages(CONV_ID));
      expect(data?.pages[0]?.items).toHaveLength(2);
      expect(data?.pages[0]?.items[0]).toMatchObject(newMessage);
    });

    // Duplicate event should not add another row.
    messageHandler({ message: newMessage });

    const data = client.getQueryData<{
      pages: Array<{ items: unknown[]; nextCursor: string | null }>;
    }>(queryKeys.conversations.messages(CONV_ID));
    expect(data?.pages[0]?.items).toHaveLength(2);
  });

  it("invalidates messages query on reconnect", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const invalidateQueriesSpy = vi.spyOn(client, "invalidateQueries");

    let statusHandler: (status: string) => void = () => {};
    mockSocket.subscribeStatus.mockImplementation((handler) => {
      statusHandler = handler as (status: string) => void;
      return () => {};
    });
    mockSocket.getStatus.mockReturnValue("disconnected");

    renderHook(() => useConversationSocket(CONV_ID), {
      wrapper: customWrapper,
    });

    statusHandler("disconnected");
    statusHandler("connected");

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.conversations.messages(CONV_ID),
      });
    });
  });

  it("provides markDelivered and markRead functions that delegate to the socket", async () => {
    mockSocket.markDelivered.mockResolvedValue({
      ok: true,
      conversationId: CONV_ID,
    });
    mockSocket.markConversationRead.mockResolvedValue({
      ok: true,
      conversationId: CONV_ID,
    });

    const { result } = renderHook(
      () => useConversationSocket(CONV_ID),
      { wrapper },
    );

    const deliveredResponse = await result.current.markDelivered(CONV_ID);
    expect(mockSocket.markDelivered).toHaveBeenCalledWith(
      CONV_ID,
      expect.any(String),
    );
    expect(deliveredResponse.ok).toBe(true);

    const readResponse = await result.current.markRead(CONV_ID);
    expect(mockSocket.markConversationRead).toHaveBeenCalledWith(
      CONV_ID,
      expect.any(String),
    );
    expect(readResponse.ok).toBe(true);
  });

  it("marks peer messages delivered automatically when currentUserId is provided", async () => {
    let messageHandler: (event: unknown) => void = () => {};
    mockSocket.subscribeMessage.mockImplementation((handler) => {
      messageHandler = handler;
      return () => {};
    });

    renderHook(() => useConversationSocket(CONV_ID, USER_ID), {
      wrapper,
    });

    messageHandler({
      message: {
        id: MSG_ID,
        conversationId: CONV_ID,
        senderId: "peer-user",
        kind: "text",
        text: "Hi",
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    });

    await waitFor(() => {
      expect(mockSocket.markDelivered).toHaveBeenCalledWith(
        CONV_ID,
        expect.any(String),
      );
    });
  });

  it("does not auto-mark delivered for own messages", async () => {
    let messageHandler: (event: unknown) => void = () => {};
    mockSocket.subscribeMessage.mockImplementation((handler) => {
      messageHandler = handler;
      return () => {};
    });

    renderHook(() => useConversationSocket(CONV_ID, USER_ID), {
      wrapper,
    });

    messageHandler({
      message: {
        id: MSG_ID,
        conversationId: CONV_ID,
        senderId: USER_ID,
        kind: "text",
        text: "Hi",
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    });

    await waitFor(() => {
      expect(mockSocket.markDelivered).not.toHaveBeenCalled();
    });
  });

  it("invalidates conversation list and detail on watermark events", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const invalidateQueriesSpy = vi.spyOn(client, "invalidateQueries");

    let watermarkHandler: (event: unknown) => void = () => {};
    mockSocket.subscribeWatermark.mockImplementation((handler) => {
      watermarkHandler = handler;
      return () => {};
    });

    renderHook(() => useConversationSocket(CONV_ID), {
      wrapper: customWrapper,
    });

    watermarkHandler({
      conversationId: CONV_ID,
      userId: "peer-user",
      lastReadAt: "2026-06-01T12:00:00.000Z",
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.conversations.list(),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.conversations.detail(CONV_ID),
      });
    });
  });

  it("provides a deleteMessage function that delegates to the socket", async () => {
    mockSocket.deleteMessage.mockResolvedValue({
      ok: true,
      messageId: MSG_ID,
      conversationId: CONV_ID,
      deletedAt: "2026-06-01T12:05:00.000Z",
    });

    const { result } = renderHook(
      () => useConversationSocket(CONV_ID),
      { wrapper },
    );

    const response = await result.current.deleteMessage({
      conversationId: CONV_ID,
      messageId: MSG_ID,
    });

    expect(mockSocket.deleteMessage).toHaveBeenCalledWith({
      conversationId: CONV_ID,
      messageId: MSG_ID,
    });
    expect(response.ok).toBe(true);
  });

  it("patches the messages query cache on message:deleted", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    client.setQueryData(queryKeys.conversations.messages(CONV_ID), {
      pages: [
        {
          items: [
            {
              id: MSG_ID,
              conversationId: CONV_ID,
              senderId: USER_ID,
              kind: "text",
              text: "Existing",
              createdAt: "2026-06-01T11:00:00.000Z",
            },
          ],
          nextCursor: null,
        },
      ],
      pageParams: [null],
    });

    let deletedHandler: (event: unknown) => void = () => {};
    mockSocket.subscribeDeletedMessage.mockImplementation((handler) => {
      deletedHandler = handler;
      return () => {};
    });

    renderHook(() => useConversationSocket(CONV_ID), {
      wrapper: customWrapper,
    });

    deletedHandler({
      messageId: MSG_ID,
      conversationId: CONV_ID,
      deletedAt: "2026-06-01T12:05:00.000Z",
    });

    await waitFor(() => {
      const data = client.getQueryData<{
        pages: Array<{ items: unknown[]; nextCursor: string | null }>;
      }>(queryKeys.conversations.messages(CONV_ID));
      const item = data?.pages[0]?.items[0] as {
        deletedAt?: string;
        text?: string | null;
        metadata?: unknown;
      };
      expect(item?.deletedAt).toBe("2026-06-01T12:05:00.000Z");
      expect(item?.text).toBeNull();
      expect(item?.metadata).toBeUndefined();
    });
  });
});
