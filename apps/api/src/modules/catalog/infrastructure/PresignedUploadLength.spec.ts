import { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";

import type { Env } from "../../../env.schema";
import { MinioMediaStorageAdapter } from "../../listings/infrastructure/MinioMediaStorageAdapter";
import { MinioBrandLogoStorage } from "./MinioBrandLogoStorage";

const config = new ConfigService({
  MINIO_ENDPOINT: "http://127.0.0.1:9000",
  MINIO_PUBLIC_URL: "http://127.0.0.1:9000",
  MINIO_REGION: "us-east-1",
  MINIO_ACCESS_KEY: "minioadmin",
  MINIO_SECRET_KEY: "minioadmin",
}) as ConfigService<Env, true>;

describe("presigned PUT length enforcement", () => {
  it("binds the declared brand logo length in the actual SDK signature", async () => {
    const storage = new MinioBrandLogoStorage(config);
    const result = await storage.presignUpload("pending/brands/toyota/test", "image/png", 600, 4);
    expect(new URL(result.url).searchParams.get("X-Amz-SignedHeaders")?.split(";")).toContain("content-length");
  });

  it("binds listing media length in the actual SDK signature", async () => {
    const storage = new MinioMediaStorageAdapter(config);
    const result = await storage.presignUpload({ key: "pending/test/original.jpg", contentType: "image/jpeg", sizeBytes: 4 });
    expect(new URL(result.url).searchParams.get("X-Amz-SignedHeaders")?.split(";")).toContain("content-length");
  });
});
