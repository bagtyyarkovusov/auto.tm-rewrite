import {
  Controller,
  Get,
  Inject,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ListingsSchemas } from "@auto-tm/contracts";

import { ListMyListings } from "../application/ListMyListings";

@Controller()
export class MyListingsController {
  constructor(
    @Inject(ListMyListings) private readonly listMyListingsUC: ListMyListings,
  ) {}

  @Get("api/v1/me/listings")
  async listMyListings(
    @Query() query: { cursor?: string; limit?: number },
    @Req() req: FastifyRequest,
  ) {
    const userId = (req as { user?: { sub: string } }).user?.sub as string;
    const pagination = ListingsSchemas.FeedQuerySchema.parse(query);
    return this.listMyListingsUC.execute({
      userId,
      ...(pagination.cursor !== undefined ? { cursor: pagination.cursor } : {}),
      limit: pagination.limit,
    });
  }
}
