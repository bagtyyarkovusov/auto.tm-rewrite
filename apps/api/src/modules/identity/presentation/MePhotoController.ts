import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  Inject,
  NotFoundException,
  Put,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import { AdminSchemas, IdentitySchemas } from "@auto-tm/contracts";

import { GetMe, type GetMeResult } from "../application/GetMe";
import { RemoveProfilePhoto } from "../application/RemoveProfilePhoto";
import { SetProfilePhoto } from "../application/SetProfilePhoto";
import { UserSuspendedError } from "../domain/UserSuspendedError";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

/**
 * The signed-in User's Profile Photo. Both routes answer with `/me`. They live
 * in `ProfilePhotoModule`, not `IdentityModule`, because they need the upload
 * boundary Listings provides. Upload refusals (`ProfilePhotoErrorCode`) come
 * from that boundary and pass through unchanged.
 */
@Controller("api/v1/me/photo")
export class MePhotoController {
  constructor(
    @Inject(GetMe) private readonly getMe: GetMe,
    @Inject(SetProfilePhoto) private readonly setProfilePhoto: SetProfilePhoto,
    @Inject(RemoveProfilePhoto) private readonly removeProfilePhoto: RemoveProfilePhoto,
  ) {}

  /** Sets the photo from an upload the User presigned; a second photo replaces the first. */
  @Put()
  @HttpCode(200)
  async set(@Req() req: FastifyRequest, @Body() body: unknown): Promise<GetMeResult> {
    const userId = this.userId(req);
    const parsed = this.parseOrThrow(IdentitySchemas.SetProfilePhotoRequestSchema, body);

    try {
      await this.setProfilePhoto.execute({ userId, key: parsed.key });
      return await this.getMe.execute({ userId });
    } catch (err: unknown) {
      throw this.httpError(err);
    }
  }

  /** Removes the photo, so the Assigned Avatar shows again. Succeeds with no photo. */
  @Delete()
  @HttpCode(200)
  async remove(@Req() req: FastifyRequest): Promise<GetMeResult> {
    const userId = this.userId(req);

    try {
      await this.removeProfilePhoto.execute({ userId });
      return await this.getMe.execute({ userId });
    } catch (err: unknown) {
      throw this.httpError(err);
    }
  }

  private httpError(err: unknown): unknown {
    if (err instanceof UserSuspendedError) {
      return new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }
    if (err instanceof Error && err.message === "User not found") {
      return new NotFoundException({ code: "USER_NOT_FOUND", message: "User not found." });
    }
    return err;
  }

  private userId(req: FastifyRequest): string {
    const sub = (req as AuthenticatedRequest).user?.sub;
    if (!sub) {
      throw new UnauthorizedException({
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      });
    }
    return sub;
  }

  private parseOrThrow<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (err) {
      // Duck-typed: the schema's ZodError can come from another copy of zod.
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
