import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { NotificationsSchemas } from "@auto-tm/contracts";

import { Public } from "../../../common/public.decorator";
import { RegisterPushToken } from "../application/RegisterPushToken";
import { RevokePushToken } from "../application/RevokePushToken";
import { ListPushTokens } from "../application/ListPushTokens";
import type { PushToken } from "../domain/PushToken";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller("api/v1/notifications")
export class NotificationsController {
  constructor(
    @Inject(RegisterPushToken)
    private readonly registerPushTokenUC: RegisterPushToken,
    @Inject(RevokePushToken)
    private readonly revokePushTokenUC: RevokePushToken,
    @Inject(ListPushTokens)
    private readonly listPushTokensUC: ListPushTokens,
  ) {}

  @Public()
  @Get("ping")
  ping(): { context: "notifications"; status: "ok" } {
    return { context: "notifications", status: "ok" };
  }

  @Post("tokens")
  async registerPushToken(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(
      NotificationsSchemas.RegisterPushTokenRequestSchema,
      body,
    );

    const result = await this.registerPushTokenUC.execute({
      userId,
      token: parsed.token,
      platform: parsed.platform,
      deviceId: parsed.deviceId,
    });

    return {
      registered: true,
      invalidatedPrevious: result.invalidatedPrevious,
      token: this.toTokenSummary(result.token),
    };
  }

  @Get("tokens")
  async listPushTokens(@Req() req: FastifyRequest) {
    const userId = this.userId(req);
    const tokens = await this.listPushTokensUC.execute({ userId });

    return {
      items: tokens.map((t) => this.toTokenSummary(t)),
    };
  }

  @Delete("tokens/:token")
  async revokePushToken(
    @Param("token") token: string,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const result = await this.revokePushTokenUC.execute({ userId, token });

    return { revoked: result.revoked };
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

  private toTokenSummary(token: PushToken) {
    return {
      id: token.id,
      token: token.token,
      platform: token.platform,
      deviceId: token.deviceId ?? undefined,
      createdAt: token.createdAt.toISOString(),
      lastSeenAt: token.lastSeenAt.toISOString(),
    };
  }
}
