import { Inject, Injectable } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from "@nestjs/websockets";
import { ConversationsSchemas, ErrorCode } from "@auto-tm/contracts";
import type { Socket } from "socket.io";

import {
  conversationRoom,
  REALTIME_NAMESPACE,
} from "../../../realtime/infrastructure/realtime.config";
import type { AuthenticatedSocketUser } from "../../../realtime/infrastructure/SocketAuthMiddleware";
import { CONVERSATION_SOCKET_ERROR_CODES } from "../../domain/types";
import { ValidateConversationAccess } from "../../application/ValidateConversationAccess";

type JoinPayload = {
  conversationId: string;
};

type SocketAck<T> = T | { ok: false; code: string; message: string };

function parseJoinPayload(body: unknown): JoinPayload | null {
  try {
    const parsed = ConversationsSchemas.JoinConversationRequestSchema.parse(
      body,
    );
    return { conversationId: parsed.conversationId };
  } catch {
    return null;
  }
}

@Injectable()
@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
})
export class ConversationGateway {
  constructor(
    @Inject(ValidateConversationAccess)
    private readonly validateAccess: ValidateConversationAccess,
  ) {}

  @SubscribeMessage("conversation:join")
  async handleJoin(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<
    SocketAck<{
      ok: true;
      conversationId: string;
      room: string;
    }>
  > {
    const user = this.authenticatedUser(client);
    if (!user) {
      return this.unauthenticatedError();
    }

    const payload = parseJoinPayload(body);
    if (!payload) {
      return {
        ok: false,
        code: ErrorCode.ValidationFailed,
        message: "conversationId is required",
      };
    }

    try {
      await this.validateAccess.execute({
        userId: user.sub,
        conversationId: payload.conversationId,
      });
    } catch (err) {
      return this.toSocketError(err);
    }

    const room = conversationRoom(payload.conversationId);
    await client.join(room);

    return {
      ok: true,
      conversationId: payload.conversationId,
      room,
    };
  }

  @SubscribeMessage("conversation:leave")
  async handleLeave(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<
    SocketAck<{
      ok: true;
      conversationId: string;
      room: string;
    }>
  > {
    const user = this.authenticatedUser(client);
    if (!user) {
      return this.unauthenticatedError();
    }

    const payload = parseJoinPayload(body);
    if (!payload) {
      return {
        ok: false,
        code: ErrorCode.ValidationFailed,
        message: "conversationId is required",
      };
    }

    const room = conversationRoom(payload.conversationId);
    await client.leave(room);

    return {
      ok: true,
      conversationId: payload.conversationId,
      room,
    };
  }

  private authenticatedUser(client: Socket): AuthenticatedSocketUser | null {
    const user = client.data.user;
    if (!user?.sub) return null;
    return user;
  }

  private unauthenticatedError(): { ok: false; code: string; message: string } {
    return {
      ok: false,
      code: CONVERSATION_SOCKET_ERROR_CODES.MISSING_AUTH_TOKEN,
      message: "Authentication required",
    };
  }

  private toSocketError(err: unknown): {
    ok: false;
    code: string;
    message: string;
  } {
    if (err && typeof err === "object" && "response" in err) {
      const response = (err as { response?: Record<string, unknown> }).response;
      if (response) {
        const code =
          typeof response["code"] === "string"
            ? response["code"]
            : ErrorCode.Forbidden;
        const message =
          typeof response["message"] === "string"
            ? response["message"]
            : "Access denied";
        return { ok: false, code, message };
      }
    }

    if (err instanceof Error) {
      return { ok: false, code: ErrorCode.Internal, message: err.message };
    }

    return { ok: false, code: ErrorCode.Internal, message: "Access denied" };
  }
}
