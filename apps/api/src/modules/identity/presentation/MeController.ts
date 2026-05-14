import { Controller, Get, Inject, NotFoundException, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GetMe } from "../application/GetMe";

@Controller("api/v1/me")
export class MeController {
  constructor(
    @Inject(GetMe) private readonly getMe: GetMe,
  ) {}

  @Get()
  async me(@Req() req: FastifyRequest) {
    const userId = (req as any).user?.sub as string;

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
}
