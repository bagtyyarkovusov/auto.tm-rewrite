import { describe, it, expect, vi } from "vitest";
import type { Server, Socket } from "socket.io";

import { conversationRoom } from "../../../realtime/infrastructure/realtime.config";
import type { AuthenticatedSocketUser } from "../../../realtime/infrastructure/SocketAuthMiddleware";
import { Conversation } from "../../domain/Conversation";
import { Message } from "../../domain/Message";
import { CONVERSATION_SOCKET_ERROR_CODES } from "../../domain/types";
import type { ValidateConversationAccess } from "../../application/ValidateConversationAccess";
import type { SendMessage, SendMessageResult } from "../../application/SendMessage";

import { ConversationGateway } from "./ConversationGateway";

function buildSocket(overrides: {
  id?: string;
  user?: AuthenticatedSocketUser | null;
  rooms?: Set<string>;
} = {}): Socket {
  const rooms = overrides.rooms ?? new Set<string>();
  return {
    id: overrides.id ?? "socket-1",
    data: overrides.user === null ? {} : { user: overrides.user ?? { sub: "user-1", sid: "sid-1", phone: "+993", role: "user" } },
    join: vi.fn(async (room: string) => {
      rooms.add(room);
    }),
    leave: vi.fn(async (room: string) => {
      rooms.delete(room);
    }),
    rooms,
  } as unknown as Socket;
}

function buildValidateAccess(
  overrides: Partial<ValidateConversationAccess> = {},
): ValidateConversationAccess {
  return {
    execute: vi.fn(),
    ...overrides,
  } as unknown as ValidateConversationAccess;
}

function buildSendMessage(
  overrides: Partial<SendMessage> = {},
): SendMessage {
  return {
    execute: vi.fn(),
    ...overrides,
  } as unknown as SendMessage;
}

function buildServer(): Server {
  return {
    to: vi.fn(() => ({
      emit: vi.fn(),
    })),
  } as unknown as Server;
}

function buildGateway(
  validateAccess?: ValidateConversationAccess,
  sendMessage?: SendMessage,
): {
  gateway: ConversationGateway;
  validateAccess: ValidateConversationAccess;
  sendMessage: SendMessage;
} {
  const access = validateAccess ?? buildValidateAccess();
  const send = sendMessage ?? buildSendMessage();
  const gateway = new ConversationGateway(access, send);
  return { gateway, validateAccess: access, sendMessage: send };
}

const CONV_1 = "550e8400-e29b-41d4-a716-446655440001";
const CONV_2 = "550e8400-e29b-41d4-a716-446655440002";
const LISTING_1 = "550e8400-e29b-41d4-a716-446655440003";

function seedConversation(id = CONV_1): Conversation {
  return Conversation.create({
    id,
    listingId: LISTING_1,
    buyerId: "buyer-1",
    sellerId: "seller-1",
  });
}

describe("ConversationGateway", () => {
  it("allows a participant to join a conversation room", async () => {
    const validateAccess = buildValidateAccess({
      execute: vi.fn().mockResolvedValue(seedConversation()),
    });
    const { gateway } = buildGateway(validateAccess);
    const socket = buildSocket({ user: { sub: "buyer-1", sid: "sid-1", phone: "+993", role: "user" } });

    const result = await gateway.handleJoin(
      { conversationId: CONV_1 },
      socket,
    );

    expect(result).toEqual({
      ok: true,
      conversationId: CONV_1,
      room: conversationRoom(CONV_1),
    });
    expect(socket.join).toHaveBeenCalledWith(conversationRoom(CONV_1));
    expect(validateAccess.execute).toHaveBeenCalledWith({
      userId: "buyer-1",
      conversationId: CONV_1,
    });
  });

  it("rejects join for unauthenticated sockets", async () => {
    const { gateway } = buildGateway();
    const socket = buildSocket({ user: null });

    const result = await gateway.handleJoin(
      { conversationId: CONV_1 },
      socket,
    );

    expect(result).toEqual({
      ok: false,
      code: CONVERSATION_SOCKET_ERROR_CODES.MISSING_AUTH_TOKEN,
      message: "Authentication required",
    });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("rejects join with validation error for malformed payload", async () => {
    const { gateway } = buildGateway();
    const socket = buildSocket({ user: { sub: "buyer-1", sid: "sid-1", phone: "+993", role: "user" } });

    const result = await gateway.handleJoin({ notId: CONV_1 }, socket);

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      message: "conversationId is required",
    });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("rejects join when validateAccess throws", async () => {
    const validateAccess = buildValidateAccess({
      execute: vi.fn().mockRejectedValue({
        response: {
          code: "FORBIDDEN",
          message: "You are not a participant in this conversation",
        },
      }),
    });
    const { gateway } = buildGateway(validateAccess);
    const socket = buildSocket({ user: { sub: "random-user", sid: "sid-1", phone: "+993", role: "user" } });

    const result = await gateway.handleJoin(
      { conversationId: CONV_1 },
      socket,
    );

    expect(result).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "You are not a participant in this conversation",
    });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("duplicate join is idempotent", async () => {
    const validateAccess = buildValidateAccess({
      execute: vi.fn().mockResolvedValue(seedConversation()),
    });
    const { gateway } = buildGateway(validateAccess);
    const socket = buildSocket({ user: { sub: "buyer-1", sid: "sid-1", phone: "+993", role: "user" } });

    const first = await gateway.handleJoin(
      { conversationId: CONV_1 },
      socket,
    );
    const second = await gateway.handleJoin(
      { conversationId: CONV_1 },
      socket,
    );

    expect(first).toEqual(second);
    expect(socket.join).toHaveBeenCalledTimes(2);
  });

  it("allows explicit leave", async () => {
    const { gateway } = buildGateway();
    const socket = buildSocket({
      user: { sub: "buyer-1", sid: "sid-1", phone: "+993", role: "user" },
      rooms: new Set([conversationRoom(CONV_1)]),
    });

    const result = await gateway.handleLeave(
      { conversationId: CONV_1 },
      socket,
    );

    expect(result).toEqual({
      ok: true,
      conversationId: CONV_1,
      room: conversationRoom(CONV_1),
    });
    expect(socket.leave).toHaveBeenCalledWith(conversationRoom(CONV_1));
  });

  it("rejects leave for unauthenticated sockets", async () => {
    const { gateway } = buildGateway();
    const socket = buildSocket({ user: null });

    const result = await gateway.handleLeave(
      { conversationId: CONV_1 },
      socket,
    );

    expect(result).toEqual({
      ok: false,
      code: CONVERSATION_SOCKET_ERROR_CODES.MISSING_AUTH_TOKEN,
      message: "Authentication required",
    });
    expect(socket.leave).not.toHaveBeenCalled();
  });

  it("isolates rooms across conversations", async () => {
    const validateAccess = buildValidateAccess({
      execute: vi.fn().mockImplementation(async ({ conversationId }) => {
        return Conversation.create({
          id: conversationId,
          listingId: LISTING_1,
          buyerId: "buyer-1",
          sellerId: "seller-1",
        });
      }),
    });
    const { gateway } = buildGateway(validateAccess);
    const socket = buildSocket({ user: { sub: "buyer-1", sid: "sid-1", phone: "+993", role: "user" } });

    await gateway.handleJoin({ conversationId: CONV_1 }, socket);
    await gateway.handleJoin({ conversationId: CONV_2 }, socket);

    expect(socket.join).toHaveBeenCalledWith(conversationRoom(CONV_1));
    expect(socket.join).toHaveBeenCalledWith(conversationRoom(CONV_2));
  });

  it("cross-user isolation is enforced by validateAccess", async () => {
    const validateAccess = buildValidateAccess({
      execute: vi.fn().mockImplementation(async ({ userId, conversationId }) => {
        const conversation = seedConversation();
        if (!conversation.isParticipant(userId)) {
          throw {
            response: {
              code: "FORBIDDEN",
              message: "You are not a participant in this conversation",
            },
          };
        }
        return conversation;
      }),
    });
    const { gateway } = buildGateway(validateAccess);
    const socket = buildSocket({ user: { sub: "non-participant", sid: "sid-1", phone: "+993", role: "user" } });

    const result = await gateway.handleJoin(
      { conversationId: CONV_1 },
      socket,
    );

    expect(result).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "You are not a participant in this conversation",
    });
    expect(socket.join).not.toHaveBeenCalled();
  });

  describe("message:send", () => {
    it("acks sender with durable message and fans out message:new", async () => {
      const message = Message.createText({
        id: "msg-1",
        conversationId: CONV_1,
        senderId: "buyer-1",
        text: "Hello socket",
        clientMessageId: "client-1",
      });
      const sendMessage = buildSendMessage({
        execute: vi.fn().mockResolvedValue({
          message,
          listing: null,
        } as SendMessageResult),
      });
      const { gateway } = buildGateway(undefined, sendMessage);
      const socket = buildSocket({
        user: { sub: "buyer-1", sid: "sid-1", phone: "+993", role: "user" },
      });
      const emitMock = vi.fn();
      const toMock = vi.fn().mockReturnValue({ emit: emitMock });
      gateway.server = { to: toMock } as unknown as Server;

      const result = await gateway.handleSendMessage(
        {
          conversationId: CONV_1,
          kind: "text",
          text: "Hello socket",
          clientMessageId: "client-1",
        },
        socket,
      );

      expect(result).toEqual({
        ok: true,
        message: expect.objectContaining({
          id: "msg-1",
          conversationId: CONV_1,
          senderId: "buyer-1",
          kind: "text",
          text: "Hello socket",
          clientMessageId: "client-1",
        }),
      });
      expect(sendMessage.execute).toHaveBeenCalledWith({
        senderId: "buyer-1",
        conversationId: CONV_1,
        kind: "text",
        text: "Hello socket",
        clientMessageId: "client-1",
      });
      expect(toMock).toHaveBeenCalledWith(conversationRoom(CONV_1));
      expect(emitMock).toHaveBeenCalledWith("message:new", {
        message: expect.objectContaining({
          id: "msg-1",
          clientMessageId: "client-1",
        }),
      });
    });

    it("returns existing message for duplicate clientMessageId without creating a new row", async () => {
      const message = Message.createText({
        id: "msg-existing",
        conversationId: CONV_1,
        senderId: "buyer-1",
        text: "Already sent",
        clientMessageId: "client-dup",
      });
      const sendMessage = buildSendMessage({
        execute: vi.fn().mockResolvedValue({
          message,
          listing: null,
        } as SendMessageResult),
      });
      const { gateway } = buildGateway(undefined, sendMessage);
      const socket = buildSocket({
        user: { sub: "buyer-1", sid: "sid-1", phone: "+993", role: "user" },
      });
      gateway.server = buildServer();

      const first = await gateway.handleSendMessage(
        {
          conversationId: CONV_1,
          kind: "text",
          text: "Already sent",
          clientMessageId: "client-dup",
        },
        socket,
      );
      const second = await gateway.handleSendMessage(
        {
          conversationId: CONV_1,
          kind: "text",
          text: "Retry text",
          clientMessageId: "client-dup",
        },
        socket,
      );

      expect((first as { ok: true; message: { id: string } }).message.id).toBe(
        (second as { ok: true; message: { id: string } }).message.id,
      );
      expect(sendMessage.execute).toHaveBeenCalledTimes(2);
    });

    it("rejects send for unauthenticated sockets", async () => {
      const { gateway } = buildGateway();
      const socket = buildSocket({ user: null });

      const result = await gateway.handleSendMessage(
        {
          conversationId: CONV_1,
          kind: "text",
          text: "Hello",
          clientMessageId: "client-1",
        },
        socket,
      );

      expect(result).toEqual({
        ok: false,
        code: CONVERSATION_SOCKET_ERROR_CODES.MISSING_AUTH_TOKEN,
        message: "Authentication required",
      });
    });

    it("rejects send with validation error for malformed payload", async () => {
      const { gateway } = buildGateway();
      const socket = buildSocket({
        user: { sub: "buyer-1", sid: "sid-1", phone: "+993", role: "user" },
      });

      const result = await gateway.handleSendMessage(
        { notId: CONV_1, kind: "text", text: "Hello" },
        socket,
      );

      expect(result).toEqual({
        ok: false,
        code: "VALIDATION_FAILED",
        message: "Invalid message send payload",
      });
    });

    it("rejects send when SendMessage throws a participant/business error", async () => {
      const sendMessage = buildSendMessage({
        execute: vi.fn().mockRejectedValue({
          response: {
            code: "FORBIDDEN",
            message: "You are not a participant in this conversation",
          },
        }),
      });
      const { gateway } = buildGateway(undefined, sendMessage);
      const socket = buildSocket({
        user: { sub: "random-user", sid: "sid-1", phone: "+993", role: "user" },
      });
      gateway.server = buildServer();

      const result = await gateway.handleSendMessage(
        {
          conversationId: CONV_1,
          kind: "text",
          text: "Hello",
          clientMessageId: "client-1",
        },
        socket,
      );

      expect(result).toEqual({
        ok: false,
        code: "FORBIDDEN",
        message: "You are not a participant in this conversation",
      });
    });
  });
});
