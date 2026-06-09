import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { ListingsSchemas, AdminSchemas } from "@auto-tm/contracts";

import { IDENTITY_TOKENS } from "../../identity/identity.tokens";
import type { IdentityCheckPort } from "../../identity/domain/ports/IdentityCheckPort";
import { AddFavorite } from "../application/AddFavorite";
import { RemoveFavorite } from "../application/RemoveFavorite";
import { ListMyFavorites } from "../application/ListMyFavorites";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller()
export class FavoritesController {
  constructor(
    @Inject(AddFavorite) private readonly addFavoriteUC: AddFavorite,
    @Inject(RemoveFavorite) private readonly removeFavoriteUC: RemoveFavorite,
    @Inject(ListMyFavorites) private readonly listMyFavoritesUC: ListMyFavorites,
    @Inject(IDENTITY_TOKENS.IdentityCheckPort)
    private readonly identityCheck: IdentityCheckPort,
  ) {}

  private async assertNotSuspended(userId: string): Promise<void> {
    const suspended = await this.identityCheck.isSuspended(userId);
    if (suspended) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }
  }

  private userId(req: FastifyRequest): string {
    return (req as AuthenticatedRequest).user?.sub as string;
  }

  private parseOrThrow<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (err) {
      if (err instanceof ZodError) {
        // eslint-disable-next-line no-console
        console.error("[Zod validation failed]", err.flatten(), "data:", JSON.stringify(data));
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: err.flatten(),
        });
      }
      throw err;
    }
  }

  @Post("api/v1/listings/:id/favorite")
  async addFavorite(
    @Param("id") listingId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    await this.assertNotSuspended(userId);

    return this.addFavoriteUC.execute({ userId, listingId });
  }

  @Delete("api/v1/listings/:id/favorite")
  async removeFavorite(
    @Param("id") listingId: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    await this.assertNotSuspended(userId);

    return this.removeFavoriteUC.execute({ userId, listingId });
  }

  @Get("api/v1/favorites")
  async listMyFavorites(
    @Query() query: { cursor?: string; limit?: number },
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const pagination = this.parseOrThrow(ListingsSchemas.FeedQuerySchema, query);
    return this.listMyFavoritesUC.execute({
      userId,
      ...(pagination.cursor !== undefined ? { cursor: pagination.cursor } : {}),
      limit: pagination.limit,
    });
  }
}
