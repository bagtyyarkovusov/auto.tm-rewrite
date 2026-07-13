import { Inject, Injectable } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { ConversationsSchemas, ErrorCode } from "@auto-tm/contracts";
import { z } from "zod";
import type { Server, Socket } from "socket.io";

import {
  conversationRoom,
  REALTIME_NAMESPACE,
} from "../../../realtime/infrastructure/realtime.config";
import type { AuthenticatedSocketUser } from "../../../realtime/infrastructure/SocketAuthMiddleware";
import { CONVERSATION_SOCKET_ERROR_CODES } from "../../domain/types";
import type { SendMessageResult } from "../../application/SendMessage";
import { SendMessage } from "../../application/SendMessage";
import { UpdateWatermark } from "../../application/UpdateWatermark";
import { ValidateConversationAccess } from "../../application/ValidateConversationAccess";
import { DeleteMessage } from "../../application/DeleteMessage";
import type { Message } from "../../domain/Message";

type JoinPayload = {
  conversationId: string;
};

type WatermarkPayload = {
  conversationId: string;
  lastReadAt?: string | undefined;
  lastDeliveredAt?: string | undefined;
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

function parseSendMessagePayload(
  body: unknown,
): ConversationsSchemas.SendMessageSocketRequest | null {
  try {
    const parsed = ConversationsSchemas.SendMessageSocketRequestSchema.parse(
      body,
    );
    return parsed;
  } catch {
    return null;
  }
}

const WatermarkSocketPayloadSchema = z.object({
  conversationId: z.string().uuid(),
  lastReadAt: z.string().datetime().optional(),
  lastDeliveredAt: z.string().datetime().optional(),
}).refine(
  (data) => data.lastReadAt !== undefined || data.lastDeliveredAt !== undefined,
  {
    message: "At least one watermark timestamp is required",
    path: [],
  },
);

function parseWatermarkPayload(
  body: unknown,
): WatermarkPayload | null {
  try {
    const parsed = WatermarkSocketPayloadSchema.parse(body);
    return {
      conversationId: parsed.conversationId,
      lastReadAt: parsed.lastReadAt,
      lastDeliveredAt: parsed.lastDeliveredAt,
    };
  } catch {
    return null;
  }
}

function parseDeleteMessagePayload(
  body: unknown,
): ConversationsSchemas.DeleteMessageSocketRequest | null {
  try {
    const parsed =
      ConversationsSchemas.DeleteMessageSocketRequestSchema.parse(body);
    return parsed;
  } catch {
    return null;
  }
}

@Injectable()
@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
})
export class ConversationGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(ValidateConversationAccess)
    private readonly validateAccess: ValidateConversationAccess,
    @Inject(SendMessage)
    private readonly sendMessage: SendMessage,
    @Inject(UpdateWatermark)
    private readonly updateWatermark: UpdateWatermark,
    @Inject(DeleteMessage)
    private readonly deleteMessage: DeleteMessage,
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

  @SubscribeMessage("message:delivered")
  async handleMessageDelivered(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<SocketAck<{ ok: true; conversationId: string }>> {
    return this.handleWatermark(body, client, { field: "lastDeliveredAt" });
  }

  @SubscribeMessage("message:read")
  async handleMessageRead(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<SocketAck<{ ok: true; conversationId: string }>> {
    return this.handleWatermark(body, client, { field: "lastReadAt" });
  }

  @SubscribeMessage("conversation:read")
  async handleConversationRead(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<SocketAck<{ ok: true; conversationId: string }>> {
    return this.handleWatermark(body, client, { field: "lastReadAt" });
  }

  private async handleWatermark(
    body: unknown,
    client: Socket,
    opts: { field: "lastReadAt" | "lastDeliveredAt" },
  ): Promise<SocketAck<{ ok: true; conversationId: string }>> {
    const user = this.authenticatedUser(client);
    if (!user) {
      return this.unauthenticatedError();
    }

    const payload = parseWatermarkPayload(body);
    if (!payload) {
      return {
        ok: false,
        code: ErrorCode.ValidationFailed,
        message: "Invalid watermark payload",
      };
    }

    const timestamp =
      opts.field === "lastReadAt"
        ? (payload.lastReadAt ?? new Date().toISOString())
        : (payload.lastDeliveredAt ?? new Date().toISOString());
    const update =
      opts.field === "lastReadAt"
        ? { lastReadAt: timestamp }
        : { lastDeliveredAt: timestamp };

    try {
      await this.validateAccess.execute({
        userId: user.sub,
        conversationId: payload.conversationId,
      });
    } catch (err) {
      return this.toSocketError(err);
    }

    try {
      const result = await this.updateWatermark.execute({
        userId: user.sub,
        conversationId: payload.conversationId,
        ...update,
      });

      const event: ConversationsSchemas.WatermarkEvent = {
        conversationId: payload.conversationId,
        userId: user.sub,
      };
      if (result.lastReadAt) {
        event.lastReadAt = result.lastReadAt.toISOString();
      }
      if (result.lastDeliveredAt) {
        event.lastDeliveredAt = result.lastDeliveredAt.toISOString();
      }

      this.server
        .to(conversationRoom(payload.conversationId))
        .emit("watermark", event);

      return { ok: true, conversationId: payload.conversationId };
    } catch (err) {
      return this.toSocketError(err);
    }
  }

  @SubscribeMessage("message:send")
  async handleSendMessage(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<SocketAck<{ ok: true; message: ConversationsSchemas.MessageSummary }>> {
    const user = this.authenticatedUser(client);
    if (!user) {
      return this.unauthenticatedError();
    }

    const payload = parseSendMessagePayload(body);
    if (!payload) {
      return {
        ok: false,
        code: ErrorCode.ValidationFailed,
        message: "Invalid message send payload",
      };
    }

    let result: SendMessageResult;
    try {
      result = await this.sendMessage.execute({
        senderId: user.sub,
        ...payload,
      });
    } catch (err) {
      return this.toSocketError(err);
    }

    const message = this.toMessageSummary(result.message);

    const room = conversationRoom(payload.conversationId);
    this.server.to(room).emit("message:new", { message });

    return {
      ok: true,
      message,
    };
  }

  @SubscribeMessage("message:delete")
  async handleDeleteMessage(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<SocketAck<{ ok: true } & ConversationsSchemas.MessageDeletedEvent>> {
    const user = this.authenticatedUser(client);
    if (!user) {
      return this.unauthenticatedError();
    }

    const payload = parseDeleteMessagePayload(body);
    if (!payload) {
      return {
        ok: false,
        code: ErrorCode.ValidationFailed,
        message: "Invalid message delete payload",
      };
    }

    let result: { messageId: string; deletedAt: Date };
    try {
      result = await this.deleteMessage.execute({
        userId: user.sub,
        conversationId: payload.conversationId,
        messageId: payload.messageId,
      });
    } catch (err) {
      return this.toSocketError(err);
    }

    const room = conversationRoom(payload.conversationId);
    this.server.to(room).emit("message:deleted", {
      messageId: result.messageId,
      conversationId: payload.conversationId,
      deletedAt: result.deletedAt.toISOString(),
    });

    return {
      ok: true,
      messageId: result.messageId,
      conversationId: payload.conversationId,
      deletedAt: result.deletedAt.toISOString(),
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

  private toMessageSummary(
    message: Message,
  ): ConversationsSchemas.MessageSummary {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      kind: message.kind,
      text: message.body,
      metadata: message.metadata ?? undefined,
      createdAt: message.createdAt.toISOString(),
      ...(message.deletedAt
        ? { deletedAt: message.deletedAt.toISOString() }
        : {}),
      ...(message.clientMessageId
        ? { clientMessageId: message.clientMessageId }
        : {}),
    } as ConversationsSchemas.MessageSummary;
  }
}
