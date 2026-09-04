import { Inject, Injectable } from "@nestjs/common";
import { Prisma, PrismaService } from "@auto-tm/db";

import { Conversation } from "../domain/Conversation";
import type { Message } from "../domain/Message";
import { MessageAlreadySavedError } from "../domain/ports/ConversationRepository";
import type {
  ConversationRepository,
  ParticipantState,
} from "../domain/ports/ConversationRepository";
import type { ConversationStatePort } from "../domain/ports/ConversationStatePort";
import type {
  ConversationReportContextPort,
  MessageReportContext,
} from "../domain/ports/ConversationReportContextPort";
import { toDomainMessage, toRawMetadata } from "./MessageMapper";

@Injectable()
export class PrismaConversationRepository
  implements
    ConversationRepository,
    ConversationStatePort,
    ConversationReportContextPort
{
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string): Promise<Conversation | null> {
    const row = await this.prisma.conversation.findUnique({
      where: { id },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByListingAndBuyer(
    listingId: string,
    buyerId: string,
  ): Promise<Conversation | null> {
    const row = await this.prisma.conversation.findUnique({
      where: { listingId_buyerId: { listingId, buyerId } },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async save(conversation: Conversation): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.conversation.create({
        data: {
          id: conversation.id,
          listingId: conversation.listingId,
          buyerId: conversation.buyerId,
          sellerId: conversation.sellerId,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      }),
      this.prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: conversation.buyerId,
        },
      }),
      this.prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: conversation.sellerId,
        },
      }),
    ]);
  }

  async listForUser(
    userId: string,
    query: { cursor?: string; limit?: number },
  ): Promise<{
    items: Array<{ conversation: Conversation; lastMessage: Message | null }>;
    nextCursor: string | null;
  }> {
    const take = (query.limit ?? 20) + 1;

    const rows = await this.prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { updatedAt: "desc" },
      take,
      ...(query.cursor
        ? {
            skip: 1,
            cursor: { id: query.cursor },
          }
        : {}),
    });

    const hasMore = rows.length === take;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    const lastMessageIds = items
      .map((r) => r.lastMessageId)
      .filter((id): id is string => id !== null && id !== undefined);

    const lastMessages =
      lastMessageIds.length > 0
        ? await this.prisma.message.findMany({
            where: { id: { in: lastMessageIds } },
          })
        : [];

    const lastMessageMap = new Map(
      lastMessages.map((r) => [r.id, toDomainMessage(r)]),
    );

    return {
      items: items.map((r) => ({
        conversation: this.toDomain(r),
        lastMessage: r.lastMessageId
          ? (lastMessageMap.get(r.lastMessageId) ?? null)
          : null,
      })),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async listMessages(
    conversationId: string,
    query: { cursor?: string; limit?: number },
  ): Promise<{ items: Message[]; nextCursor: string | null }> {
    const take = (query.limit ?? 20) + 1;

    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...(query.cursor
        ? {
            skip: 1,
            cursor: { id: query.cursor },
          }
        : {}),
    });

    const hasMore = rows.length === take;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    return {
      items: items.map((r) => toDomainMessage(r)),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async findMessageById(id: string): Promise<Message | null> {
    const row = await this.prisma.message.findUnique({
      where: { id },
    });
    if (!row) return null;
    return toDomainMessage(row);
  }

  async findMessageByClientMessageId(
    conversationId: string,
    senderId: string,
    clientMessageId: string,
  ): Promise<Message | null> {
    const row = await this.prisma.message.findUnique({
      where: {
        conversationId_senderId_clientMessageId: {
          conversationId,
          senderId,
          clientMessageId,
        },
      },
    });
    if (!row) return null;
    return toDomainMessage(row);
  }

  async saveMessage(message: Message): Promise<void> {
    const now = new Date();
    try {
      await this.prisma.$transaction([
        this.prisma.message.create({
          data: {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            kind: message.kind,
            body: message.body,
            metadata: toRawMetadata(message.metadata) as Prisma.InputJsonValue,
            createdAt: message.createdAt,
            clientMessageId: message.clientMessageId ?? null,
          },
        }),
        this.prisma.conversation.update({
          where: { id: message.conversationId },
          data: {
            updatedAt: now,
            lastMessageAt: message.createdAt,
            lastMessageId: message.id,
          },
        }),
      ]);
    } catch (error) {
      if (
        message.clientMessageId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.findMessageByClientMessageId(
          message.conversationId,
          message.senderId,
          message.clientMessageId,
        );
        if (existing) throw new MessageAlreadySavedError(existing);
      }
      throw error;
    }
  }

  async updateWatermark(
    userId: string,
    conversationId: string,
    data: { lastReadAt?: Date; lastDeliveredAt?: Date },
  ): Promise<ParticipantState> {
    const row = await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        ...(data.lastReadAt !== undefined
          ? { lastReadAt: data.lastReadAt }
          : {}),
        ...(data.lastDeliveredAt !== undefined
          ? { lastDeliveredAt: data.lastDeliveredAt }
          : {}),
      },
    });

    return {
      mutedAt: row.mutedAt,
      lastReadAt: row.lastReadAt,
      lastDeliveredAt: row.lastDeliveredAt,
    };
  }

  async getParticipantState(
    userId: string,
    conversationId: string,
  ): Promise<ParticipantState | null> {
    const row = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });
    if (!row) return null;
    return {
      mutedAt: row.mutedAt,
      lastReadAt: row.lastReadAt,
      lastDeliveredAt: row.lastDeliveredAt,
    };
  }

  async isMuted(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const row = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      select: { mutedAt: true },
    });
    return row?.mutedAt != null;
  }

  async getParticipantStatesForConversations(
    conversationIds: string[],
  ): Promise<Map<string, Array<{ userId: string } & ParticipantState>>> {
    if (conversationIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId: { in: conversationIds },
      },
    });

    const map = new Map<string, Array<{ userId: string } & ParticipantState>>();
    for (const row of rows) {
      const existing = map.get(row.conversationId) ?? [];
      existing.push({
        userId: row.userId,
        mutedAt: row.mutedAt,
        lastReadAt: row.lastReadAt,
        lastDeliveredAt: row.lastDeliveredAt,
      });
      map.set(row.conversationId, existing);
    }

    return map;
  }

  async muteConversation(
    userId: string,
    conversationId: string,
    muted: boolean,
  ): Promise<ParticipantState> {
    const row = await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        mutedAt: muted ? new Date() : null,
      },
    });

    return {
      mutedAt: row.mutedAt,
      lastReadAt: row.lastReadAt,
      lastDeliveredAt: row.lastDeliveredAt,
    };
  }

  async softDeleteMessage(
    messageId: string,
    userId: string,
    deletedAt: Date,
  ): Promise<Message | null> {
    const result = await this.prisma.message.updateMany({
      where: {
        id: messageId,
        senderId: userId,
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    });

    if (result.count === 0) return null;

    return this.findMessageById(messageId);
  }

  async countUnreadMessages(
    userId: string,
    conversationId: string,
  ): Promise<number> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    const lastReadAt = participant?.lastReadAt ?? new Date(0);

    return this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        deletedAt: null,
        createdAt: { gt: lastReadAt },
      },
    });
  }

  async getMessageReportContext(input: {
    conversationId: string;
    messageId: string;
  }): Promise<MessageReportContext | null> {
    const [conversation, message] = await Promise.all([
      this.prisma.conversation.findUnique({
        where: { id: input.conversationId },
      }),
      this.prisma.message.findUnique({
        where: { id: input.messageId },
      }),
    ]);

    if (!conversation || !message) {
      return null;
    }

    if (message.conversationId !== conversation.id) {
      return null;
    }

    // Fetch a window of up to 10 messages before and after the reported
    // message, keeping the reported message itself for positioning.
    const beforeRows = await this.prisma.message.findMany({
      where: {
        conversationId: input.conversationId,
        OR: [
          { createdAt: { lt: message.createdAt } },
          {
            createdAt: { equals: message.createdAt },
            id: { lt: message.id },
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
    });

    const afterRows = await this.prisma.message.findMany({
      where: {
        conversationId: input.conversationId,
        OR: [
          { createdAt: { gt: message.createdAt } },
          {
            createdAt: { equals: message.createdAt },
            id: { gt: message.id },
          },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 10,
    });

    const contextRows = [
      ...beforeRows.reverse(),
      message,
      ...afterRows,
    ].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id.localeCompare(b.id),
    );

    return {
      messageId: message.id,
      conversationId: conversation.id,
      listingId: conversation.listingId,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      senderId: message.senderId,
      createdAt: message.createdAt,
      body: message.body,
      deletedAt: message.deletedAt,
      surroundingMessages: contextRows
        .filter((m) => m.id !== message.id)
        .map((m) => ({
          id: m.id,
          senderId: m.senderId,
          createdAt: m.createdAt,
          body: m.body,
          deletedAt: m.deletedAt,
        })),
    };
  }

  async isParticipant(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });
    return participant != null;
  }

  private toDomain(row: {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Conversation {
    return Conversation.create({
      id: row.id,
      listingId: row.listingId,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
