import { BadRequestException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";

import type { LocalizedRequest } from "../../../common/accept-language";

import { CatalogController } from "./catalog.controller";

function controllerWith(useCases: {
  listBrands?: unknown;
  listModelsForBrand?: unknown;
  listCitiesForRegion?: unknown;
}) {
  const unused = { execute: vi.fn() };
  return new CatalogController(
    (useCases.listBrands ?? unused) as never,
    (useCases.listModelsForBrand ?? unused) as never,
    unused as never,
    unused as never,
    (useCases.listCitiesForRegion ?? unused) as never,
    unused as never,
    unused as never,
    unused as never,
    unused as never,
    unused as never,
    unused as never,
  );
}

const req = { locale: undefined } as unknown as FastifyRequest & LocalizedRequest;

function encodeCursorPayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
}

const endpoints = [
  {
    name: "GET /catalog/brands",
    call: (c: CatalogController, query: Record<string, unknown>) =>
      c.listBrands(query as never, req),
    useCaseKey: "listBrands" as const,
  },
  {
    name: "GET /catalog/brands/:id/models",
    call: (c: CatalogController, query: Record<string, unknown>) =>
      c.listModelsForBrand("brand-1", query as never, req),
    useCaseKey: "listModelsForBrand" as const,
  },
  {
    name: "GET /catalog/regions/:id/cities",
    call: (c: CatalogController, query: Record<string, unknown>) =>
      c.listCitiesForRegion("region-1", query as never, req),
    useCaseKey: "listCitiesForRegion" as const,
  },
];

describe("CatalogController cursor pagination", () => {
  for (const endpoint of endpoints) {
    describe(endpoint.name, () => {
      it("rejects a malformed cursor with a 400 VALIDATION_FAILED and never calls the use case", async () => {
        const execute = vi.fn().mockResolvedValue({ items: [] });
        const controller = controllerWith({ [endpoint.useCaseKey]: { execute } });

        const call = endpoint.call(controller, { cursor: "not-a-cursor" });

        await expect(call).rejects.toBeInstanceOf(BadRequestException);
        await expect(call).rejects.toMatchObject({
          response: { code: "VALIDATION_FAILED" },
        });
        expect(execute).not.toHaveBeenCalled();
      });

      it("rejects a forged cursor of the wrong shape with a 400 VALIDATION_FAILED", async () => {
        const execute = vi.fn().mockResolvedValue({ items: [] });
        const controller = controllerWith({ [endpoint.useCaseKey]: { execute } });
        const forged = encodeCursorPayload({
          timestamp: "2026-05-01T00:00:00.000Z",
          id: "listing-1",
        });

        const call = endpoint.call(controller, { cursor: forged });

        await expect(call).rejects.toBeInstanceOf(BadRequestException);
        await expect(call).rejects.toMatchObject({
          response: { code: "VALIDATION_FAILED" },
        });
        expect(execute).not.toHaveBeenCalled();
      });

      it("rejects an invalid limit with a 400 VALIDATION_FAILED", async () => {
        const execute = vi.fn().mockResolvedValue({ items: [] });
        const controller = controllerWith({ [endpoint.useCaseKey]: { execute } });

        const call = endpoint.call(controller, { limit: "not-a-number" });

        await expect(call).rejects.toBeInstanceOf(BadRequestException);
        await expect(call).rejects.toMatchObject({
          response: { code: "VALIDATION_FAILED" },
        });
        expect(execute).not.toHaveBeenCalled();
      });

      it("accepts a cursor the API itself issues", async () => {
        const execute = vi
          .fn()
          .mockResolvedValue({ items: [], nextCursor: undefined });
        const controller = controllerWith({ [endpoint.useCaseKey]: { execute } });
        const issued = encodeCursorPayload({ name: "BMW", id: "b1" });

        await endpoint.call(controller, { cursor: issued, limit: "2" });

        expect(execute).toHaveBeenCalledWith(
          expect.objectContaining({
            cursor: { name: "BMW", id: "b1" },
            limit: 2,
          }),
        );
      });
    });
  }
});

describe("CatalogController locale", () => {
  function everyUseCase(execute: ReturnType<typeof vi.fn>) {
    const useCase = { execute };
    return new CatalogController(
      ...(Array.from({ length: 11 }, () => useCase) as unknown as ConstructorParameters<
        typeof CatalogController
      >),
    );
  }

  const localized: Array<[string, (c: CatalogController, query: Record<string, unknown>) => unknown]> = [
    ["GET /catalog/search", (c, q) => c.search({ q: "bmw", ...q } as never, req)],
    ["GET /catalog/brands", (c, q) => c.listBrands(q as never, req)],
    ["GET /catalog/brands/:id/models", (c, q) => c.listModelsForBrand("brand-1", q as never, req)],
    ["GET /catalog/models/:id/generations", (c, q) => c.listGenerationsForModel("model-1", q as never, req)],
    ["GET /catalog/regions", (c, q) => c.listRegions(q as never, req)],
    ["GET /catalog/regions/:id/cities", (c, q) => c.listCitiesForRegion("region-1", q as never, req)],
    ["GET /catalog/body-types", (c, q) => c.listBodyTypes(q as never, req)],
    ["GET /catalog/colors", (c, q) => c.listColors(q as never, req)],
    ["GET /catalog/engine-types", (c, q) => c.listEngineTypes(q as never, req)],
    ["GET /catalog/transmissions", (c, q) => c.listTransmissions(q as never, req)],
    ["GET /catalog/drive-types", (c, q) => c.listDriveTypes(q as never, req)],
  ];

  it.each(localized)("%s answers 400 VALIDATION_FAILED for an unknown locale", async (_name, call) => {
    const execute = vi.fn().mockResolvedValue({ items: [] });

    const result = Promise.resolve().then(() => call(everyUseCase(execute), { locale: "de" }));

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toMatchObject({
      response: { code: "VALIDATION_FAILED", details: { fieldErrors: { locale: expect.any(Array) } } },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(localized)("%s still falls back to Russian without a locale", async (_name, call) => {
    const execute = vi.fn().mockResolvedValue({ items: [] });

    await call(everyUseCase(execute), {});

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ locale: "ru" }));
  });
});
