import { Controller, Get, Inject, Param, Query, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

import { Public } from "../../../common/public.decorator";
import { ListBrands } from "../application/ListBrands";
import { ListModelsForBrand } from "../application/ListModelsForBrand";
import { ListGenerationsForModel } from "../application/ListGenerationsForModel";
import {
  CatalogSchemas,
  CursorPaginationRequestSchema,
} from "@auto-tm/contracts";
import type { LocalizedRequest } from "../../../common/accept-language.middleware";

@Controller("api/v1/catalog")
export class CatalogController {
  constructor(
    @Inject(ListBrands) private readonly listBrandsUC: ListBrands,
    @Inject(ListModelsForBrand)
    private readonly listModelsForBrandUC: ListModelsForBrand,
    @Inject(ListGenerationsForModel)
    private readonly listGenerationsForModelUC: ListGenerationsForModel,
  ) {}

  @Public()
  @Get("brands")
  async listBrands(
    @Query() query: CatalogSchemas.LocaleQuery & { cursor?: string; limit?: number },
    @Req() req: FastifyRequest & LocalizedRequest,
  ) {
    const locale =
      CatalogSchemas.LocaleQuerySchema.parse({ locale: query.locale }).locale ??
      req.locale ??
      "ru";
    const pagination = CursorPaginationRequestSchema.parse(query);
    const cursor = pagination.cursor
      ? JSON.parse(Buffer.from(pagination.cursor, "base64").toString("utf-8"))
      : undefined;

    const result = await this.listBrandsUC.execute({
      locale: locale as "tk" | "ru" | "en",
      cursor,
      limit: pagination.limit,
    });

    return {
      items: result.items,
      nextCursor: result.nextCursor
        ? Buffer.from(
            JSON.stringify(result.nextCursor),
            "utf-8",
          ).toString("base64")
        : null,
      hasMore: !!result.nextCursor,
    };
  }

  @Public()
  @Get("brands/:id/models")
  async listModelsForBrand(
    @Param("id") brandId: string,
    @Query() query: CatalogSchemas.LocaleQuery & { cursor?: string; limit?: number },
    @Req() req: FastifyRequest & LocalizedRequest,
  ) {
    const locale =
      CatalogSchemas.LocaleQuerySchema.parse({ locale: query.locale }).locale ??
      req.locale ??
      "ru";
    const pagination = CursorPaginationRequestSchema.parse(query);
    const cursor = pagination.cursor
      ? JSON.parse(Buffer.from(pagination.cursor, "base64").toString("utf-8"))
      : undefined;

    const result = await this.listModelsForBrandUC.execute({
      brandId,
      locale: locale as "tk" | "ru" | "en",
      cursor,
      limit: pagination.limit,
    });

    return {
      items: result.items,
      nextCursor: result.nextCursor
        ? Buffer.from(
            JSON.stringify(result.nextCursor),
            "utf-8",
          ).toString("base64")
        : null,
      hasMore: !!result.nextCursor,
    };
  }

  @Public()
  @Get("models/:id/generations")
  async listGenerationsForModel(
    @Param("id") modelId: string,
    @Query() query: CatalogSchemas.LocaleQuery,
    @Req() req: FastifyRequest & LocalizedRequest,
  ) {
    const locale =
      CatalogSchemas.LocaleQuerySchema.parse({ locale: query.locale }).locale ??
      req.locale ??
      "ru";

    const result = await this.listGenerationsForModelUC.execute({
      modelId,
      locale: locale as "tk" | "ru" | "en",
    });

    return { items: result.items };
  }

  @Public()
  @Get("ping")
  ping(): { context: "catalog"; status: "ok" } {
    return { context: "catalog", status: "ok" };
  }
}
