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

import { ConversationsSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import { Public } from "../../../common/public.decorator";
import { OpenConversation } from "../application/OpenConversation";
import { ListMyConversations } from "../application/ListMyConversations";

@Controller("api/v1/conversations")
export class ConversationsController {
  constructor(
    @Inject(OpenConversation) private readonly openConversationUC: OpenConversation,
    @Inject(ListMyConversations) private readonly listMyConversationsUC: ListMyConversations,
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
    const userId = (req as { user?: { sub: string } }).user?.sub as string;

    let parsed: typeof ConversationsSchemas.OpenConversationRequestSchema._type;
    try {
      parsed = ConversationsSchemas.OpenConversationRequestSchema.parse(body);
    } catch (err) {
      if (err && typeof err === "object" && "issues" in err) {
        const zodError = err as z.ZodError;
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: "Invalid request body",
          details: zodError.flatten(),
        });
      }
      throw err;
    }

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
    const userId = (req as { user?: { sub: string } }).user?.sub as string;

    let parsed: typeof ConversationsSchemas.ListConversationsQuerySchema._type;
    try {
      parsed = ConversationsSchemas.ListConversationsQuerySchema.parse(query);
    } catch (err) {
      if (err && typeof err === "object" && "issues" in err) {
        const zodError = err as z.ZodError;
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: "Invalid query parameters",
          details: zodError.flatten(),
        });
      }
      throw err;
    }

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

  private toConversationSummaryResponse(
    conversation: {
      id: string;
      buyerId: string;
      sellerId: string;
      updatedAt: Date;
    },
    listing: {
      id: string;
      brandId: string;
      modelId: string;
      year?: number;
      displayPriceTmt: number;
      priceCurrency: "TMT" | "USD" | "AED";
      coverMediaKey?: string;
      status: string;
    } | null,
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
            status: listing.status as "active" | "sold" | "archived",
          }
        : {
            id: "",
            brandId: "",
            modelId: "",
            displayPriceTmt: 0,
            priceCurrency: "TMT" as const,
            status: "active" as const,
          },
    };
  }
}
