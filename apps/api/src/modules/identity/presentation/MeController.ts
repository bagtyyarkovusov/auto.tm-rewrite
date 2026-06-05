import { Controller, Delete, Get, HttpCode, Inject, NotFoundException, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GetMe } from "../application/GetMe";
import { DeleteMe } from "../application/DeleteMe";

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

@Controller("api/v1/me")
export class MeController {
  constructor(
    @Inject(GetMe) private readonly getMe: GetMe,
    @Inject(DeleteMe) private readonly deleteMe: DeleteMe,
  ) {}

  @Get()
  async me(@Req() req: FastifyRequest) {
    const userId = (req as AuthenticatedRequest).user?.sub as string;

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
    const userId = (req as AuthenticatedRequest).user?.sub as string;

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
}
