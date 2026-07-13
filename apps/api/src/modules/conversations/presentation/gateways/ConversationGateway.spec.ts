import { describe, it, expect, vi } from "vitest";
import type { Socket } from "socket.io";

import { conversationRoom } from "../../../realtime/infrastructure/realtime.config";
import type { AuthenticatedSocketUser } from "../../../realtime/infrastructure/SocketAuthMiddleware";
import { Conversation } from "../../domain/Conversation";
import { CONVERSATION_SOCKET_ERROR_CODES } from "../../domain/types";
import type { ValidateConversationAccess } from "../../application/ValidateConversationAccess";

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

function buildGateway(validateAccess?: ValidateConversationAccess): {
  gateway: ConversationGateway;
  validateAccess: ValidateConversationAccess;
} {
  const access = validateAccess ?? buildValidateAccess();
  const gateway = new ConversationGateway(access);
  return { gateway, validateAccess: access };
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
});
