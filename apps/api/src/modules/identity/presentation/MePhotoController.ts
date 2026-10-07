import { Controller, Inject } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { GetMe, type GetMeResult } from "../application/GetMe";
import { RemoveProfilePhoto } from "../application/RemoveProfilePhoto";
import { SetProfilePhoto } from "../application/SetProfilePhoto";

@Controller("api/v1/me/photo")
export class MePhotoController {
  constructor(
    @Inject(GetMe) private readonly getMe: GetMe,
    @Inject(SetProfilePhoto) private readonly setProfilePhoto: SetProfilePhoto,
    @Inject(RemoveProfilePhoto) private readonly removeProfilePhoto: RemoveProfilePhoto,
  ) {}

  // Skeleton for the failing-test checkpoint (#642); no routes or behaviour yet.
  async set(_req: FastifyRequest, _body: unknown): Promise<GetMeResult | undefined> {
    return undefined;
  }

  async remove(_req: FastifyRequest): Promise<GetMeResult | undefined> {
    return undefined;
  }
}
