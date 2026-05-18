import { Inject, Injectable, BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import {
  MEDIA_STORAGE_PORT,
  type MediaStoragePort,
} from "../domain/ports/MediaStoragePort";

export interface PresignUploadInput {
  kind: "image" | "video";
  contentType: string;
  sizeBytes: number;
}

export interface PresignUploadResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
  maxSizeBytes: number;
}

const CAPS: Record<
  "image" | "video",
  { maxSizeBytes: number; allowedTypes: string[] }
> = {
  image: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedTypes: ["image/jpeg", "image/webp"],
  },
  video: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedTypes: ["video/mp4"],
  },
};

@Injectable()
export class PresignUpload {
  constructor(
    @Inject(MEDIA_STORAGE_PORT)
    private readonly storage: MediaStoragePort,
  ) {}

  async execute(input: PresignUploadInput): Promise<PresignUploadResult> {
    const cap = CAPS[input.kind];
    if (!cap) {
      throw new BadRequestException("Invalid kind");
    }

    if (!cap.allowedTypes.includes(input.contentType)) {
      throw new BadRequestException(
        `Invalid content type for ${input.kind}. Allowed: ${cap.allowedTypes.join(", ")}`,
      );
    }

    if (input.sizeBytes > cap.maxSizeBytes) {
      throw new BadRequestException(
        `File too large. Max ${cap.maxSizeBytes} bytes for ${input.kind}`,
      );
    }

    const ext =
      input.contentType === "image/webp"
        ? "webp"
        : input.contentType === "video/mp4"
          ? "mp4"
          : "jpg";

    const key = `pending/${randomUUID()}/original.${ext}`;

    const { url } = await this.storage.presignUpload({
      key,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      expirySeconds: 600,
    });

    return {
      uploadUrl: url,
      key,
      expiresIn: 600,
      maxSizeBytes: cap.maxSizeBytes,
    };
  }
}
