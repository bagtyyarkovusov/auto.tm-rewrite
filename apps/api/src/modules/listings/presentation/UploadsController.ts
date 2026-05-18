import { Controller, Inject, Post, Body, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { UploadsSchemas } from "@auto-tm/contracts";

import { PresignUpload } from "../application/PresignUpload";

@Controller("api/v1/uploads")
export class UploadsController {
  constructor(
    @Inject(PresignUpload) private readonly presignUploadUC: PresignUpload,
  ) {}

  @Post("presign")
  async presignUpload(
    @Body() body: unknown,
    @Req() _req: FastifyRequest,
  ) {
    const parsed = UploadsSchemas.PresignRequestSchema.parse(body);

    const result = await this.presignUploadUC.execute({
      kind: parsed.kind,
      contentType: parsed.contentType,
      sizeBytes: parsed.sizeBytes,
    });

    return {
      uploadUrl: result.uploadUrl,
      key: result.key,
      expiresIn: result.expiresIn,
      maxSizeBytes: result.maxSizeBytes,
    };
  }
}
