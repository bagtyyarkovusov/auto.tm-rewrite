import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { ConversationsSchemas } from "@auto-tm/contracts";

import type { ListingSummary } from "../../listings/domain/ports/ListingsReadPort";
import { Public } from "../../../common/public.decorator";
import { OpenConversation } from "../application/OpenConversation";
import { ListMyConversations } from "../application/ListMyConversations";
import type { Conversation } from "../domain/Conversation";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller("api/v1/conversations")
export class ConversationsController {
  constructor(
    @Inject(OpenConversation)
    private readonly openConversationUC: OpenConversation,
    @Inject(ListMyConversations)
    private readonly listMyConversationsUC: ListMyConversations,
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
        ),
      ),
      nextCursor: result.nextCursor,
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
      if (err instanceof ZodError) {
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: "Invalid request",
          details: err.flatten(),
        });
      }
      throw err;
    }
  }

  private toConversationSummaryResponse(
    conversation: Pick<Conversation, "id" | "buyerId" | "sellerId" | "updatedAt">,
    listing: ListingSummary | null,
    userId: string,
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
    };
  }
}
