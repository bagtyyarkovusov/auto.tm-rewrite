import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  Patch,
  Post,
  Put,
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
import { PresignBrandLogoUpload } from "../application/PresignBrandLogoUpload";
import { SetBrandLogo } from "../application/SetBrandLogo";
import { RemoveBrandLogo } from "../application/RemoveBrandLogo";

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
    @Inject(PresignBrandLogoUpload)
    private readonly presignBrandLogoUC: PresignBrandLogoUpload,
    @Inject(SetBrandLogo) private readonly setBrandLogoUC: SetBrandLogo,
    @Inject(RemoveBrandLogo) private readonly removeBrandLogoUC: RemoveBrandLogo,
  ) {}

  @Post("brands")
  async createBrand(
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ) {
    const parsed = parseOrThrow(CatalogSchemas.CreateBrandRequestSchema, body);
    const actorUserId = (req.user as { sub: string }).sub;
    return this.createBrandUC.execute(parsed, actorUserId);
  }

  @Patch("brands/:id")
  async updateBrand(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ) {
    const parsed = parseOrThrow(CatalogSchemas.UpdateBrandRequestSchema, body);
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

  @Post("brands/:id/logo/presign")
  async presignBrandLogo(
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<CatalogSchemas.PresignBrandLogoResponse> {
    const parsed = parseOrThrow(CatalogSchemas.PresignBrandLogoRequestSchema, body);
    return this.presignBrandLogoUC.execute({ brandId: id, ...parsed });
  }

  @Put("brands/:id/logo")
  async setBrandLogo(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ): Promise<CatalogSchemas.SetBrandLogoResponse> {
    const parsed = parseOrThrow(CatalogSchemas.SetBrandLogoRequestSchema, body);
    const actorUserId = (req.user as { sub: string }).sub;
    return this.setBrandLogoUC.execute({ brandId: id, key: parsed.key }, actorUserId);
  }

  @Delete("brands/:id/logo")
  async removeBrandLogo(
    @Param("id") id: string,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ) {
    const actorUserId = (req.user as { sub: string }).sub;
    await this.removeBrandLogoUC.execute({ brandId: id }, actorUserId);
    return { success: true };
  }

  @Post("brands/:brandId/models")
  async createModel(
    @Param("brandId") brandId: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user?: { sub: string } },
  ) {
    const parsed = parseOrThrow(CatalogSchemas.CreateModelRequestSchema, {
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
    const parsed = parseOrThrow(CatalogSchemas.UpdateModelRequestSchema, body);
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

function parseOrThrow<T>(schema: { safeParse: (data: unknown) => SafeParse<T> }, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      code: "VALIDATION_FAILED",
      message: "Invalid request",
      details: result.error.flatten(),
    });
  }
  return result.data;
}

type SafeParse<T> =
  | { success: true; data: T }
  | { success: false; error: { flatten: () => unknown } };
