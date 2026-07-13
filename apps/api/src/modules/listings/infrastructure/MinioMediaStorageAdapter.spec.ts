import { describe, it, expect, vi } from "vitest";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../../env.schema";
import { MinioMediaStorageAdapter } from "./MinioMediaStorageAdapter";

function makeAdapter(publicUrl: string) {
  const config = {
    get: vi.fn((key: keyof Env) => {
      switch (key) {
        case "MINIO_ENDPOINT":
          return "http://localhost:9000";
        case "MINIO_ACCESS_KEY":
          return "access-key";
        case "MINIO_SECRET_KEY":
          return "secret-key";
        case "MINIO_REGION":
          return "us-east-1";
        case "MINIO_PUBLIC_URL":
          return publicUrl;
        default:
          return undefined;
      }
    }),
  } as unknown as ConfigService<Env, true>;

  return new MinioMediaStorageAdapter(config);
}

describe("MinioMediaStorageAdapter", () => {
  it("resolves public URL for listing photo keys", () => {
    const adapter = makeAdapter("https://media.auto.tm");

    const url = adapter.resolvePublicUrl("pending/uuid/original.jpg");

    expect(url).toBe(
      "https://media.auto.tm/listing-photos/pending/uuid/original.jpg",
    );
  });

  it("resolves public URL for listing video keys", () => {
    const adapter = makeAdapter("https://media.auto.tm");

    const url = adapter.resolvePublicUrl("pending/uuid/original.mp4");

    expect(url).toBe(
      "https://media.auto.tm/listing-videos/pending/uuid/original.mp4",
    );
  });

  it("resolves public URL for chat-attachment keys without doubling the bucket", () => {
    const adapter = makeAdapter("https://media.auto.tm");

    const url = adapter.resolvePublicUrl(
      "chat-attachments/conv-1/uuid/original.jpg",
    );

    expect(url).toBe(
      "https://media.auto.tm/chat-attachments/conv-1/uuid/original.jpg",
    );
  });

  it("strips trailing slash from public URL", () => {
    const adapter = makeAdapter("https://media.auto.tm/");

    const url = adapter.resolvePublicUrl("pending/uuid/original.jpg");

    expect(url).toBe(
      "https://media.auto.tm/listing-photos/pending/uuid/original.jpg",
    );
  });
});
