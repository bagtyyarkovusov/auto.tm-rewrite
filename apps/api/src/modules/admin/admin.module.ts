import { Module } from "@nestjs/common";
import { AdminController } from "./presentation/admin.controller";

@Module({ controllers: [AdminController] })
export class AdminModule {}
