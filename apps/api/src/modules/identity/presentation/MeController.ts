import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  Body,
  BadRequestException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import { IdentitySchemas } from "@auto-tm/contracts";

import { GetMe } from "../application/GetMe";
import { DeleteMe } from "../application/DeleteMe";
import { BlockUser } from "../application/BlockUser";
import { UnblockUser } from "../application/UnblockUser";
import { IsBlocked } from "../application/IsBlocked";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller("api/v1/me")
export class MeController {
  constructor(
    @Inject(GetMe) private readonly getMe: GetMe,
    @Inject(DeleteMe) private readonly deleteMe: DeleteMe,
    @Inject(BlockUser) private readonly blockUser: BlockUser,
    @Inject(UnblockUser) private readonly unblockUser: UnblockUser,
    @Inject(IsBlocked) private readonly isBlocked: IsBlocked,
  ) {}

  @Get()
  async me(@Req() req: FastifyRequest) {
    const userId = this.userId(req);

    try {
      return await this.getMe.execute({ userId });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "User not found") {
        throw new NotFoundException({
          code: "USER_NOT_FOUND",
          message: "User not found.",
        });
      }
      throw err;
    }
  }

  @Delete()
  @HttpCode(204)
  async delete(@Req() req: FastifyRequest): Promise<void> {
    const userId = this.userId(req);

    try {
      await this.deleteMe.execute({ userId });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "User not found") {
        throw new NotFoundException({
          code: "USER_NOT_FOUND",
          message: "User not found.",
        });
      }
      throw err;
    }
  }

  @Post("blocked-users")
  async block(
    @Req() req: FastifyRequest,
    @Body() body: unknown,
  ) {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(IdentitySchemas.BlockUserRequestSchema, body);

    const result = await this.blockUser.execute({
      blockerId: userId,
      blockedId: parsed.userId,
    });

    return result;
  }

  @Delete("blocked-users/:userId")
  @HttpCode(200)
  async unblock(
    @Req() req: FastifyRequest,
    @Param("userId") blockedId: string,
  ) {
    const userId = this.userId(req);

    const result = await this.unblockUser.execute({
      blockerId: userId,
      blockedId,
    });

    return result;
  }

  @Get("blocked-users/:userId")
  async isBlockedUser(
    @Req() req: FastifyRequest,
    @Param("userId") blockedId: string,
  ) {
    const userId = this.userId(req);

    return this.isBlocked.execute({ blockerId: userId, blockedId });
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
}
