import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
  Query,
  Param,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import { ConversationsSchemas } from "@auto-tm/contracts";

import type { ListingSummary } from "../../listings/domain/ports/ListingsReadPort";
import { Public } from "../../../common/public.decorator";
import { OpenConversation } from "../application/OpenConversation";
import { ListMyConversations } from "../application/ListMyConversations";
import { ListMessages } from "../application/ListMessages";
import { SendTextMessage } from "../application/SendTextMessage";
import { SendMessage } from "../application/SendMessage";
import { UpdateWatermark } from "../application/UpdateWatermark";
import { MuteConversation } from "../application/MuteConversation";
import { DeleteMessage } from "../application/DeleteMessage";
import type { Conversation } from "../domain/Conversation";
import type { Message } from "../domain/Message";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller("api/v1/conversations")
export class ConversationsController {
  constructor(
    @Inject(OpenConversation)
    private readonly openConversationUC: OpenConversation,
    @Inject(ListMyConversations)
    private readonly listMyConversationsUC: ListMyConversations,
    @Inject(ListMessages)
    private readonly listMessagesUC: ListMessages,
    @Inject(SendTextMessage)
    private readonly sendTextMessageUC: SendTextMessage,
    @Inject(SendMessage)
    private readonly sendMessageUC: SendMessage,
    @Inject(UpdateWatermark)
    private readonly updateWatermarkUC: UpdateWatermark,
    @Inject(MuteConversation)
    private readonly muteConversationUC: MuteConversation,
    @Inject(DeleteMessage)
    private readonly deleteMessageUC: DeleteMessage,
  ) {}

  @Public()
  @Get("ping")
  ping(): { context: "conversations"; status: "ok" } {
    return { context: "conversations", status: "ok" };
  }

  @Post()
  async openConversation(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(
      ConversationsSchemas.OpenConversationRequestSchema,
      body,
    );

    const result = await this.openConversationUC.execute({
      buyerId: userId,
      listingId: parsed.listingId,
    });

    return this.toConversationSummaryResponse(
      result.conversation,
      result.listing,
      userId,
    );
  }

  @Get()
  async listMyConversations(
    @Query() query: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(
      ConversationsSchemas.ListConversationsQuerySchema,
      query,
    );

    const result = await this.listMyConversationsUC.execute({
      userId,
      ...(parsed.cursor ? { cursor: parsed.cursor } : {}),
      limit: parsed.limit,
    });

    return {
      items: result.items.map((item) =>
        this.toConversationSummaryResponse(
          item.conversation,
          item.listing,
          userId,
          item.lastMessage,
          item.unreadCount,
        ),
      ),
      nextCursor: result.nextCursor,
    };
  }

  @Get(":id/messages")
  async listMessages(
    @Param("id") conversationId: string,
    @Query() query: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(
      ConversationsSchemas.ListMessagesQuerySchema,
      query,
    );

    const result = await this.listMessagesUC.execute({
      userId,
      conversationId,
      ...(parsed.cursor ? { cursor: parsed.cursor } : {}),
      limit: parsed.limit,
    });

    return {
      items: result.items.map((m) => this.toMessageSummary(m)),
      nextCursor: result.nextCursor,
    };
  }

  @Post(":id/messages")
  async sendTextMessage(
    @Param("id") conversationId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(
      ConversationsSchemas.SendTextMessageRequestSchema,
      body,
    );

    const result = await this.sendTextMessageUC.execute({
      senderId: userId,
      conversationId,
      text: parsed.text,
    });

    return this.toMessageSummary(result.message);
  }

  @Post(":id/messages/rich")
  async sendMessage(
    @Param("id") conversationId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(
      ConversationsSchemas.SendMessageRequestSchema,
      body,
    );

    const result = await this.sendMessageUC.execute({
      senderId: userId,
      conversationId,
      ...parsed,
    });

    return this.toMessageSummary(result.message);
  }

  @Post(":id/watermark")
  async updateWatermark(
    @Param("id") conversationId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(
      ConversationsSchemas.UpdateWatermarkRequestSchema,
      body,
    );

    const result = await this.updateWatermarkUC.execute({
      userId,
      conversationId,
      ...(parsed.lastReadAt ? { lastReadAt: parsed.lastReadAt } : {}),
      ...(parsed.lastDeliveredAt
        ? { lastDeliveredAt: parsed.lastDeliveredAt }
        : {}),
    });

    return {
      conversationId: result.conversationId,
      lastReadAt: result.lastReadAt?.toISOString(),
      lastDeliveredAt: result.lastDeliveredAt?.toISOString(),
    };
  }

  @Post(":id/mute")
  async muteConversation(
    @Param("id") conversationId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(
      ConversationsSchemas.MuteConversationRequestSchema,
      body,
    );

    const result = await this.muteConversationUC.execute({
      userId,
      conversationId,
      muted: parsed.muted,
    });

    return {
      conversationId: result.conversationId,
      mutedAt: result.mutedAt?.toISOString() ?? null,
    };
  }

  @Delete(":id/messages/:messageId")
  async deleteMessage(
    @Param("id") conversationId: string,
    @Param("messageId") messageId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);

    const result = await this.deleteMessageUC.execute({
      userId,
      conversationId,
      messageId,
    });

    return {
      messageId: result.messageId,
      deletedAt: result.deletedAt.toISOString(),
    };
  }

  private userId(req: FastifyRequest): string {
    return (req as AuthenticatedRequest).user?.sub as string;
  }

  private parseOrThrow<T>(
    schema: { parse: (data: unknown) => T },
    data: unknown,
  ): T {
    try {
      return schema.parse(data);
    } catch (err) {
      if (err && typeof err === "object" && "issues" in err) {
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: "Invalid request",
          details: (err as z.ZodError).flatten(),
        });
      }
      throw err;
    }
  }

  private toConversationSummaryResponse(
    conversation: Pick<Conversation, "id" | "buyerId" | "sellerId" | "updatedAt">,
    listing: ListingSummary | null,
    userId: string,
    lastMessage?: Message | null,
    unreadCount?: number,
  ) {
    return {
      id: conversation.id,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      myRole:
        userId === conversation.buyerId
          ? ("buyer" as const)
          : ("seller" as const),
      updatedAt: conversation.updatedAt.toISOString(),
      listing: listing
        ? {
            id: listing.id,
            brandId: listing.brandId,
            modelId: listing.modelId,
            year: listing.year,
            displayPriceTmt: listing.displayPriceTmt,
            priceCurrency: listing.priceCurrency,
            coverMediaKey: listing.coverMediaKey,
            status: listing.status,
          }
        : null,
      lastMessage: lastMessage ? this.toMessageSummary(lastMessage) : undefined,
      unreadCount: unreadCount ?? 0,
    };
  }

  private toMessageSummary(message: Message) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      kind: message.kind,
      text: message.body,
      metadata: message.metadata ?? undefined,
      createdAt: message.createdAt.toISOString(),
      deletedAt: message.deletedAt?.toISOString(),
      clientMessageId: message.clientMessageId ?? undefined,
      deliveryStatus: undefined,
    };
  }
}
