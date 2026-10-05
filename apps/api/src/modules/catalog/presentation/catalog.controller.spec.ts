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
