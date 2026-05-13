import { Global, Module } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
