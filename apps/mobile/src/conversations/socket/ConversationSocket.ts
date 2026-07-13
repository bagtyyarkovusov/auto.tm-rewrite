import { io, type Socket } from "socket.io-client";
import { ConversationsSchemas } from "@auto-tm/contracts";
import { z } from "zod";

import { loadAuthSession } from "../../auth/session";

const DEFAULT_WS_URL =
  process.env["EXPO_PUBLIC_WS_URL"] ?? "ws://localhost:3006/ws/chat";

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

export interface ConversationSocketOptions {
  url?: string;
  token?: string;
}

export class ConversationSocket {
  private socket: Socket | null = null;
  private status: ConversationSocketStatus = "idle";
  private statusListeners = new Set<(status: ConversationSocketStatus) => void>();
  private messageListeners = new Set<(event: MessageNewEvent) => void>();
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
        code: "NOT_CONNECTED",
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
            code: "INVALID_ACK",
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

  async sendTextMessage(payload: {
    conversationId: string;
    text: string;
    clientMessageId: string;
  }): Promise<SendTextMessageAck | SocketErrorAck> {
    if (!this.socket?.connected) {
      return {
        ok: false,
        code: "NOT_CONNECTED",
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
          const success =
            ConversationsSchemas.SendMessageResponseSchema.safeParse(ack);
          if (success.success) {
            resolve({ ok: true, message: success.data });
            return;
          }

          // Server ack wraps the durable message in { ok: true, message }.
          const wrapped = z
            .object({
              ok: z.literal(true),
              message: ConversationsSchemas.MessageSummarySchema,
            })
            .safeParse(ack);
          if (wrapped.success) {
            resolve({ ok: true, message: wrapped.data.message });
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
            code: "INVALID_ACK",
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
