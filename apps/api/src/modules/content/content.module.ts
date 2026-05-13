import { Module } from "@nestjs/common";
import { ContentController } from "./presentation/content.controller";

@Module({ controllers: [ContentController] })
export class ContentModule {}
