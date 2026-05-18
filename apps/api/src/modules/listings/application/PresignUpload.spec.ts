import { describe, it, expect, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { PresignUpload } from "./PresignUpload";
import type { MediaStoragePort } from "../domain/ports/MediaStoragePort";

class FakeMediaStorage implements MediaStoragePort {
  lastCall?: { key: string; contentType: string; sizeBytes: number; expirySeconds?: number };

  async presignUpload(data: {
    key: string;
    contentType: string;
    sizeBytes: number;
    expirySeconds?: number;
  }): Promise<{ url: string; key: string }> {
    this.lastCall = data;
    return { url: `https://media.auto.tm/presigned/${data.key}`, key: data.key };
  }

  resolvePublicUrl(_key: string): string {
    return `https://media.auto.tm/${_key}`;
  }
}

function makeUseCase(storage?: FakeMediaStorage) {
  return new PresignUpload(storage ?? new FakeMediaStorage());
}

describe("PresignUpload", () => {
  let storage: FakeMediaStorage;

  beforeEach(() => {
    storage = new FakeMediaStorage();
  });

  it("returns presigned URL for a valid image request", async () => {
    const uc = makeUseCase(storage);
    const result = await uc.execute({
      kind: "image",
      contentType: "image/jpeg",
      sizeBytes: 1024,
    });

    expect(result.uploadUrl).toContain("presigned");
    expect(result.key).toContain("pending/");
    expect(result.key).toMatch(/original\.jpg$/);
    expect(result.expiresIn).toBe(600);
    expect(result.maxSizeBytes).toBe(5 * 1024 * 1024);
  });

  it("returns presigned URL for a valid video request", async () => {
    const uc = makeUseCase(storage);
    const result = await uc.execute({
      kind: "video",
      contentType: "video/mp4",
      sizeBytes: 1024,
    });

    expect(result.key).toMatch(/original\.mp4$/);
    expect(result.maxSizeBytes).toBe(10 * 1024 * 1024);
  });

  it("returns webp extension for image/webp", async () => {
    const uc = makeUseCase(storage);
    const result = await uc.execute({
      kind: "image",
      contentType: "image/webp",
      sizeBytes: 1024,
    });

    expect(result.key).toMatch(/original\.webp$/);
  });

  it("rejects unsupported content type", async () => {
    const uc = makeUseCase(storage);
    await expect(
      uc.execute({ kind: "image", contentType: "image/png", sizeBytes: 1024 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects oversized image", async () => {
    const uc = makeUseCase(storage);
    await expect(
      uc.execute({
        kind: "image",
        contentType: "image/jpeg",
        sizeBytes: 6 * 1024 * 1024,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects oversized video", async () => {
    const uc = makeUseCase(storage);
    await expect(
      uc.execute({
        kind: "video",
        contentType: "video/mp4",
        sizeBytes: 11 * 1024 * 1024,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("passes correct parameters to storage port", async () => {
    const uc = makeUseCase(storage);
    await uc.execute({
      kind: "image",
      contentType: "image/jpeg",
      sizeBytes: 2048,
    });

    expect(storage.lastCall).toBeDefined();
    expect(storage.lastCall!.contentType).toBe("image/jpeg");
    expect(storage.lastCall!.sizeBytes).toBe(2048);
    expect(storage.lastCall!.expirySeconds).toBe(600);
  });
});
