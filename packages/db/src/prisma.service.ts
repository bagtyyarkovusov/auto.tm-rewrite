import { Injectable, type OnModuleDestroy, type OnModuleInit, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
    // pg-pool re-emits an idle client's connection errors on the pool; without
    // a listener that throw crashes the process. A late server-side terminate
    // (e.g. a testcontainers database stopping while pool.end() sockets are
    // still closing) lands here during teardown, after assertions completed.
    pool.on("error", (err) => {
      this.logger.warn(`Prisma pg pool client error: ${String(err)}`);
    });
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Prisma connected");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
