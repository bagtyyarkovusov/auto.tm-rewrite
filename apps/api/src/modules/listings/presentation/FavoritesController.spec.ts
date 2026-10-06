import { inspect } from "node:util";

import { BadRequestException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";

import type { ListMyFavorites } from "../application/ListMyFavorites";

import { FavoritesController } from "./FavoritesController";

const req = { user: { sub: "user-1" } } as unknown as FastifyRequest;

describe("FavoritesController listMyFavorites", () => {
  it("logs only the failing field names, never the request query", async () => {
    const listMyFavorites = vi.fn();
    const controller = new FavoritesController(
      {} as never,
      {} as never,
      { execute: listMyFavorites } as unknown as ListMyFavorites,
      {} as never,
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const call = controller.listMyFavorites({ limit: "sentine1-query-value" }, req);

      await expect(call).rejects.toBeInstanceOf(BadRequestException);

      // The exact arguments: an extra argument carrying the body would also fail here.
      expect(errorSpy.mock.calls).toEqual([["[Zod validation failed]", ["limit"]]]);
      expect(inspect(errorSpy.mock.calls, { depth: null })).not.toContain("sentine1-query-value");
      expect(listMyFavorites).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
