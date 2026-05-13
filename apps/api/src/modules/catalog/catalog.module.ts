import { Module } from "@nestjs/common";

import { CatalogController } from "./presentation/catalog.controller";

@Module({ controllers: [CatalogController] })
export class CatalogModule {}
