import { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";

import type { Env } from "../../../env.schema";
import { MinioBrandLogoStorage } from "./MinioBrandLogoStorage";

const storage = new MinioBrandLogoStorage(new ConfigService<Env, true>({
  MINIO_ENDPOINT: "http://127.0.0.1:9000",
  MINIO_PUBLIC_URL: "https://media.example/",
  MINIO_REGION: "us-east-1",
  MINIO_ACCESS_KEY: "test",
  MINIO_SECRET_KEY: "test-secret",
}));

describe("MinioBrandLogoStorage public URLs", () => {
  it("preserves existing ASCII URLs", () => {
    expect(storage.publicUrl("brands/toyota/imp-abc123/logo.png")).toBe(
      "https://media.example/catalog-assets/brands/toyota/imp-abc123/logo.png",
    );
  });

  it.each([
    ["iž", "i%C5%BE"],
    ["москвич", "%D0%BC%D0%BE%D1%81%D0%BA%D0%B2%D0%B8%D1%87"],
    ["паз", "%D0%BF%D0%B0%D0%B7"],
    ["tofaş", "tofa%C5%9F"],
  ])("encodes catalog slug %s without changing separators", (slug, encoded) => {
    expect(storage.publicUrl(`brands/${slug}/imp-abc/logo.png`)).toBe(
      `https://media.example/catalog-assets/brands/${encoded}/imp-abc/logo.png`,
    );
  });

  it("encodes every segment, including URL delimiters and literal percent signs", () => {
    expect(storage.publicUrl("бренды/tofaş/v 1/logo#?%.png")).toBe(
      "https://media.example/catalog-assets/%D0%B1%D1%80%D0%B5%D0%BD%D0%B4%D1%8B/tofa%C5%9F/v%201/logo%23%3F%25.png",
    );
  });
});
