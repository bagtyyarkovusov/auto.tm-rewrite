import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import { Conversation } from "../domain/Conversation";
import type { Message } from "../domain/Message";
import type { ConversationRepository } from "../domain/ports/ConversationRepository";

@Injectable()
export class PrismaConversationRepository implements ConversationRepository {
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
  ): Promise<{ items: Conversation[]; nextCursor: string | null }> {
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

    return {
      items: items.map((r: { id: string; listingId: string; buyerId: string; sellerId: string; createdAt: Date; updatedAt: Date }) => this.toDomain(r)),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async listMessages(
    _conversationId: string,
    _query: { cursor?: string; limit?: number },
  ): Promise<{ items: Message[]; nextCursor: string | null }> {
    return { items: [], nextCursor: null };
  }

  async saveMessage(_message: Message): Promise<void> {
    throw new Error("saveMessage is not implemented");
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
