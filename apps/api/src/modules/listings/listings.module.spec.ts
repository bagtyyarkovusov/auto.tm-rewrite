import "reflect-metadata";

import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { MEDIA_STORAGE_PORT } from "./domain/ports/MediaStoragePort";
import { MinioMediaStorageAdapter } from "./infrastructure/MinioMediaStorageAdapter";
import { ListingsModule } from "./listings.module";

describe("ListingsModule", () => {
  it("binds MediaStoragePort to the single initialized MinIO adapter", () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ListingsModule,
    ) as Array<unknown>;
    const binding = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === MEDIA_STORAGE_PORT,
    );

    expect(binding).toEqual({
      provide: MEDIA_STORAGE_PORT,
      useExisting: MinioMediaStorageAdapter,
    });
  });
});
