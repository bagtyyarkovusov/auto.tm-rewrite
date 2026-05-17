import {
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { CatalogSchemas } from "@auto-tm/contracts";

import { AdminGuard } from "../../../common/admin.guard";
import { CreateBrand } from "../application/CreateBrand";
import { UpdateBrand } from "../application/UpdateBrand";
import { DeleteBrand } from "../application/DeleteBrand";
import { CreateModel } from "../application/CreateModel";
import { UpdateModel } from "../application/UpdateModel";
import { DeleteModel } from "../application/DeleteModel";

@Controller("api/v1/admin/catalog")
@UseGuards(AdminGuard)
export class AdminCatalogController {
  constructor(
    @Inject(CreateBrand) private readonly createBrandUC: CreateBrand,
    @Inject(UpdateBrand) private readonly updateBrandUC: UpdateBrand,
    @Inject(DeleteBrand) private readonly deleteBrandUC: DeleteBrand,
    @Inject(CreateModel) private readonly createModelUC: CreateModel,
    @Inject(UpdateModel) private readonly updateModelUC: UpdateModel,
    @Inject(DeleteModel) private readonly deleteModelUC: DeleteModel,
  ) {}

  @Post("brands")
  async createBrand(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ) {
    const parsed = CatalogSchemas.CreateBrandRequestSchema.parse(body);
    const actorUserId = (req.user as { sub: string }).sub;
    return this.createBrandUC.execute(parsed, actorUserId);
  }

  @Patch("brands/:id")
  async updateBrand(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ) {
    const parsed = CatalogSchemas.UpdateBrandRequestSchema.parse(body);
    const actorUserId = (req.user as { sub: string }).sub;
    return this.updateBrandUC.execute({ id, ...parsed }, actorUserId);
  }

  @Delete("brands/:id")
  async deleteBrand(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ) {
    const actorUserId = (req.user as { sub: string }).sub;
    await this.deleteBrandUC.execute({ id }, actorUserId);
    return { success: true };
  }

  @Post("brands/:brandId/models")
  async createModel(
    @Param("brandId") brandId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ) {
    const parsed = CatalogSchemas.CreateModelRequestSchema.parse({
      ...(typeof body === "object" && body !== null ? body : {}),
      brandId,
    });
    const actorUserId = (req.user as { sub: string }).sub;
    return this.createModelUC.execute(parsed, actorUserId);
  }

  @Patch("models/:id")
  async updateModel(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ) {
    const parsed = CatalogSchemas.UpdateModelRequestSchema.parse(body);
    const actorUserId = (req.user as { sub: string }).sub;
    return this.updateModelUC.execute({ id, ...parsed }, actorUserId);
  }

  @Delete("models/:id")
  async deleteModel(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ) {
    const actorUserId = (req.user as { sub: string }).sub;
    await this.deleteModelUC.execute({ id }, actorUserId);
    return { success: true };
  }
}
