import {
  Controller,
  Delete,
  Get,
  Inject,
  Patch,
  Post,
  Param,
  Body,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ListingsSchemas } from "@auto-tm/contracts";

import { CreateDraft } from "../application/CreateDraft";
import { UpdateDraft } from "../application/UpdateDraft";
import { DiscardDraft } from "../application/DiscardDraft";
import { ListMyDrafts } from "../application/ListMyDrafts";

@Controller()
export class DraftsController {
  constructor(
    @Inject(CreateDraft) private readonly createDraftUC: CreateDraft,
    @Inject(UpdateDraft) private readonly updateDraftUC: UpdateDraft,
    @Inject(DiscardDraft) private readonly discardDraftUC: DiscardDraft,
    @Inject(ListMyDrafts) private readonly listMyDraftsUC: ListMyDrafts,
  ) {}

  @Post("api/v1/listings/drafts")
  async createDraft(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const parsed = ListingsSchemas.CreateDraftRequestSchema.parse(body);
    const userId = (req as any).user?.sub as string;

    const result = await this.createDraftUC.execute({
      userId,
      ...(parsed?.initialPayload !== undefined ? { initialPayload: parsed.initialPayload } : {}),
    });

    return {
      id: result.draft.id,
      userId: result.draft.userId,
      payload: result.draft.payload,
      createdAt: result.draft.createdAt.toISOString(),
      updatedAt: result.draft.updatedAt.toISOString(),
    };
  }

  @Patch("api/v1/listings/drafts/:id")
  async updateDraft(
    @Param("id") draftId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const parsed = ListingsSchemas.UpdateDraftRequestSchema.parse(body);
    const userId = (req as any).user?.sub as string;

    const result = await this.updateDraftUC.execute({
      draftId,
      userId,
      payload: parsed,
    });

    return {
      id: result.draft.id,
      userId: result.draft.userId,
      payload: result.draft.payload,
      createdAt: result.draft.createdAt.toISOString(),
      updatedAt: result.draft.updatedAt.toISOString(),
    };
  }

  @Delete("api/v1/listings/drafts/:id")
  async discardDraft(
    @Param("id") draftId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as any).user?.sub as string;
    await this.discardDraftUC.execute({ draftId, userId });
    return { success: true };
  }

  @Get("api/v1/me/drafts")
  async listMyDrafts(
    @Query() query: { cursor?: string; limit?: number },
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as any).user?.sub as string;
    const pagination = ListingsSchemas.FeedQuerySchema.parse(query);

    const cursor = pagination.cursor
      ? ListingsSchemas.decodeCursor(pagination.cursor)
      : undefined;

    const result = await this.listMyDraftsUC.execute({
      userId,
      ...(cursor !== undefined ? { cursor } : {}),
      limit: pagination.limit,
    });

    return {
      items: result.items.map((d) => ({
        id: d.id,
        userId: d.userId,
        payload: d.payload,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      nextCursor: result.nextCursor
        ? ListingsSchemas.encodeCursor(result.nextCursor)
        : null,
    };
  }
}
