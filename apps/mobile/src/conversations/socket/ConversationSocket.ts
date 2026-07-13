import { io, type Socket } from "socket.io-client";
import { ConversationsSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { loadAuthSession } from "../../auth/session";

const DEFAULT_WS_URL =
  process.env["EXPO_PUBLIC_WS_URL"] ?? "ws://localhost:3006/ws/chat";

const SOCKET_CLIENT_ERROR_CODES = {
  NOT_CONNECTED: "NOT_CONNECTED",
  INVALID_ACK: "INVALID_ACK",
} as const;

export type ConversationSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface SocketErrorAck {
  ok: false;
  code: string;
  message: string;
}

export interface JoinConversationAck {
  ok: true;
  conversationId: string;
  room: string;
}

export interface SendTextMessageAck {
  ok: true;
  message: ConversationsSchemas.MessageSummary;
}

export type MessageNewEvent = ConversationsSchemas.ChatMessageEvent;
export type MessageDeletedEvent = ConversationsSchemas.MessageDeletedEvent;

export type WatermarkEvent = ConversationsSchemas.WatermarkEvent;

export interface UpdateWatermarkAck {
  ok: true;
  conversationId: string;
}

export interface ConversationSocketOptions {
  url?: string;
  token?: string;
}

export class ConversationSocket {
  private socket: Socket | null = null;
  private status: ConversationSocketStatus = "idle";
  private statusListeners = new Set<(status: ConversationSocketStatus) => void>();
  private messageListeners = new Set<(event: MessageNewEvent) => void>();
  private watermarkListeners = new Set<(event: WatermarkEvent) => void>();
  private deletedMessageListeners = new Set<
    (event: MessageDeletedEvent) => void
  >();
  private currentRoom: string | null = null;

  constructor(private readonly options: ConversationSocketOptions = {}) {}

  getStatus(): ConversationSocketStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  subscribeStatus(listener: (status: ConversationSocketStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  subscribeMessage(listener: (event: MessageNewEvent) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  subscribeWatermark(listener: (event: WatermarkEvent) => void): () => void {
    this.watermarkListeners.add(listener);
    return () => {
      this.watermarkListeners.delete(listener);
    };
  }

  subscribeDeletedMessage(
    listener: (event: MessageDeletedEvent) => void,
  ): () => void {
    this.deletedMessageListeners.add(listener);
    return () => {
      this.deletedMessageListeners.delete(listener);
    };
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    const token = this.options.token ?? (await loadAuthSession())?.accessToken;
    if (!token) {
      this.setStatus("error");
      return;
    }

    this.setStatus("connecting");

    this.socket = io(this.options.url ?? DEFAULT_WS_URL, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      this.setStatus("connected");
      if (this.currentRoom) {
        void this.joinRoomFromReconnect(this.currentRoom);
      }
    });

    this.socket.on("disconnect", () => {
      this.setStatus("disconnected");
    });

    this.socket.on("connect_error", () => {
      this.setStatus("error");
    });

    this.socket.on("message:new", (event: unknown) => {
      const parsed = ConversationsSchemas.ChatMessageEventSchema.safeParse(event);
      if (parsed.success) {
        this.messageListeners.forEach((listener) => listener(parsed.data));
      }
    });

    this.socket.on("watermark", (event: unknown) => {
      const parsed = ConversationsSchemas.WatermarkEventSchema.safeParse(event);
      if (parsed.success) {
        this.watermarkListeners.forEach((listener) => listener(parsed.data));
      }
    });

    this.socket.on("message:deleted", (event: unknown) => {
      const parsed =
        ConversationsSchemas.MessageDeletedEventSchema.safeParse(event);
      if (parsed.success) {
        this.deletedMessageListeners.forEach((listener) =>
          listener(parsed.data),
        );
      }
    });
  }

  disconnect(): void {
    this.currentRoom = null;
    this.socket?.disconnect();
    this.socket = null;
    this.setStatus("idle");
  }

  async joinConversation(
    conversationId: string,
  ): Promise<JoinConversationAck | SocketErrorAck> {
    if (!this.socket?.connected) {
      return {
        ok: false,
        code: SOCKET_CLIENT_ERROR_CODES.NOT_CONNECTED,
        message: "Socket is not connected",
      };
    }

    const socket = this.socket;

    return new Promise((resolve) => {
      socket.emit(
        "conversation:join",
        { conversationId },
        (ack: unknown) => {
          const parsed =
            ConversationsSchemas.JoinConversationResponseSchema.safeParse(ack);
          if (parsed.success) {
            this.currentRoom = parsed.data.room;
            resolve({
              ok: true,
              conversationId: parsed.data.conversationId,
              room: parsed.data.room,
            });
            return;
          }

          const errorParsed =
            ConversationsSchemas.ConversationSocketErrorSchema.safeParse(ack);
          if (errorParsed.success) {
            resolve(errorParsed.data);
            return;
          }

          resolve({
            ok: false,
            code: SOCKET_CLIENT_ERROR_CODES.INVALID_ACK,
            message: "Invalid join response",
          });
        },
      );
    });
  }

  async leaveConversation(conversationId: string): Promise<void> {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit("conversation:leave", { conversationId });
    this.currentRoom = null;
  }

  async markDelivered(
    conversationId: string,
    lastDeliveredAt?: string,
  ): Promise<UpdateWatermarkAck | SocketErrorAck> {
    return this.emitWatermark(conversationId, "message:delivered", {
      lastDeliveredAt,
    });
  }

  async markRead(
    conversationId: string,
    lastReadAt?: string,
  ): Promise<UpdateWatermarkAck | SocketErrorAck> {
    return this.emitWatermark(conversationId, "message:read", {
      lastReadAt,
    });
  }

  async markConversationRead(
    conversationId: string,
    lastReadAt?: string,
  ): Promise<UpdateWatermarkAck | SocketErrorAck> {
    return this.emitWatermark(conversationId, "conversation:read", {
      lastReadAt,
    });
  }

  private async emitWatermark(
    conversationId: string,
    event: "message:delivered" | "message:read" | "conversation:read",
    timestamps: { lastReadAt?: string; lastDeliveredAt?: string },
  ): Promise<UpdateWatermarkAck | SocketErrorAck> {
    if (!this.socket?.connected) {
      return {
        ok: false,
        code: SOCKET_CLIENT_ERROR_CODES.NOT_CONNECTED,
        message: "Socket is not connected",
      };
    }

    const socket = this.socket;

    return new Promise((resolve) => {
      socket.emit(
        event,
        { conversationId, ...timestamps },
        (ack: unknown) => {
          const parsed = z
            .object({
              ok: z.literal(true),
              conversationId: z.string().uuid(),
            })
            .safeParse(ack);
          if (parsed.success) {
            resolve({
              ok: true,
              conversationId: parsed.data.conversationId,
            });
            return;
          }

          const errorParsed =
            ConversationsSchemas.ConversationSocketErrorSchema.safeParse(ack);
          if (errorParsed.success) {
            resolve(errorParsed.data);
            return;
          }

          resolve({
            ok: false,
            code: SOCKET_CLIENT_ERROR_CODES.INVALID_ACK,
            message: "Invalid watermark response",
          });
        },
      );
    });
  }

  async deleteMessage(payload: {
    conversationId: string;
    messageId: string;
  }): Promise<
    | { ok: true; messageId: string; conversationId: string; deletedAt: string }
    | { ok: false; code: string; message: string }
  > {
    if (!this.socket?.connected) {
      return {
        ok: false,
        code: SOCKET_CLIENT_ERROR_CODES.NOT_CONNECTED,
        message: "Socket is not connected",
      };
    }

    const socket = this.socket;

    return new Promise((resolve) => {
      socket.emit(
        "message:delete",
        {
          conversationId: payload.conversationId,
          messageId: payload.messageId,
        },
        (ack: unknown) => {
          const wrapped = z
            .object({
              ok: z.literal(true),
              messageId: z.string().uuid(),
              conversationId: z.string().uuid(),
              deletedAt: z.string().datetime(),
            })
            .safeParse(ack);
          if (wrapped.success) {
            resolve({
              ok: true,
              messageId: wrapped.data.messageId,
              conversationId: wrapped.data.conversationId,
              deletedAt: wrapped.data.deletedAt,
            });
            return;
          }

          const errorParsed =
            ConversationsSchemas.ConversationSocketErrorSchema.safeParse(ack);
          if (errorParsed.success) {
            resolve(errorParsed.data);
            return;
          }

          resolve({
            ok: false,
            code: SOCKET_CLIENT_ERROR_CODES.INVALID_ACK,
            message: "Invalid delete response",
          });
        },
      );
    });
  }

  async sendTextMessage(payload: {
    conversationId: string;
    text: string;
    clientMessageId: string;
  }): Promise<SendTextMessageAck | SocketErrorAck> {
    if (!this.socket?.connected) {
      return {
        ok: false,
        code: SOCKET_CLIENT_ERROR_CODES.NOT_CONNECTED,
        message: "Socket is not connected",
      };
    }

    const socket = this.socket;

    return new Promise((resolve) => {
      socket.emit(
        "message:send",
        {
          conversationId: payload.conversationId,
          kind: "text",
          text: payload.text,
          clientMessageId: payload.clientMessageId,
        },
        (ack: unknown) => {
          const wrapped = z.object({
            ok: z.literal(true),
            message: ConversationsSchemas.MessageSummarySchema,
          }).safeParse(ack);
          if (wrapped.success) {
            resolve({ ok: true, message: wrapped.data });
            return;
          }

          const errorParsed =
            ConversationsSchemas.ConversationSocketErrorSchema.safeParse(ack);
          if (errorParsed.success) {
            resolve(errorParsed.data);
            return;
          }

          resolve({
            ok: false,
            code: SOCKET_CLIENT_ERROR_CODES.INVALID_ACK,
            message: "Invalid send response",
          });
        },
      );
    });
  }

  private async joinRoomFromReconnect(room: string): Promise<void> {
    const conversationId = room.replace("conversation:", "");
    await this.joinConversation(conversationId);
  }

  private setStatus(status: ConversationSocketStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}
