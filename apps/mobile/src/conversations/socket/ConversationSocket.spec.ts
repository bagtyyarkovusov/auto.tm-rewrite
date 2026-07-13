// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversationsSchemas } from "@auto-tm/contracts";

import { ConversationSocket } from "./ConversationSocket";

const CONV_ID = "550e8400-e29b-41d4-a716-446655440001";
const MSG_ID = "550e8400-e29b-41d4-a716-446655440002";
const MSG_ID_2 = "550e8400-e29b-41d4-a716-446655440003";
const USER_ID = "550e8400-e29b-41d4-a716-446655440004";

const mockSocket = {
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
};

const mockIo = vi.fn().mockReturnValue(mockSocket);

vi.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

vi.mock("../../auth/session", () => ({
  loadAuthSession: vi.fn().mockResolvedValue({
    accessToken: "test-token",
  }),
}));

describe("ConversationSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.on.mockImplementation((event: string, handler: () => void) => {
      if (event === "connect") {
        mockSocket.connected = true;
        handler();
      }
    });
  });

  it("connects with auth token from session", async () => {
    const socket = new ConversationSocket();
    await socket.connect();

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: "test-token" },
        transports: ["websocket"],
      }),
    );
  });

  it("can be constructed with explicit token and url", async () => {
    const socket = new ConversationSocket({
      url: "ws://custom/ws/chat",
      token: "custom-token",
    });
    await socket.connect();

    expect(mockIo).toHaveBeenCalledWith(
      "ws://custom/ws/chat",
      expect.objectContaining({
        auth: { token: "custom-token" },
      }),
    );
  });

  it("emits status changes to listeners", async () => {
    const socket = new ConversationSocket();
    const listener = vi.fn();
    socket.subscribeStatus(listener);

    await socket.connect();

    expect(listener).toHaveBeenCalledWith("connecting");
    expect(listener).toHaveBeenCalledWith("connected");
  });

  it("joins a conversation and returns room on success", async () => {
    const socket = new ConversationSocket();
    await socket.connect();

    mockSocket.emit.mockImplementation(
      (_event: string, _payload: unknown, callback: (ack: unknown) => void) => {
        callback({
          ok: true,
          conversationId: CONV_ID,
          room: `conversation:${CONV_ID}`,
        });
      },
    );

    const result = await socket.joinConversation(CONV_ID);

    expect(result).toEqual({
      ok: true,
      conversationId: CONV_ID,
      room: `conversation:${CONV_ID}`,
    });
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "conversation:join",
      { conversationId: CONV_ID },
      expect.any(Function),
    );
  });

  it("returns error when join response is a socket error", async () => {
    const socket = new ConversationSocket();
    await socket.connect();

    mockSocket.emit.mockImplementation(
      (_event: string, _payload: unknown, callback: (ack: unknown) => void) => {
        callback({ ok: false, code: "FORBIDDEN", message: "No access" });
      },
    );

    const result = await socket.joinConversation(CONV_ID);

    expect(result).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "No access",
    });
  });

  it("sends a text message and returns the durable ack", async () => {
    const socket = new ConversationSocket();
    await socket.connect();

    const message = ConversationsSchemas.MessageSummarySchema.parse({
      id: MSG_ID,
      conversationId: CONV_ID,
      senderId: USER_ID,
      kind: "text",
      text: "Hello",
      createdAt: "2026-06-01T12:00:00.000Z",
      clientMessageId: "client-1",
    });

    mockSocket.emit.mockImplementation(
      (_event: string, _payload: unknown, callback: (ack: unknown) => void) => {
        callback({ ok: true, message });
      },
    );

    const result = await socket.sendTextMessage({
      conversationId: CONV_ID,
      text: "Hello",
      clientMessageId: "client-1",
    });

    expect(result).toEqual({ ok: true, message });
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "message:send",
      {
        conversationId: CONV_ID,
        kind: "text",
        text: "Hello",
        clientMessageId: "client-1",
      },
      expect.any(Function),
    );
  });

  it("returns NOT_CONNECTED when sending while disconnected", async () => {
    mockSocket.connected = false;
    mockSocket.on.mockImplementation(() => {
      // do not trigger connect
    });

    const socket = new ConversationSocket();
    await socket.connect();

    const result = await socket.sendTextMessage({
      conversationId: CONV_ID,
      text: "Hello",
      clientMessageId: "client-1",
    });

    expect(result).toEqual({
      ok: false,
      code: "NOT_CONNECTED",
      message: "Socket is not connected",
    });
  });

  it("forwards message:new events to listeners", async () => {
    const socket = new ConversationSocket();
    await socket.connect();

    const listener = vi.fn();
    socket.subscribeMessage(listener);

    const message = ConversationsSchemas.MessageSummarySchema.parse({
      id: MSG_ID_2,
      conversationId: CONV_ID,
      senderId: USER_ID,
      kind: "text",
      text: "Hi there",
      createdAt: "2026-06-01T12:01:00.000Z",
    });

    const messageHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "message:new",
    )?.[1] as (event: unknown) => void;

    messageHandler({ message });

    expect(listener).toHaveBeenCalledWith({ message });
  });

  it("disconnects and resets status", async () => {
    const socket = new ConversationSocket();
    await socket.connect();

    socket.disconnect();

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(socket.getStatus()).toBe("idle");
  });

  it("emits message:delivered and returns ack", async () => {
    const socket = new ConversationSocket();
    await socket.connect();

    mockSocket.emit.mockImplementation(
      (_event: string, _payload: unknown, callback: (ack: unknown) => void) => {
        callback({ ok: true, conversationId: CONV_ID });
      },
    );

    const result = await socket.markDelivered(CONV_ID, "2026-06-01T12:00:00.000Z");

    expect(result).toEqual({ ok: true, conversationId: CONV_ID });
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "message:delivered",
      { conversationId: CONV_ID, lastDeliveredAt: "2026-06-01T12:00:00.000Z" },
      expect.any(Function),
    );
  });

  it("emits conversation:read and returns ack", async () => {
    const socket = new ConversationSocket();
    await socket.connect();

    mockSocket.emit.mockImplementation(
      (_event: string, _payload: unknown, callback: (ack: unknown) => void) => {
        callback({ ok: true, conversationId: CONV_ID });
      },
    );

    const result = await socket.markConversationRead(
      CONV_ID,
      "2026-06-01T12:00:00.000Z",
    );

    expect(result).toEqual({ ok: true, conversationId: CONV_ID });
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "conversation:read",
      { conversationId: CONV_ID, lastReadAt: "2026-06-01T12:00:00.000Z" },
      expect.any(Function),
    );
  });

  it("forwards watermark events to listeners", async () => {
    const socket = new ConversationSocket();
    await socket.connect();

    const listener = vi.fn();
    socket.subscribeWatermark(listener);

    const watermarkHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "watermark",
    )?.[1] as (event: unknown) => void;

    const event = {
      conversationId: CONV_ID,
      userId: USER_ID,
      lastReadAt: "2026-06-01T12:00:00.000Z",
    };
    watermarkHandler(event);

    expect(listener).toHaveBeenCalledWith(event);
  });

  it("returns NOT_CONNECTED when marking delivered while disconnected", async () => {
    mockSocket.connected = false;
    mockSocket.on.mockImplementation(() => {
      // do not trigger connect
    });

    const socket = new ConversationSocket();
    await socket.connect();

    const result = await socket.markDelivered(CONV_ID);

    expect(result).toEqual({
      ok: false,
      code: "NOT_CONNECTED",
      message: "Socket is not connected",
    });
  });
});
